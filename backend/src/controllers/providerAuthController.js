import crypto from 'crypto';
import OtpChallenge from '../models/OtpChallenge.js';
import ProviderAccount from '../models/ProviderAccount.js';
import env from '../config/env.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sanitizeString } from '../utils/referenceId.js';
import {
  normalizeEmail,
  isValidEmail,
  maskEmail,
  normalizeIndianPhone,
} from '../utils/validation.js';
import { sendOtpEmail } from '../services/resendEmailService.js';
import { verifyGoogleIdToken, googleAuthService } from '../services/googleAuthService.js';

const PROVIDER_COOKIE_NAME = 'wareshop_provider_session';
const PHONE_REGEX = /^[6-9]\d{9}$/;
const OTP_REGEX = /^\d{6}$/;

// In-flight mutex per email address to prevent parallel race conditions on OTP send cooldown
const inFlightOtpRequests = new Set();

function hmacOtp(email, otp) {
  return crypto
    .createHmac('sha256', env.otp.hmacSecret)
    .update(`email:${email}:${otp}`)
    .digest('hex');
}

function hashToken(token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function getProviderCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
  };
}

export function formatProviderAccountDto(account) {
  const phone = account.phone || '';
  const email = account.email || '';
  return {
    id: String(account._id),
    providerAccountId: String(account._id),
    phone,
    phoneMasked: phone ? `******${phone.slice(-4)}` : '',
    phoneVerified: Boolean(account.phoneVerified),
    name: account.name || '',
    email,
    emailMasked: email ? maskEmail(email) : '',
    emailVerified: Boolean(account.emailVerified),
    emailVerifiedAt: account.emailVerifiedAt || null,
    googleLinked: Boolean(account.googleId),
    authProvider: account.authProvider || (account.googleId ? 'GOOGLE' : 'EMAIL_OTP'),
    role: account.role || 'PROVIDER',
    status: account.status || 'ACTIVE',
    suspensionReason: account.status === 'SUSPENDED' ? account.suspensionReason || '' : '',
    verifiedAt: account.verifiedAt || null,
    lastLoginAt: account.lastLoginAt || null,
  };
}

/**
 * POST /api/v1/provider-auth/otp/request (and /otp/send)
 * Generates a 6-digit OTP, persists an HMAC challenge atomically, and dispatches Email OTP via Resend.
 */
export async function requestOtp(req, res, next) {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return errorResponse(res, 'Enter a valid email address', 400);
  }

  if (inFlightOtpRequests.has(email)) {
    return errorResponse(res, 'Please wait before requesting another OTP', 429);
  }

  inFlightOtpRequests.add(email);
  let createdChallenge = null;

  try {
    const now = Date.now();
    const cooldownThreshold = new Date(now - env.otp.cooldownMs);
    const dayThreshold = new Date(now - 24 * 60 * 60_000);
    const hourThreshold = new Date(now - 60 * 60_000);

    // 1. Enforce 60-second per-email resend cooldown
    const recentChallenge = await OtpChallenge.findOne({
      channel: 'EMAIL',
      email,
      deliveryStatus: { $in: ['PENDING', 'SENT'] },
      sentAt: { $gt: cooldownThreshold },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (recentChallenge) {
      const elapsedMs = now - new Date(recentChallenge.sentAt).getTime();
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((env.otp.cooldownMs - elapsedMs) / 1000)
      );
      res.set('Retry-After', String(retryAfterSeconds));
      return errorResponse(
        res,
        `Please wait ${retryAfterSeconds} seconds before requesting another OTP`,
        429
      );
    }

    // 2. Enforce daily per-email OTP cap
    const emailDayCount = await OtpChallenge.countDocuments({
      channel: 'EMAIL',
      email,
      deliveryStatus: { $in: ['PENDING', 'SENT'] },
      sentAt: { $gt: dayThreshold },
    });

    if (emailDayCount >= env.otp.maxPerEmailPerDay) {
      return errorResponse(
        res,
        'Maximum daily OTP requests reached for this email address. Please try again tomorrow.',
        429
      );
    }

    // 3. Enforce per-IP hourly abuse cap
    const requestIp = String(req.ip || '').trim();
    if (requestIp) {
      const ipHourCount = await OtpChallenge.countDocuments({
        requestIp,
        deliveryStatus: { $in: ['PENDING', 'SENT'] },
        sentAt: { $gt: hourThreshold },
      });

      if (ipHourCount >= env.otp.maxPerIpPerHour) {
        return errorResponse(
          res,
          'Too many OTP requests from this IP address. Please try again shortly.',
          429
        );
      }
    }

    // 4. Enforce global hourly OTP budget cap
    const globalHourCount = await OtpChallenge.countDocuments({
      deliveryStatus: { $in: ['PENDING', 'SENT'] },
      sentAt: { $gt: hourThreshold },
    });

    if (globalHourCount >= env.otp.maxGlobalPerHour) {
      return errorResponse(
        res,
        'OTP service is temporarily at capacity. Please try again shortly.',
        429
      );
    }

    // 5. Generate cryptographic 6-digit OTP and persist challenge BEFORE external dispatch
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hmacOtp(email, otp);
    const expiresAt = new Date(now + env.otp.expiryMs);
    const expiresInMinutes = Math.max(1, Math.round(env.otp.expiryMs / 60_000));

    createdChallenge = await OtpChallenge.create({
      channel: 'EMAIL',
      email,
      otpHash,
      deliveryStatus: 'PENDING',
      expiresAt,
      recordExpiresAt: new Date(now + 24 * 60 * 60_000),
      sentAt: new Date(now),
      requestIp,
    });

    // 6. Dispatch Email OTP via Resend API
    const dispatchResult = await sendOtpEmail({
      email,
      otp,
      expiresInMinutes,
    });

    // Invalidate any prior unverified SENT challenges for this email so only the latest OTP is valid
    await OtpChallenge.updateMany(
      {
        _id: { $ne: createdChallenge._id },
        channel: 'EMAIL',
        email,
        deliveryStatus: 'SENT',
        verifiedAt: null,
        expiresAt: { $gt: new Date(now) },
      },
      { $set: { expiresAt: new Date(now) } }
    );

    createdChallenge.deliveryStatus = 'SENT';
    createdChallenge.providerSessionId = dispatchResult?.providerMessageId || '';
    await createdChallenge.save();

    return successResponse(
      res,
      {
        emailMasked: maskEmail(email),
        expiresInSeconds: Math.floor(env.otp.expiryMs / 1000),
        cooldownSeconds: Math.floor(env.otp.cooldownMs / 1000),
      },
      'OTP sent to your email address'
    );
  } catch (err) {
    if (createdChallenge) {
      await OtpChallenge.updateOne(
        { _id: createdChallenge._id },
        { $set: { deliveryStatus: 'FAILED' } }
      ).catch(() => {});
    }
    next(err);
  } finally {
    inFlightOtpRequests.delete(email);
  }
}

/**
 * POST /api/v1/provider-auth/otp/verify
 * Atomically increments attempt counter and verifies OTP HMAC in constant time.
 */
export async function verifyOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp =
      typeof req.body?.otp === 'string' || typeof req.body?.otp === 'number'
        ? String(req.body.otp).trim()
        : '';

    if (!isValidEmail(email) || !OTP_REGEX.test(otp)) {
      return errorResponse(res, 'Enter a valid email address and 6-digit OTP', 400);
    }

    const now = new Date();

    // Find the most recent unverified SENT challenge for this email
    const latestChallenge = await OtpChallenge.findOne({
      channel: 'EMAIL',
      email,
      deliveryStatus: 'SENT',
      verifiedAt: null,
    })
      .sort({ createdAt: -1 })
      .select('_id attempts expiresAt')
      .lean();

    if (!latestChallenge) {
      return errorResponse(res, 'OTP is invalid or expired', 400);
    }

    if (new Date(latestChallenge.expiresAt).getTime() <= now.getTime()) {
      return errorResponse(res, 'OTP has expired. Please request a new OTP.', 400);
    }

    if (latestChallenge.attempts >= env.otp.maxAttempts) {
      return errorResponse(
        res,
        'Maximum verification attempts exceeded. Please request a new OTP.',
        400
      );
    }

    // Atomically increment attempt count ONLY if still under maxAttempts, unexpired, and unverified
    const claimedChallenge = await OtpChallenge.findOneAndUpdate(
      {
        _id: latestChallenge._id,
        verifiedAt: null,
        expiresAt: { $gt: now },
        attempts: { $lt: env.otp.maxAttempts },
      },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (!claimedChallenge) {
      return errorResponse(res, 'OTP is invalid or expired', 400);
    }

    const expectedHash = hmacOtp(email, otp);
    if (!safeEqualHex(claimedChallenge.otpHash, expectedHash)) {
      return errorResponse(res, 'Incorrect OTP. Please check the code and try again.', 400);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const authorizationHash = hashToken(verificationToken);
    const authorizationExpiresAt = new Date(Date.now() + 10 * 60_000);

    const verifiedChallenge = await OtpChallenge.findOneAndUpdate(
      {
        _id: claimedChallenge._id,
        verifiedAt: null,
      },
      {
        $set: {
          verifiedAt: new Date(),
          authorizationHash,
          authorizationExpiresAt,
        },
      },
      { new: true }
    );

    if (!verifiedChallenge) {
      return errorResponse(res, 'OTP has already been used', 400);
    }

    return successResponse(
      res,
      {
        verificationToken,
        expiresInSeconds: 600,
        emailMasked: maskEmail(email),
        emailVerified: true,
      },
      'Email address verified'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/provider-auth/register (also /login)
 * Atomically consumes the one-time verificationToken bound to the verified email and either
 * creates a new ProviderAccount or authenticates an existing returning ProviderAccount,
 * issuing a server-side session without ever marking phoneVerified via email OTP.
 */
export async function registerProvider(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const verificationToken =
      typeof req.body?.verificationToken === 'string' ? req.body.verificationToken.trim() : '';

    if (!isValidEmail(email) || !verificationToken) {
      return errorResponse(res, 'A valid email verification is required', 403);
    }

    const rawPhone = req.body?.phone;
    const cleanPhone =
      rawPhone !== undefined && rawPhone !== null && String(rawPhone).trim() !== ''
        ? normalizeIndianPhone(rawPhone)
        : '';

    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      return errorResponse(res, 'Enter a valid 10-digit Indian mobile number', 400);
    }

    const cleanName =
      typeof req.body?.name === 'string' ? sanitizeString(req.body.name).slice(0, 100) : '';

    const challenge = await OtpChallenge.findOneAndUpdate(
      {
        channel: 'EMAIL',
        email,
        authorizationHash: hashToken(verificationToken),
        verifiedAt: { $ne: null },
        consumedAt: null,
        authorizationExpiresAt: { $gt: new Date() },
      },
      { $set: { consumedAt: new Date() } },
      { new: true }
    );

    if (!challenge) {
      return errorResponse(res, 'A valid email verification is required', 403);
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = ProviderAccount.hashSessionToken(sessionToken);
    const sessionDurationHours = 24;
    const sessionExpiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);
    const verifiedTimestamp = challenge.verifiedAt || new Date();

    let account = await ProviderAccount.findOne({ email, emailVerified: true });
    let isNewAccount = false;

    if (!account) {
      if (cleanPhone) {
        const phoneOwner = await ProviderAccount.findOne({ phone: cleanPhone }).lean();
        if (phoneOwner) {
          return errorResponse(
            res,
            'This mobile number is already associated with another provider account.',
            409
          );
        }
      }

      isNewAccount = true;
      const createPayload = {
        email,
        emailVerified: true,
        emailVerifiedAt: verifiedTimestamp,
        phoneVerified: false,
        phoneVerifiedAt: null,
        verifiedAt: verifiedTimestamp,
        lastLoginAt: new Date(),
        status: 'ACTIVE',
        sessionTokenHash,
        sessionExpiresAt,
      };
      if (cleanPhone) {
        createPayload.phone = cleanPhone;
      }
      if (cleanName) {
        createPayload.name = cleanName;
      }
      account = await ProviderAccount.create(createPayload);
    } else {
      account.sessionTokenHash = sessionTokenHash;
      account.sessionExpiresAt = sessionExpiresAt;
      account.lastLoginAt = new Date();
      account.emailVerified = true;
      if (account.googleId) {
        account.authProvider = 'BOTH';
      } else if (!account.authProvider) {
        account.authProvider = 'EMAIL_OTP';
      }
      if (!account.emailVerifiedAt) {
        account.emailVerifiedAt = verifiedTimestamp;
      }
      if (!account.verifiedAt) {
        account.verifiedAt = verifiedTimestamp;
      }
      if (!account.phone && cleanPhone) {
        const phoneOwner = await ProviderAccount.findOne({
          phone: cleanPhone,
          _id: { $ne: account._id },
        }).lean();
        if (phoneOwner) {
          return errorResponse(
            res,
            'This mobile number is already associated with another provider account.',
            409
          );
        }
        account.phone = cleanPhone;
        account.phoneVerified = false;
      }
      if (!account.name && cleanName) {
        account.name = cleanName;
      }
      await account.save();
    }

    res.cookie(PROVIDER_COOKIE_NAME, sessionToken, {
      ...getProviderCookieOptions(),
      maxAge: sessionDurationHours * 60 * 60 * 1000,
    });

    const dto = formatProviderAccountDto(account);

    return successResponse(
      res,
      {
        ...dto,
        token: sessionToken,
        providerToken: sessionToken,
        expiresAt: sessionExpiresAt,
        isNewAccount,
      },
      isNewAccount ? 'Provider account created' : 'Provider authenticated successfully',
      isNewAccount ? 201 : 200
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/provider-auth/google/nonce
 * Issues a server-generated, short-lived (10 min), single-use nonce plus an attempt token that
 * binds the nonce to this sign-in attempt. The nonce must be embedded into the Google ID token
 * (via Google Identity Services `nonce`) and both values returned to POST /google.
 */
export async function issueGoogleNonce(req, res, next) {
  try {
    const issued = await googleAuthService.issueNonce({ requestIp: String(req.ip || '') });
    res.set('Cache-Control', 'no-store');
    return successResponse(res, issued, 'Google sign-in nonce issued');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/provider-auth/google
 * Verifies a Google ID token on the backend using Google's official verification library,
 * requires and atomically consumes a server-issued single-use nonce (replay protection),
 * creates a new ProviderAccount or safely links/authenticates an existing account with the
 * same verified email address, and issues an HttpOnly provider session without requiring Email OTP
 * and without ever marking mobile phone numbers as verified.
 */
export async function googleAuthProvider(req, res, next) {
  try {
    const rawToken =
      typeof req.body?.idToken === 'string'
        ? req.body.idToken
        : typeof req.body?.credential === 'string'
        ? req.body.credential
        : '';
    const suppliedNonce = typeof req.body?.nonce === 'string' ? req.body.nonce.trim() : '';
    const attemptToken =
      typeof req.body?.attemptToken === 'string' ? req.body.attemptToken.trim() : '';

    if (!suppliedNonce || !attemptToken) {
      return errorResponse(
        res,
        'A valid Google sign-in nonce is required. Please retry Google Sign-In.',
        400
      );
    }

    const rawPhone = req.body?.phone;
    const cleanPhone =
      rawPhone !== undefined && rawPhone !== null && String(rawPhone).trim() !== ''
        ? normalizeIndianPhone(rawPhone)
        : '';

    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      return errorResponse(res, 'Enter a valid 10-digit Indian mobile number', 400);
    }

    // 1. Cryptographically verify the ID token; its signed nonce claim must equal suppliedNonce
    const verifiedGoogle = await verifyGoogleIdToken({
      idToken: rawToken,
      expectedNonce: suppliedNonce,
    });

    // 2. Atomically consume the server-issued nonce (single use, unexpired, bound to attempt)
    const nonceConsumed = await googleAuthService.consumeNonce({
      nonce: verifiedGoogle.nonce,
      attemptToken,
    });
    if (!nonceConsumed) {
      return errorResponse(
        res,
        'Google sign-in request is expired or has already been used. Please retry Google Sign-In.',
        401
      );
    }

    const { googleId, email, name: googleName } = verifiedGoogle;

    const [accountByGoogleId, accountByEmail] = await Promise.all([
      ProviderAccount.findOne({ googleId }),
      ProviderAccount.findOne({ email, emailVerified: true }),
    ]);

    if (
      accountByGoogleId &&
      accountByEmail &&
      String(accountByGoogleId._id) !== String(accountByEmail._id)
    ) {
      return errorResponse(
        res,
        'This Google account conflicts with an existing provider account.',
        409
      );
    }

    if (accountByEmail && accountByEmail.googleId && accountByEmail.googleId !== googleId) {
      return errorResponse(
        res,
        'This email address is already linked to a different Google account.',
        409
      );
    }

    if (accountByGoogleId && accountByGoogleId.email && accountByGoogleId.email !== email) {
      return errorResponse(
        res,
        'This Google account is already linked to a different provider email address.',
        409
      );
    }

    let account = accountByGoogleId || accountByEmail;
    let isNewAccount = false;
    let accountLinked = false;

    const now = new Date();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = ProviderAccount.hashSessionToken(sessionToken);
    const sessionDurationHours = 24;
    const sessionExpiresAt = new Date(now.getTime() + sessionDurationHours * 60 * 60 * 1000);

    if (!account) {
      if (cleanPhone) {
        const phoneOwner = await ProviderAccount.findOne({ phone: cleanPhone }).lean();
        if (phoneOwner) {
          return errorResponse(
            res,
            'This mobile number is already associated with another provider account.',
            409
          );
        }
      }

      isNewAccount = true;
      const createPayload = {
        email,
        googleId,
        authProvider: 'GOOGLE',
        emailVerified: true,
        emailVerifiedAt: now,
        phoneVerified: false,
        phoneVerifiedAt: null,
        verifiedAt: now,
        lastLoginAt: now,
        status: 'ACTIVE',
        sessionTokenHash,
        sessionExpiresAt,
      };
      if (cleanPhone) {
        createPayload.phone = cleanPhone;
      }
      if (googleName) {
        createPayload.name = googleName;
      }
      account = await ProviderAccount.create(createPayload);
    } else {
      const hadGoogleId = Boolean(account.googleId);
      if (!hadGoogleId) {
        // Atomic conditional link: succeeds only if no different Google identity was linked concurrently
        const linked = await ProviderAccount.findOneAndUpdate(
          {
            _id: account._id,
            $or: [{ googleId: null }, { googleId: '' }, { googleId }],
          },
          { $set: { googleId } },
          { new: true }
        );
        if (!linked) {
          return errorResponse(
            res,
            'This email address is already linked to a different Google account.',
            409
          );
        }
        account.googleId = googleId;
        accountLinked = true;
      }
      account.authProvider =
        !hadGoogleId || account.authProvider === 'EMAIL_OTP' || account.authProvider === 'BOTH'
          ? 'BOTH'
          : 'GOOGLE';
      account.sessionTokenHash = sessionTokenHash;
      account.sessionExpiresAt = sessionExpiresAt;
      account.lastLoginAt = now;
      account.emailVerified = true;
      if (!account.emailVerifiedAt) {
        account.emailVerifiedAt = now;
      }
      if (!account.verifiedAt) {
        account.verifiedAt = now;
      }
      if (!account.phone && cleanPhone) {
        const phoneOwner = await ProviderAccount.findOne({
          phone: cleanPhone,
          _id: { $ne: account._id },
        }).lean();
        if (phoneOwner) {
          return errorResponse(
            res,
            'This mobile number is already associated with another provider account.',
            409
          );
        }
        account.phone = cleanPhone;
        account.phoneVerified = false;
      }
      if (!account.name && googleName) {
        account.name = googleName;
      }
      await account.save();
    }

    res.cookie(PROVIDER_COOKIE_NAME, sessionToken, {
      ...getProviderCookieOptions(),
      maxAge: sessionDurationHours * 60 * 60 * 1000,
    });

    const dto = formatProviderAccountDto(account);

    return successResponse(
      res,
      {
        ...dto,
        token: sessionToken,
        providerToken: sessionToken,
        expiresAt: sessionExpiresAt,
        isNewAccount,
        accountLinked,
      },
      isNewAccount
        ? 'Provider account created with Google'
        : 'Provider authenticated with Google successfully',
      isNewAccount ? 201 : 200
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/provider-auth/me
 */
export async function getProviderMe(req, res) {
  return successResponse(
    res,
    formatProviderAccountDto(req.providerAccount),
    'Provider session active'
  );
}

/**
 * PUT /api/v1/provider-auth/profile
 * Allows authenticated provider to update name and unverified business mobile number.
 * Verified email (and verified mobile on legacy accounts) remain locked.
 */
export async function updateProviderProfile(req, res, next) {
  try {
    const account = req.providerAccount;
    const { name, email, phone } = req.body || {};

    if (email !== undefined) {
      const cleanEmail = typeof email === 'string' ? normalizeEmail(email) : '';
      if (account.emailVerified && cleanEmail !== account.email) {
        return errorResponse(
          res,
          'Verified email address cannot be changed without re-verification.',
          400
        );
      }
      if (!account.emailVerified) {
        if (cleanEmail && (!isValidEmail(cleanEmail) || cleanEmail.length > 254)) {
          return errorResponse(res, 'Please provide a valid email address or leave blank', 400);
        }
        account.email = cleanEmail;
      }
    }

    if (phone !== undefined) {
      const cleanPhone =
        phone !== null && String(phone).trim() !== '' ? normalizeIndianPhone(phone) : '';
      if (account.phoneVerified && cleanPhone !== account.phone) {
        return errorResponse(
          res,
          'Verified mobile number cannot be changed without re-verification.',
          400
        );
      }
      if (!account.phoneVerified) {
        if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
          return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number', 400);
        }
        if (cleanPhone && cleanPhone !== account.phone) {
          const phoneOwner = await ProviderAccount.findOne({
            phone: cleanPhone,
            _id: { $ne: account._id },
          }).lean();
          if (phoneOwner) {
            return errorResponse(
              res,
              'This mobile number is already associated with another provider account.',
              409
            );
          }
          account.phone = cleanPhone;
        }
      }
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length > 100) {
        return errorResponse(res, 'Name must be a string up to 100 characters', 400);
      }
      account.name = sanitizeString(name).slice(0, 100);
    }

    await account.save();

    return successResponse(
      res,
      formatProviderAccountDto(account),
      'Provider profile updated successfully'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/provider-auth/logout
 */
export async function logoutProvider(req, res, next) {
  try {
    if (req.providerAccount) {
      req.providerAccount.sessionTokenHash = null;
      req.providerAccount.sessionExpiresAt = null;
      await req.providerAccount.save();
    }
    res.clearCookie(PROVIDER_COOKIE_NAME, getProviderCookieOptions());
    return successResponse(res, null, 'Logged out of provider account');
  } catch (err) {
    next(err);
  }
}

export default {
  requestOtp,
  verifyOtp,
  registerProvider,
  issueGoogleNonce,
  googleAuthProvider,
  getProviderMe,
  updateProviderProfile,
  logoutProvider,
};

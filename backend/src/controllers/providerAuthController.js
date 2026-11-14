import crypto from 'crypto';
import OtpChallenge from '../models/OtpChallenge.js';
import ProviderAccount from '../models/ProviderAccount.js';
import env from '../config/env.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sanitizeString } from '../utils/referenceId.js';
import { sendOtpSms } from '../services/twoFactorService.js';

const PROVIDER_COOKIE_NAME = 'wareshop_provider_session';
const PHONE_REGEX = /^[6-9]\d{9}$/;
const OTP_REGEX = /^\d{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-flight mutex per phone number to prevent parallel race conditions on OTP send cooldown
const inFlightOtpRequests = new Set();

function normalizePhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/\D/g, '').trim();
}

function hmacOtp(phone, otp) {
  return crypto
    .createHmac('sha256', env.otp.hmacSecret)
    .update(`${phone}:${otp}`)
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

function formatProviderAccountDto(account) {
  return {
    id: String(account._id),
    providerAccountId: String(account._id),
    phone: account.phone,
    phoneMasked: `******${account.phone.slice(-4)}`,
    name: account.name || '',
    email: account.email || '',
    role: account.role || 'PROVIDER',
    status: account.status || 'ACTIVE',
    suspensionReason: account.status === 'SUSPENDED' ? account.suspensionReason || '' : '',
    verifiedAt: account.verifiedAt,
    lastLoginAt: account.lastLoginAt,
  };
}

/**
 * POST /api/v1/provider-auth/otp/request
 * Generates a 6-digit OTP, persists an HMAC challenge atomically, and dispatches SMS via 2Factor.
 */
export async function requestOtp(req, res, next) {
  const phone = normalizePhone(req.body?.phone);
  if (!PHONE_REGEX.test(phone)) {
    return errorResponse(res, 'Enter a valid 10-digit Indian mobile number', 400);
  }

  if (inFlightOtpRequests.has(phone)) {
    return errorResponse(res, 'Please wait before requesting another OTP', 429);
  }

  inFlightOtpRequests.add(phone);
  let createdChallenge = null;

  try {
    const now = Date.now();
    const cooldownThreshold = new Date(now - env.otp.cooldownMs);
    const dayThreshold = new Date(now - 24 * 60 * 60_000);
    const hourThreshold = new Date(now - 60 * 60_000);

    // 1. Enforce 60-second per-phone cooldown
    const recentChallenge = await OtpChallenge.findOne({
      phone,
      deliveryStatus: { $in: ['PENDING', 'SENT'] },
      sentAt: { $gt: cooldownThreshold },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (recentChallenge) {
      return errorResponse(res, 'Please wait 60 seconds before requesting another OTP', 429);
    }

    // 2. Enforce daily per-phone SMS cap
    const phoneDayCount = await OtpChallenge.countDocuments({
      phone,
      deliveryStatus: { $in: ['PENDING', 'SENT'] },
      sentAt: { $gt: dayThreshold },
    });

    if (phoneDayCount >= env.otp.maxPerPhonePerDay) {
      return errorResponse(
        res,
        'Maximum daily OTP requests reached for this mobile number. Please try again tomorrow.',
        429
      );
    }

    // 3. Enforce global hourly SMS budget cap (SMS pumping protection)
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

    // 4. Generate OTP and persist challenge BEFORE external SMS dispatch (REL-09)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hmacOtp(phone, otp);
    const expiresAt = new Date(now + env.otp.expiryMs);

    createdChallenge = await OtpChallenge.create({
      phone,
      otpHash,
      deliveryStatus: 'PENDING',
      expiresAt,
      recordExpiresAt: new Date(now + 24 * 60 * 60_000),
      sentAt: new Date(now),
      requestIp: req.ip || '',
    });

    // 5. Dispatch SMS via 2Factor API
    const smsResult = await sendOtpSms({ phone, otp });

    createdChallenge.deliveryStatus = 'SENT';
    createdChallenge.providerSessionId = smsResult?.providerSessionId || '';
    await createdChallenge.save();

    return successResponse(
      res,
      {
        phoneMasked: `******${phone.slice(-4)}`,
        expiresInSeconds: Math.floor(env.otp.expiryMs / 1000),
      },
      'OTP sent to your mobile number'
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
    inFlightOtpRequests.delete(phone);
  }
}

/**
 * POST /api/v1/provider-auth/otp/verify
 * Atomically increments attempt counter and verifies OTP HMAC in constant time.
 */
export async function verifyOtp(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone);
    const otp = typeof req.body?.otp === 'string' || typeof req.body?.otp === 'number'
      ? String(req.body.otp).trim()
      : '';

    if (!PHONE_REGEX.test(phone) || !OTP_REGEX.test(otp)) {
      return errorResponse(res, 'Enter a valid mobile number and 6-digit OTP', 400);
    }

    const now = new Date();

    // Find the most recent unverified SENT challenge for this phone
    const latestChallenge = await OtpChallenge.findOne({
      phone,
      deliveryStatus: 'SENT',
      verifiedAt: null,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .select('_id attempts')
      .lean();

    if (!latestChallenge || latestChallenge.attempts >= env.otp.maxAttempts) {
      return errorResponse(res, 'OTP is invalid or expired', 400);
    }

    // Atomically increment attempt count ONLY if still under maxAttempts and unverified
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

    const expectedHash = hmacOtp(phone, otp);
    if (!safeEqualHex(claimedChallenge.otpHash, expectedHash)) {
      return errorResponse(res, 'OTP is invalid or expired', 400);
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
        phoneMasked: `******${phone.slice(-4)}`,
      },
      'Mobile number verified'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/provider-auth/register (also /login)
 * Atomically consumes the one-time verificationToken and either creates a new ProviderAccount
 * or authenticates an existing returning ProviderAccount, issuing a server-side session.
 */
export async function registerProvider(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone);
    const verificationToken =
      typeof req.body?.verificationToken === 'string' ? req.body.verificationToken.trim() : '';

    if (!PHONE_REGEX.test(phone) || !verificationToken) {
      return errorResponse(res, 'A valid mobile verification is required', 403);
    }

    const challenge = await OtpChallenge.findOneAndUpdate(
      {
        phone,
        authorizationHash: hashToken(verificationToken),
        consumedAt: null,
        authorizationExpiresAt: { $gt: new Date() },
      },
      { $set: { consumedAt: new Date() } },
      { new: true }
    );

    if (!challenge) {
      return errorResponse(res, 'A valid mobile verification is required', 403);
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = ProviderAccount.hashSessionToken(sessionToken);
    const sessionDurationHours = 24;
    const sessionExpiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);

    let account = await ProviderAccount.findOne({ phone });
    let isNewAccount = false;

    if (!account) {
      isNewAccount = true;
      account = await ProviderAccount.create({
        phone,
        verifiedAt: challenge.verifiedAt || new Date(),
        lastLoginAt: new Date(),
        status: 'ACTIVE',
        sessionTokenHash,
        sessionExpiresAt,
      });
    } else {
      account.sessionTokenHash = sessionTokenHash;
      account.sessionExpiresAt = sessionExpiresAt;
      account.lastLoginAt = new Date();
      if (!account.verifiedAt) {
        account.verifiedAt = challenge.verifiedAt || new Date();
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
 * Allows authenticated provider to update name and optional email. Phone remains locked.
 */
export async function updateProviderProfile(req, res, next) {
  try {
    const account = req.providerAccount;
    const { name, email } = req.body || {};

    if (req.body?.phone !== undefined && normalizePhone(req.body.phone) !== account.phone) {
      return errorResponse(
        res,
        'Verified mobile number cannot be changed without re-verification.',
        400
      );
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length > 100) {
        return errorResponse(res, 'Name must be a string up to 100 characters', 400);
      }
      account.name = sanitizeString(name).slice(0, 100);
    }

    if (email !== undefined) {
      const cleanEmail = typeof email === 'string' ? sanitizeString(email).toLowerCase() : '';
      if (cleanEmail && (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 120)) {
        return errorResponse(res, 'Please provide a valid email address or leave blank', 400);
      }
      account.email = cleanEmail;
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
  getProviderMe,
  updateProviderProfile,
  logoutProvider,
};

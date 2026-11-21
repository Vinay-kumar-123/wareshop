import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env in current working directory and fallback to backend/.env
const candidateEnvPaths = [
  process.env.NODE_ENV === 'test' ? path.resolve(process.cwd(), '.env.test') : null,
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
].filter(Boolean);

export function extractUnquotedHashValue(envContent, key = 'ADMIN_PASSWORD') {
  if (typeof envContent !== 'string' || !envContent) return null;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRegex = new RegExp(`^(?:export\\s+)?${escapedKey}\\s*=\\s*(.+)$`);

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(lineRegex);
    if (!match) continue;
    const rawValue = match[1].trim();
    // If unquoted and contains '#' directly attached to a non-whitespace character (e.g. Pass#123!)
    // dotenv v16 truncates at '#'; recover the full token while still stripping " # inline comment"
    if (!/^['"`]/.test(rawValue) && /\S#/.test(rawValue)) {
      return rawValue.replace(/\s+#.*$/, '').trim();
    }
  }
  return null;
}

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    const hadPreexistingAdminPassword = Object.prototype.hasOwnProperty.call(
      process.env,
      'ADMIN_PASSWORD'
    );
    dotenv.config({ path: envPath });
    if (!hadPreexistingAdminPassword) {
      try {
        const rawEnvFile = fs.readFileSync(envPath, 'utf8');
        const recoveredPassword = extractUnquotedHashValue(rawEnvFile, 'ADMIN_PASSWORD');
        if (recoveredPassword) {
          process.env.ADMIN_PASSWORD = recoveredPassword;
        }
      } catch {
        // Ignore read error and retain dotenv parsed value
      }
    }
    break;
  }
}

const WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  'admin123',
  'konnevia@admin2026!',
  'wareshop@admin2026!',
  'change_this_to_a_strong_password_in_production',
  '<unique-test-only-password>',
  '<strong-admin-password-min-12-chars>',
]);

export function extractDbNameFromUri(uri) {
  const match = String(uri || '').match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
  return match ? decodeURIComponent(match[1]).trim() : '';
}

export function isStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 12) return false;
  if (WEAK_PASSWORDS.has(password.trim().toLowerCase())) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSymbol;
}

export function buildEnv(rawEnv = process.env) {
  const inferredDefaultEnv =
    rawEnv.RENDER === 'true' || rawEnv.RENDER_SERVICE_ID ? 'production' : 'development';
  const nodeEnv = (rawEnv.NODE_ENV || inferredDefaultEnv).trim();
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';
  const isTest = nodeEnv === 'test';

  const rawUri = (rawEnv.MONGODB_URI || '').trim();
  const uriDbName = extractDbNameFromUri(rawUri);
  const explicitDbName = (rawEnv.MONGODB_DB_NAME || '').trim();

  const defaultDbName = isTest ? 'wareshop_test' : isDevelopment ? 'wareshop_dev' : '';
  const mongodbDbName = explicitDbName || uriDbName || defaultDbName;

  const mongodbUri =
    rawUri || (isProduction ? '' : `mongodb://localhost:27017/${mongodbDbName || 'wareshop_dev'}`);

  const corsOrigin =
    (rawEnv.CORS_ORIGIN || '').trim() ||
    (isProduction ? '' : 'http://localhost:5173,http://localhost:3000');

  let trustProxy = 1;
  if (rawEnv.TRUST_PROXY !== undefined && rawEnv.TRUST_PROXY !== '') {
    if (rawEnv.TRUST_PROXY === 'true') trustProxy = true;
    else if (rawEnv.TRUST_PROXY === 'false') trustProxy = false;
    else {
      const parsed = parseInt(rawEnv.TRUST_PROXY, 10);
      trustProxy = Number.isNaN(parsed) ? 1 : parsed;
    }
  }

  const adminPassword = rawEnv.ADMIN_PASSWORD || '';
  const rawOtpSecret = (rawEnv.OTP_HMAC_SECRET || '').trim();
  const otpHmacSecret =
    rawOtpSecret ||
    (isProduction
      ? ''
      : adminPassword
      ? crypto.scryptSync(adminPassword, 'wareshop-otp-hmac-v1', 32).toString('hex')
      : 'wareshop-dev-only-otp-hmac-secret');

  return {
    port: parseInt(rawEnv.PORT, 10) || 5000,
    nodeEnv,
    isProduction,
    isDevelopment,
    isTest,
    mongodbUri,
    mongodbDbName,
    corsOrigin,
    trustProxy,
    contactRevealWindowMs: parseInt(rawEnv.CONTACT_REVEAL_WINDOW_MS, 10) || 15 * 60 * 1000,
    contactRevealMaxRequests: parseInt(rawEnv.CONTACT_REVEAL_MAX_REQUESTS, 10) || 30,

    // Owner Admin Credentials — NO hardcoded fallbacks
    admin: {
      email: (rawEnv.ADMIN_EMAIL || '').trim().toLowerCase(),
      password: adminPassword,
      autoRotate: rawEnv.ADMIN_AUTO_ROTATE_PASSWORD === 'true',
    },

    // Resend Email OTP Configuration
    resend: {
      apiKey: (rawEnv.RESEND_API_KEY || '').trim(),
      fromEmail: (rawEnv.RESEND_FROM_EMAIL || '').trim(),
      replyTo: (rawEnv.RESEND_REPLY_TO || '').trim(),
    },

    // OTP Security & Rate Controls
    otp: {
      hmacSecret: otpHmacSecret,
      cooldownMs:
        parseInt(rawEnv.OTP_COOLDOWN_MS, 10) ||
        (parseInt(rawEnv.OTP_COOLDOWN_SECONDS, 10)
          ? parseInt(rawEnv.OTP_COOLDOWN_SECONDS, 10) * 1000
          : 60_000),
      expiryMs:
        parseInt(rawEnv.OTP_EXPIRY_MS, 10) ||
        (parseInt(rawEnv.OTP_TTL_MINUTES, 10)
          ? parseInt(rawEnv.OTP_TTL_MINUTES, 10) * 60_000
          : 5 * 60_000),
      maxAttempts: parseInt(rawEnv.OTP_MAX_ATTEMPTS, 10) || 5,
      maxPerEmailPerDay:
        parseInt(rawEnv.OTP_MAX_PER_EMAIL_DAY || rawEnv.OTP_DAILY_MAX_PER_EMAIL, 10) || 5,
      maxPerIpPerHour: parseInt(rawEnv.OTP_MAX_PER_IP_HOUR, 10) || 20,
      maxGlobalPerHour:
        parseInt(rawEnv.OTP_MAX_GLOBAL_HOUR || rawEnv.OTP_GLOBAL_HOURLY_MAX, 10) || 200,
    },

    // Image Upload & Storage Configuration
    storage: {
      provider: (rawEnv.STORAGE_PROVIDER || 'local').trim(),
      uploadDir: rawEnv.UPLOAD_DIR
        ? path.resolve(rawEnv.UPLOAD_DIR)
        : path.resolve(__dirname, '..', '..', 'uploads'),
      maxFileSizeMb: parseInt(rawEnv.MAX_FILE_SIZE_MB, 10) || 5,
      cloudinary: {
        cloudName: (rawEnv.CLOUDINARY_CLOUD_NAME || '').trim(),
        apiKey: (rawEnv.CLOUDINARY_API_KEY || '').trim(),
        apiSecret: (rawEnv.CLOUDINARY_API_SECRET || '').trim(),
        folder: (rawEnv.CLOUDINARY_FOLDER || 'wareshop/providers').trim(),
        categoryFolder: (rawEnv.CLOUDINARY_CATEGORY_FOLDER || 'wareshop/categories').trim(),
      },
    },
  };
}

export function validateEnv(config = env) {
  const errors = [];

  if (!['development', 'test', 'production'].includes(config.nodeEnv)) {
    errors.push('NODE_ENV must be one of: development, test, production.');
  }

  if (!config.mongodbUri || !/^mongodb(?:\+srv)?:\/\//i.test(config.mongodbUri)) {
    errors.push('MONGODB_URI is required and must use mongodb:// or mongodb+srv:// scheme.');
  }

  if (!config.mongodbDbName) {
    errors.push('MONGODB_DB_NAME (or an explicit database name in MONGODB_URI) is required.');
  }

  if (config.isProduction) {
    if (/localhost|127\.0\.0\.1/i.test(config.mongodbUri)) {
      errors.push('MONGODB_URI must not point to localhost in production.');
    }

    if (config.mongodbDbName && config.mongodbDbName.toLowerCase() === 'test') {
      errors.push('MONGODB_DB_NAME cannot be "test" in production.');
    }

    if (!config.corsOrigin) {
      errors.push('CORS_ORIGIN is required in production.');
    } else {
      const origins = config.corsOrigin
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      if (origins.length === 0 || origins.includes('*')) {
        errors.push('CORS_ORIGIN must not contain wildcard (*) in production.');
      }
      for (const origin of origins) {
        if (!/^https?:\/\/[^/\s]+$/i.test(origin.replace(/\/$/, ''))) {
          errors.push('CORS_ORIGIN contains an invalid origin format.');
          break;
        }
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !config.admin?.email ||
      !emailRegex.test(config.admin.email) ||
      config.admin.email.endsWith('.invalid') ||
      config.admin.email === 'admin@example.com'
    ) {
      errors.push('ADMIN_EMAIL must be set to a valid production administrator email.');
    }

    if (!config.admin?.password || !isStrongPassword(config.admin.password)) {
      errors.push(
        'ADMIN_PASSWORD is required in production and must be at least 12 characters including uppercase, lowercase, number, and symbol.'
      );
    }

    const isConfiguredVal = (v) =>
      typeof v === 'string' && Boolean(v.trim()) && !/^<.*>$/.test(v.trim());

    if (!isConfiguredVal(config.otp?.hmacSecret) || config.otp.hmacSecret.trim().length < 32) {
      errors.push('OTP_HMAC_SECRET is required in production and must be at least 32 characters.');
    }

    if (!isConfiguredVal(config.resend?.apiKey)) {
      errors.push('RESEND_API_KEY is required in production.');
    }

    const fromEmailVal = (config.resend?.fromEmail || '').trim();
    const extractedFromEmail = fromEmailVal.includes('<')
      ? (fromEmailVal.match(/<([^<>]+)>/)?.[1] || '').trim()
      : fromEmailVal;
    if (
      !isConfiguredVal(fromEmailVal) ||
      !emailRegex.test(extractedFromEmail) ||
      extractedFromEmail.endsWith('.invalid')
    ) {
      errors.push('RESEND_FROM_EMAIL is required in production and must contain a valid sender email address.');
    }

    if (config.storage?.provider !== 'cloudinary') {
      errors.push('STORAGE_PROVIDER must be set to "cloudinary" in production.');
    } else {
      const { cloudName, apiKey, apiSecret } = config.storage.cloudinary || {};
      if (!isConfiguredVal(cloudName) || !isConfiguredVal(apiKey) || !isConfiguredVal(apiSecret)) {
        errors.push(
          'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required when STORAGE_PROVIDER=cloudinary.'
        );
      }
    }
  }

  if (errors.length > 0) {
    const err = new Error(`Invalid environment configuration: ${errors.join(' ')}`);
    err.code = 'ERR_INVALID_ENV_CONFIG';
    err.details = errors;
    throw err;
  }

  return true;
}

export const env = buildEnv(process.env);

export default env;

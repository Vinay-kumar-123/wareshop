import env from '../config/env.js';

const DEFAULT_TWOFACTOR_API_ROOT = 'https://2factor.in/API/V1';

function resolveTwoFactorRoot(configuredBaseUrl) {
  const raw = String(configuredBaseUrl || DEFAULT_TWOFACTOR_API_ROOT)
    .trim()
    .replace(/\/+$/, '');
  // Normalize legacy '/OTP/SEND' suffix if present in older env files
  if (/\/API\/V1\/OTP\/SEND$/i.test(raw)) {
    return raw.replace(/\/OTP\/SEND$/i, '');
  }
  return raw || DEFAULT_TWOFACTOR_API_ROOT;
}

/**
 * Sends a backend-generated 6-digit OTP via 2Factor's documented Manual OTP SMS API:
 *   GET https://2factor.in/API/V1/{api_key}/SMS/+91{phone}/{otp}/{template_name}
 *
 * Security rules:
 * - Never logs the OTP or API key.
 * - Never simulates or fakes SMS delivery.
 */
export async function sendOtpSms({ phone, otp }) {
  const apiKey = (process.env.TWOFACTOR_API_KEY || env.twoFactor?.apiKey || '').trim();
  const template = (process.env.TWOFACTOR_OTP_TEMPLATE || env.twoFactor?.template || '').trim();
  const baseUrl = resolveTwoFactorRoot(process.env.TWOFACTOR_BASE_URL || env.twoFactor?.baseUrl);

  if (!apiKey) {
    const error = new Error('SMS delivery is not configured');
    error.statusCode = 503;
    throw error;
  }

  if (!/^[6-9]\d{9}$/.test(String(phone || '')) || !/^\d{6}$/.test(String(otp || ''))) {
    const error = new Error('Invalid phone or OTP format for SMS dispatch');
    error.statusCode = 400;
    throw error;
  }

  const templateSegment = template ? `/${encodeURIComponent(template)}` : '';
  const endpointUrl = `${baseUrl}/${encodeURIComponent(apiKey)}/SMS/+91${encodeURIComponent(phone)}/${encodeURIComponent(otp)}${templateSegment}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    const rawStatus = String(data?.Status || data?.status || '').toLowerCase();

    if (!response.ok || !['success', 'sent'].includes(rawStatus)) {
      const error = new Error('Unable to send OTP via SMS gateway at this time');
      error.statusCode = 502;
      throw error;
    }

    const sessionId = String(data?.Details || data?.details || data?.session_id || '').trim();
    return {
      providerSessionId: sessionId || null,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('OTP SMS provider timed out');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    if (error.statusCode) {
      throw error;
    }
    const gatewayError = new Error('Unable to reach SMS gateway');
    gatewayError.statusCode = 502;
    throw gatewayError;
  } finally {
    clearTimeout(timeout);
  }
}

export default { sendOtpSms };

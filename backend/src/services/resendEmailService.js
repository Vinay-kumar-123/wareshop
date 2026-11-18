import { Resend } from 'resend';
import env from '../config/env.js';
import { normalizeEmail, isValidEmail } from '../utils/validation.js';

const OTP_CODE_REGEX = /^\d{6}$/;
const PLACEHOLDER_REGEX = /^<.*>$/;

function isConfiguredValue(val) {
  return Boolean(val && !PLACEHOLDER_REGEX.test(val.trim()));
}

function buildOtpEmailHtml({ otp, expiresInMinutes }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WARESHOP Verification Code</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#171717;padding:20px 24px;">
                <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">WARESHOP</span>
                <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#F36B21;margin-top:4px;">Provider Portal Verification</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#171717;">Verify your email address</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                  Use the 6-digit verification code below to sign in or register your WARESHOP provider account.
                </p>
                <div style="background-color:#FFF5EF;border:1px solid #FFE6D5;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px;">
                  <span style="font-size:32px;font-weight:800;letter-spacing:0.25em;color:#D95513;font-family:monospace;">${otp}</span>
                </div>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#475569;">
                  This code expires in <strong>${expiresInMinutes} minutes</strong> and can only be used once.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#64748B;">
                  If you did not request this code, you can safely ignore this email. Never share your verification code with anyone.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends a backend-generated 6-digit OTP to a provider's email address using the
 * official Resend Node.js SDK.
 *
 * Security constraints:
 * - Never logs the OTP or RESEND_API_KEY.
 * - Never simulates or fakes delivery when unconfigured.
 * - Fails closed on missing configuration, API errors, or timeouts.
 *
 * @param {Object} params
 * @param {string} params.email - Normalized provider email address
 * @param {string|number} params.otp - 6-digit numeric OTP
 * @param {number} [params.expiresInMinutes=5] - OTP validity window in minutes
 * @returns {Promise<{ providerMessageId: string|null }>}
 */
export async function sendOtpEmail({ email, otp, expiresInMinutes = 5 }) {
  const apiKey = (process.env.RESEND_API_KEY || env.resend?.apiKey || '').trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || env.resend?.fromEmail || '').trim();
  const replyTo = (process.env.RESEND_REPLY_TO || env.resend?.replyTo || '').trim();

  if (!isConfiguredValue(apiKey) || !isConfiguredValue(fromEmail)) {
    const error = new Error('Email OTP delivery is not configured');
    error.statusCode = 503;
    throw error;
  }

  const cleanEmail = normalizeEmail(email);
  const cleanOtp = String(otp || '').trim();

  if (!isValidEmail(cleanEmail) || !OTP_CODE_REGEX.test(cleanOtp)) {
    const error = new Error('Invalid email address or OTP format for email dispatch');
    error.statusCode = 400;
    throw error;
  }

  const safeMinutes = Math.max(1, Number(expiresInMinutes) || 5);
  const resend = new Resend(apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const emailPayload = {
      from: fromEmail,
      to: [cleanEmail],
      subject: 'Your WARESHOP Verification Code',
      text: `Your WARESHOP verification code is ${cleanOtp}. This code expires in ${safeMinutes} minutes and can only be used once. If you did not request this code, please ignore this email.`,
      html: buildOtpEmailHtml({ otp: cleanOtp, expiresInMinutes: safeMinutes }),
      ...(isConfiguredValue(replyTo) ? { replyTo } : {}),
    };

    const { data, error } = await resend.emails.send(emailPayload, {
      signal: controller.signal,
    });

    if (error || !data?.id) {
      const gatewayError = new Error('Unable to send OTP via email service at this time');
      gatewayError.statusCode = 502;
      throw gatewayError;
    }

    return {
      providerMessageId: String(data.id).trim() || null,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Email OTP provider timed out');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    if (error.statusCode) {
      throw error;
    }
    const gatewayError = new Error('Unable to reach email OTP service');
    gatewayError.statusCode = 502;
    throw gatewayError;
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  sendOtpEmail,
};

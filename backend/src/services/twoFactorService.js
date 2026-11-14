const defaultBaseUrl = 'https://2factor.in/API/V1/OTP/SEND';

export async function sendOtpSms({ phone, otp }) {
  const apiKey = process.env.TWOFACTOR_API_KEY;
  const template = process.env.TWOFACTOR_OTP_TEMPLATE;
  if (!apiKey || !template) {
    const error = new Error('SMS delivery is not configured'); error.statusCode = 503; throw error;
  }
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(process.env.TWOFACTOR_BASE_URL || defaultBaseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey }, body: JSON.stringify({ to: `+91${phone}`, channel: 'SMS', template_name: template, var1: otp }), signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !['sent', 'success'].includes(String(data.status || '').toLowerCase())) { const error = new Error('Unable to send OTP at this time'); error.statusCode = 502; throw error; }
    return { providerSessionId: data.session_id || null };
  } catch (error) {
    if (error.name === 'AbortError') { const timeoutError = new Error('OTP provider timed out'); timeoutError.statusCode = 504; throw timeoutError; }
    throw error;
  } finally { clearTimeout(timeout); }
}

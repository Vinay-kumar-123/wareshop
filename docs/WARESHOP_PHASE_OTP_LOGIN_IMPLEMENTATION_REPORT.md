# WARESHOP Phase: 2Factor OTP and authentication UI

## Critical correction: real SMS in every normal environment

The earlier implementation exposed `developmentOtp` when `NODE_ENV` was not production and skipped 2Factor delivery. That was removed. `requestOtp` now always calls the 2Factor adapter before it stores a challenge, and the API response never includes the OTP. Missing 2Factor configuration, provider timeout, or rejected provider response fails closed in development and production alike. Automated tests must mock the adapter only through isolated test fixtures; normal development routes have no OTP fallback.

## Architecture

2Factor is the production SMS delivery provider. WARESHOP generates the cryptographically secure six-digit OTP, retains only its SHA-256 hash, and sends the value to 2Factor's documented OTP send endpoint. This deliberately keeps a single local verification authority while 2Factor supplies SMS transport. On successful local verification, WARESHOP issues a short-lived authorization that is atomically consumed when the provider account is created.

## Changed files

- `backend/src/services/twoFactorService.js` — server-only 2Factor delivery adapter with an eight-second timeout.
- `backend/src/controllers/providerAuthController.js` — production delivery integration while retaining attempt/cooldown/authorization controls.
- `backend/src/models/OtpChallenge.js` — optional opaque provider session reference.
- `backend/.env.example` — 2Factor placeholders only.
- `frontend/src/pages/admin/AdminLoginPage.jsx` — WARESHOP branded responsive administration sign-in layout.

## Configuration

Set `TWOFACTOR_API_KEY` and `TWOFACTOR_OTP_TEMPLATE` privately in `backend/.env`; optionally set `TWOFACTOR_BASE_URL` (defaults to the current documented endpoint). Obtain the key and template from the 2Factor dashboard. Do not add them to frontend environment variables or source control.

## Security behavior

Production fails closed when 2Factor credentials are missing, a timeout occurs, or its response is unsuccessful. OTPs and provider responses are not logged; keys never appear in API responses. Existing IP rate limits, 60-second resend cooldown, five-attempt limit, five-minute OTP expiry, ten-minute authorization expiry, and one-time consumption remain enabled.

## Verification

Frontend production build and backend syntax checks were run. Real 2Factor SMS integration was not executed because no credentials were supplied, so delivery is not claimed as verified. Configure a private 2Factor account and test mobile number before release.

# WARESHOP Provider OTP and category-request workflow

## Reused foundation

The implementation retains the existing Express app, rate limiting, admin auth middleware, Lead/Provider models, upload middleware, and dynamic Category model/API. Administrator authentication is unchanged.

## New server components

- `OtpChallenge` stores only SHA-256 OTP and authorization-token hashes, expiry, attempts, and consumption state.
- `ProviderAccount` binds a verified mobile number to the PROVIDER role.
- `CustomCategoryRequest` tracks a provider application's requested category independently of category and provider approval.
- `/api/v1/provider-auth/otp/request`, `/otp/verify`, and `/register` provide the mandatory mobile-verification sequence.

## OTP controls

- Indian mobile validation, cryptographically generated six-digit values, five-minute expiry, five-attempt cap, one-minute resend cooldown, and endpoint rate limits.
- OTP values are never persisted or logged. Development responses may contain the OTP only outside production; production refuses delivery unless `SMS_API_URL` is configured.
- A ten-minute, hash-backed authorization is atomically consumed at account registration. Partner applications additionally require the resulting provider account and matching verified phone.

## Category requests and review

Providers select an active category from `GET /api/v1/categories` or choose Other. Other creates a PENDING custom request after the verified application is stored. Admin-only request endpoints list and review requests; review can approve/create/reuse an active category, map to an existing category, or reject with a mandatory reason. Category review does not verify or publish the provider.

## Test evidence

- `node --check` was used for new backend modules.
- `npm run build` completed successfully in `frontend` after the implementation.

## External configuration

Implement and configure a provider-specific outbound SMS adapter before production. The current production guard intentionally fails OTP delivery rather than pretending to send an SMS. Configure MongoDB and production CORS as already documented.

# KONNEVIA Backend Regression Investigation Report

Prepared: 13 November 2026 (Asia/Kolkata)

## Evidence and root cause

The two failing suites are HTTP clients, not self-contained integration tests. Neither starts an application, provisions an isolated administrator, resets rate-limit state, nor provisions an isolated database. They target a process already listening on the environment-configured port.

The production-upgrade suite reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env`. The local configured password does not match its legacy fixture password, while `ADMIN_AUTO_ROTATE_PASSWORD` is disabled. `authService.bootstrapAdmin()` intentionally does not overwrite an existing administrator unless rotation is explicitly requested. Its rejected login and every protected-route failure are therefore expected from the unmanaged target process, not proof of a broken password verifier or session middleware.

The Admin MVP suite had a separate defect: it hard-coded legacy credentials instead of reading the configured fixture credentials. It also reused the externally managed process. Its 429 occurred at the public partner endpoint, which has a production limiter of ten submissions per 15 minutes per IP; limiter state can be consumed by earlier suites or manual activity on the same process. The subsequent missing application, approval, publication, public-provider, and sitemap failures are cascading failures after that rejected submission.

## Failure inventory

| Suite | Failed assertion(s) | Actual result | Root cause |
| --- | --- | --- | --- |
| Production upgrade | Valid login; authenticated identity, dashboard, application, approval, publishing, enquiry, activity, and logout flows | Login returned 401; protected requests returned 401/404 | Existing admin account was not rotated to the environment fixture; later assertions cascaded from missing token/application. |
| Admin MVP | Partner submission | 429 | Shared IP limiter state on an unmanaged server. |
| Admin MVP | Pending application, approval, provider edit/public listing/profile, sitemap | Missing application, 500, or 404 | Cascading after the 429; the test then uses unset identifiers. |

The password hashing, token validation, and public visibility gates were inspected. No evidence was found that they are defective. The production limiter remains enabled and unchanged.

## Safe fixes applied

- `test-admin-mvp.cjs` now reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from its environment instead of embedding legacy fixture credentials.
- `test-server.js` is now a guarded test-only server. It refuses to run unless `NODE_ENV=test` and the configured MongoDB database name contains `test`; it then force-provisions the configured test administrator only in that isolated database.
- `src/config/env.js` recognizes `backend/.env.test` only when the process is explicitly started with `NODE_ENV=test`.
- Added `backend/.env.test.example` and the `npm run test:server` script. The example contains placeholders only.

No production authentication, authorization, rate-limit, provider workflow, database schema, or API contract was weakened or changed.

## Running the isolated workflow

Create `backend/.env.test` from the example with a dedicated MongoDB database whose name includes `test`. In one terminal, start the isolated server with `NODE_ENV=test` and `npm run test:server`. In another terminal, load the same test environment and run each HTTP suite against that server. `npm run test:all` now includes the Phase 4.1 script after the HTTP, Phase 5.2, and SEO suites. Do not point this workflow at any production database.

## Verification

- Before this investigation: frontend build passed; Phase 5.2, SEO infrastructure, and Phase 4.1 suites passed.
- The old production-upgrade and Admin MVP results are invalid as release gates because their target server/database/credentials were not isolated.
- Re-running their HTTP workflows requires the dedicated MongoDB test database described above. It has not been attempted against the configured non-test database, by design.

## Remaining blocker

Provide a dedicated MongoDB test database and test-only credentials, then run each suite against the guarded test server. No commit or push was performed; pre-existing staged repository-preparation changes were preserved.

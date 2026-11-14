# KONNEVIA Dedicated Test Environment Setup Report

Prepared: 13 November 2026 (Asia/Kolkata)

## Safety controls verified

- `backend/.env.test.example` contains placeholders only and describes a separate `konnevia_test` Atlas database.
- Root `.gitignore` ignores `backend/.env.test` while explicitly allowing `backend/.env.test.example`.
- `backend/testEnvironment.cjs` fails closed unless both `NODE_ENV=test` and the MongoDB URI database name contains `test` as a standalone `_` or `-` delimited token.
- `backend/test-server.js` repeats the URI check before connecting, then verifies `connection.connection.name` after connection and before force-provisioning the test administrator. This checks the actual MongoDB database selected by the server, not only an environment label.
- Test-only credential rotation can therefore only run after the connected database-name check succeeds. It cannot rotate an administrator in a non-test database through this runner.
- Integration scripts invoke the same guard before issuing HTTP requests or performing direct cleanup. The Admin MVP and SEO cleanup paths therefore cannot connect to or delete records from a non-test target.
- Production rate limits remain ten requests per fifteen minutes per IP. In `NODE_ENV=test` only, the limiters use a validated `x-konnevia-test-suite` key supplied by the HTTP suites, isolating their in-memory counters from one another. Requests without that header continue to use normal IP rate limiting.

## Atlas setup

1. In MongoDB Atlas, choose the intended project and cluster. Do not use a production-only cluster if your organization can provide a separate test cluster.
2. Create a database named `konnevia_test` (or another name with `test` as a separate `_` or `-` token).
3. Create a dedicated database user with access restricted to that test database. Do not reuse a production user where a scoped test user is available.
4. Add the development machine’s IP address to Atlas Network Access for testing, then remove broad temporary access rules when finished.
5. Copy the Atlas connection string locally. Keep it out of source control and logs.

## Local configuration

1. Copy `backend/.env.test.example` to `backend/.env.test`.
2. Replace every placeholder with test-only values. Use the Atlas URI for `konnevia_test`; use a unique test-only admin email, password, and JWT secret.
3. From `backend`, start the server with `NODE_ENV=test` in the process environment so the test file is selected. In PowerShell:

```powershell
$env:NODE_ENV = 'test'
npm run test:server
```

4. In a separate PowerShell session, set `NODE_ENV=test` and the same test-only environment values, then run:

```powershell
npm run test:all
```

`test:all` runs the production-upgrade, Admin MVP, Phase 5.2, SEO infrastructure, and Phase 4.1 suites. Do not run it against a development or production database.

## Cleanup policy

The affected suites delete only records they created, and their database access is now guarded by the dedicated-test check. Test data cleanup is permitted only after the URI passes that check; failure stops the suite before database access.

## Validation performed

- The current non-test local configuration was rejected by the guarded test server before it could connect or provision an administrator.
- Full regression execution has not occurred because a dedicated Atlas test database and matching local `.env.test` have not yet been configured.

## Remaining blocker

The owner must supply a dedicated Atlas test database and test-only credentials locally. Once configured, run `npm run test:server` and `npm run test:all` from `backend`; do not claim a green result until those commands finish successfully.

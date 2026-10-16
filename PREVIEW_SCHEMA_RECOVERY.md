# Preview CRM: schema readiness and safe recovery

## Incident observed on 2026-10-16

The Vercel deployment on branch `feat/mission2-customer-journey` returned
`PrismaClientKnownRequestError P2021` / PostgreSQL `42P01` for
`POST /api/session`, even though `GET /api/health` returned HTTP 200
on a Preview deployment. A PostgreSQL connection alone does not prove
that the CRM application's tables exist.

The login flow queries Prisma's `LoginBucket` first, then authenticates
using the administrator secret or `AppUser`. The existing
`scripts/vercel-build.mjs` deliberately runs database migrations only
for production, not for Preview.

## Implemented safe change

`GET /api/health` performs a **read-only** `to_regclass` check for
`LoginBucket`, `AppUser`, `Customer` and `_proclair_migrations`.
It returns HTTP **503** and `{"status":"degraded","database":"schema_incomplete"}`
if any of these are missing. The response has `Cache-Control: no-store`.
A successful check means only that these representative tables exist;
it is **not** evidence that every migration is current or that the CRM
works end to end. No database credentials or table contents are returned.

## How to restore the isolated Preview environment

1. Confirm that `PROCLAIR_PREVIEW_DATABASE_URL` really points to a
   **dedicated Preview database**, not a production endpoint or database.
   Do not rely on the environment-variable name as proof of isolation.
2. Take and verify a restorable backup/snapshot of that **Preview** DB.
3. In an authorized administrative shell, inspect
   `"_proclair_migrations"` and the tables present. Compare the
   migrations already recorded with the `prisma/migrations` directories
   in the exact release commit. Investigate any checksum mismatch.
4. Only when the destination and backup have been independently verified,
   run `scripts/migrate.cjs` with `DATABASE_URL` set to the Preview-only
   connection. This script is forward-only; it changes the chosen database.
   **Do not pass production DATABASE_URL or DIRECT_DATABASE_URL.**
5. On the target Preview commit, check that `GET /api/health` now returns
   HTTP 200. Verify login on a test account and read-only CRM screens;
   inspect logs for new P2021/P2022 errors.
6. Repeat representative authenticated journeys on an isolated test data
   set. Do not send real texts or process real payments for testing.

Do not add automatic Preview migrations or allow Preview to fall back to
production credentials as a workaround.

## Follow-on acceptance gaps

- Count reconciliation against Rotor: customers, jobs, pins, messages,
  quotes, invoices and payments; verify pagination and duplicates.
- Google Maps credentials and real map rendering, including mobile.
- Signed contracts and representative visit/calendar flows.
- Stripe remains test-only in the code. Payments must not be represented
  as live or reconciled into real accounting without verified webhooks.
- Twilio outbound messaging and calls remain disabled unless explicitly
  configured and consent requirements are met.
- OMEGA supervisor does not perform external customer-facing actions;
  test idempotency and staff permissions before changing that behavior.
- Full backup restoration, operational monitoring and end-to-end user
  acceptance are separate release criteria.

# Phase 9 — Staging Edge Environment Readiness Report

## Status

**PASS — EDGE ENV STATIC READINESS VERIFIED**

This assessment is static/local only. No Edge Function was deployed or remotely invoked, no secret was set, and no database or migration operation was performed.

## Platform Default Environment

Supabase documents that hosted Edge Functions receive these platform-managed variables by default:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEYS` as a JSON map of named secret keys
- `SUPABASE_PUBLISHABLE_KEYS` as a JSON map of named publishable keys
- legacy `SUPABASE_SERVICE_ROLE_KEY`

Custom secret names beginning with `SUPABASE_` are platform-reserved and must not be created manually.

References:

- <https://supabase.com/docs/guides/functions/secrets>
- <https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys>
- <https://supabase.com/docs/guides/functions/limits>

`PLATFORM_DEFAULT_ENV_STATIC_EXPECTATION = VERIFIED_BY_PLATFORM_DOCS`

`HOSTED_RUNTIME_ENV = NOT YET EXECUTED`

The absence of platform-managed variables from `supabase secrets list` is not evidence that the hosted runtime lacks them. That command lists user-configured secrets; hosted runtime confirmation remains a later Gate B deployment/invocation activity.

## Admin Database Client Strategy

`supabase/functions/api/db.ts` obtains the validated URL and admin key exclusively through `getEdgeConfig()` and creates a non-persistent Supabase client.

The resolver in `supabase/functions/api/environment.ts` now uses this order:

1. Require `SUPABASE_URL`.
2. If `SUPABASE_SECRET_KEYS` is present, parse it as JSON and require a non-empty string at `default`.
3. Only when the new key map is absent, use non-empty `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback.
4. Otherwise fail closed before the client is created.

It never uses `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, browser runtime configuration, or hardcoded keys for admin access.

## Fail-Closed and Malformed JSON Behavior

- Missing `SUPABASE_URL`: `EDGE_CONFIG_MISSING: SUPABASE_URL`.
- Both admin key sources missing: `EDGE_CONFIG_MISSING: SUPABASE_SECRET_KEYS_OR_SUPABASE_SERVICE_ROLE_KEY`.
- Malformed `SUPABASE_SECRET_KEYS`: `EDGE_CONFIG_INVALID: SUPABASE_SECRET_KEYS`.
- Missing/blank `SUPABASE_SECRET_KEYS.default`: `EDGE_CONFIG_INVALID: SUPABASE_SECRET_KEYS.default`.
- A malformed new key map does not silently downgrade to the legacy key.
- Error messages identify only the configuration field and never include secret content.

## Synthetic Test Coverage

| Scenario | Expected result |
| --- | --- |
| `SUPABASE_URL` plus `SUPABASE_SECRET_KEYS.default` | PASS; new key selected |
| New key map absent plus legacy service-role key | PASS; legacy fallback selected |
| Both admin key sources missing | FAIL CLOSED |
| New key map malformed, even with legacy present | FAIL CLOSED |
| Publishable/anon-style keys only | FAIL CLOSED |
| `SUPABASE_URL` missing | FAIL CLOSED |

All test values are synthetic. No real Supabase secret value was added or printed.

Test results:

- `npm test`: PASS — 27/27.
- `npx deno-bin@2.2.7 test supabase/functions/api/environment_test.ts`: PASS — 10/10.
- `npx deno-bin@2.2.7 check supabase/functions/api/index.ts`: PASS.

## Environment Isolation Regression

The existing staging validation remains in place:

- `MEDWELL_ENV=staging` is required for Staging.
- Firebase Production project `medwell-clinic-system` is rejected.
- Supabase Production ref `rubqdcvwrwatxdrtfxkg` is rejected.
- Staging origins must match the selected Staging Firebase project.
- Production origins are rejected from Staging.

## Deployment State

- Edge deployment: NOT PERFORMED.
- Remote invocation: NOT PERFORMED.
- Remote secrets update: NOT PERFORMED.
- Remote SQL/schema/data operation: NOT PERFORMED.
- Gate B execution: NOT STARTED.

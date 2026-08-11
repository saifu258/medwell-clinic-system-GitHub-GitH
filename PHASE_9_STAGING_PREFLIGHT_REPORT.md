# Phase 9 — Staging Preflight Report

## Status

**PASS — ENVIRONMENT ISOLATION READY FOR GATE A RERUN**

The owner-supplied Firebase Web App public configuration and Supabase ref/URL are distinct from Production, internally consistent, and accepted. The positive preflight passed without printing secret values.

## Required Versus Received

| Required | Received | Accepted? |
| --- | --- | --- |
| `STAGING_FIREBASE_PROJECT_ID` | `medwell-clinic-staging` | Yes |
| `STAGING_SUPABASE_PROJECT_REF` | `mrgjpgcppvikyrtaspuf` | Yes |
| `STAGING_SUPABASE_URL` | `https://mrgjpgcppvikyrtaspuf.supabase.co` | Yes |
| `STAGING_SUPABASE_REGION` | `ap-southeast-1` | Yes |
| Firebase Web App public config | Owner supplied | Yes |
| Approved Staging origins | `medwell-clinic-staging.web.app` and `medwell-clinic-staging.firebaseapp.com` | Yes |

The protected values `medwell-clinic-system` and `rubqdcvwrwatxdrtfxkg` remain forbidden as Staging values.

## Preflight Implementation

`scripts/staging-preflight.mjs` verifies all of the following without printing secret values:

1. Manifest environment is `staging`.
2. Manifest Firebase project equals the trusted expected Firebase project.
3. Firebase target equals the trusted expected project.
4. Runtime public Firebase config equals the expected project.
5. Manifest/runtime Supabase ref and API host equal the trusted expected ref.
6. Edge `MEDWELL_ENV`, `FIREBASE_PROJECT_ID`, `SUPABASE_URL`, and `ALLOWED_ORIGINS` agree with the manifest.
7. Protected Production Firebase and Supabase identities are not selected.
8. Allowed origins belong only to the selected Staging Firebase project.

## Local Results

| Test | Result |
| --- | --- |
| Owner identity separation | PASS — Firebase ID and Supabase ref differ from Production |
| Supabase URL hostname/ref comparison | PASS |
| Actual owner Staging positive preflight | PASS |
| Staging runtime contains only selected Staging identities | PASS |
| Production runtime restored after preflight | PASS |
| Synthetic isolated architecture self-test | PASS |
| Protected Production Firebase selected as Staging | FAIL CLOSED |
| Protected Production Supabase selected as Staging | FAIL CLOSED |
| Staging Supabase API/ref mismatch | FAIL CLOSED in unit validation |
| Staging authDomain/project mismatch | FAIL CLOSED in unit validation |
| Staging origin/project mismatch | FAIL CLOSED in unit and Edge validation |

Synthetic values remain limited to ignored negative-test fixtures. The positive result used the real owner-approved Staging manifest.

## Secret-Name Readiness

| Secret/config name | Status |
| --- | --- |
| `MEDWELL_ENV` | `TO_BE_CONFIGURED` |
| `FIREBASE_PROJECT_ID` | `TO_BE_CONFIGURED` |
| `ALLOWED_ORIGINS` | `TO_BE_CONFIGURED` |
| `SUPABASE_URL` | `TO_BE_CONFIGURED` |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS` | `TO_BE_CONFIGURED` |

No values were set remotely or included in public manifests.

## Next Authorized Step

Rerun Phase 9 Gate A using only approved read-only identity/schema/history verification against the isolated Staging environment. Remote secret configuration, backup destinations, deployment, migration, and Gate B remain separately unauthorized.

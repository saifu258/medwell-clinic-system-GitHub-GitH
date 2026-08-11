# Phase 9 Gate A — Environment Identity Report

## Status

**FAIL — BLOCKED**

Gate A was performed as a read-only safety and reconciliation review. No deployment, remote migration, remote SQL, secret update, Git staging, commit, push, or tag was performed.

## Baseline

| Check | Evidence | Result |
| --- | --- | --- |
| Commit | `e21a85a49271d3abb6fda05bed2f63b2e223f229` (`docs: complete phase 8 integration and staging readiness review`) | PASS |
| Branch | `main` | PASS |
| Remote parity | `HEAD` equals `origin/main` at `e21a85a49271d3abb6fda05bed2f63b2e223f229` | PASS |
| Working tree at entry | Clean | PASS |

## Supabase Identity

| Item | Evidence | Classification |
| --- | --- | --- |
| Repository link | `supabase/.temp/project-ref` = `rubqdcvwrwatxdrtfxkg` | LINKED |
| Control-plane project | Name `MEDWELL Clinic System`, ref `rubqdcvwrwatxdrtfxkg`, region `ap-southeast-1`, status `ACTIVE_HEALTHY` | STATIC/CONTROL-PLANE VERIFIED |
| Frontend API target | `public/assets/js/supabase-config.js` targets `https://rubqdcvwrwatxdrtfxkg.supabase.co/functions/v1/api` | STATIC VERIFIED |
| Existing runtime documentation | README and production reports map the production Firebase website to the same Edge API ref | STATIC VERIFIED |
| Staging label | The project name and link metadata do not identify this project as Staging; prior documents also use it for the live production frontend | **AMBIGUOUS** |

`STAGING_SUPABASE_PROJECT_REF`: **NOT VERIFIED**

`LINKED_PROJECT_REF`: `rubqdcvwrwatxdrtfxkg`

Supabase environment classification: **AMBIGUOUS**

The known ref matches the Phase 9 prompt, but it is also the API endpoint configured for the live `medwell-clinic-system.web.app` frontend. That conflict prevents classifying it as a safely isolated Staging database.

## Firebase Identity

| Item | Configured value | Evidence |
| --- | --- | --- |
| Firebase default project | `medwell-clinic-system` | `.firebaserc` |
| Frontend Auth project | `medwell-clinic-system` | `public/assets/js/firebase-config.js` |
| Edge token issuer/audience project | `medwell-clinic-system` | `supabase/functions/api/auth.ts` |
| Hosting/auth domain | `medwell-clinic-system.firebaseapp.com` / `medwell-clinic-system.web.app` | Firebase config, README, CSP |

`STAGING_FIREBASE_PROJECT_ID`: **NOT VERIFIED**

Firebase environment classification: **VERIFIED_NON_STAGING**

The repository is internally consistent around `medwell-clinic-system`, but that identity is the live production identity already documented by the repository. Neither prior staging candidate (`medwell-dev` nor `medwell-clinic-staging`) is configured.

## Endpoint Mapping and Crossover Audit

| Frontend | Firebase Auth | Edge API | Supabase target | Result |
| --- | --- | --- | --- | --- |
| `medwell-clinic-system.web.app` | `medwell-clinic-system` | `rubqdcvwrwatxdrtfxkg.supabase.co/functions/v1/api` | `rubqdcvwrwatxdrtfxkg` | Production-shaped mapping; not isolated Staging |
| Local Firebase/Supabase config | Local defaults in `firebase.json` / `supabase/config.toml` | Public JS still points to remote ref | Remote linked project | Development-to-remote crossover risk unless explicitly overridden |

The Edge verifier and frontend Auth project match each other, but both are production-configured. The frontend API target and linked Supabase project also match each other, but the target is not proven to be Staging.

## Production Protection Register

| Identifier | Status |
| --- | --- |
| `PRODUCTION_FIREBASE_PROJECT_ID` | `medwell-clinic-system` — verified from live URL and repository deployment documentation |
| `PRODUCTION_SUPABASE_PROJECT_REF` | **PRODUCTION_IDENTITY_NOT_VERIFIED**; `rubqdcvwrwatxdrtfxkg` is production-associated but cannot be declared exclusively Production or Staging from safe identity evidence |

**PRODUCTION OPERATIONS = PROHIBITED**

| Operation | Allowed Target |
| --- | --- |
| Database Migration | Verified Staging only |
| Edge Deploy | Verified Staging only |
| Firebase Deploy | Verified Staging only |
| Production DB | PROHIBITED |
| Production Edge | PROHIBITED |
| Production Firebase | PROHIBITED |

## Tool Availability (Rechecked 2026-08-10, Asia/Bangkok)

| Tool | Exact result |
| --- | --- |
| Docker CLI | `Docker version 29.5.3, build d1c06ef` |
| Docker daemon | UNAVAILABLE — named pipe `dockerDesktopLinuxEngine` was not found |
| Node | `v24.14.0` |
| Git | `2.55.0.windows.2` |
| Supabase CLI | `2.113.0` via `npx supabase --version` |
| `pg_dump` | NOT FOUND in PATH |
| `psql` | NOT FOUND in PATH |
| 7-Zip | NOT FOUND in PATH |
| SHA-256 | AVAILABLE through PowerShell `Get-FileHash` |

## Remote Inspection Boundary

Project identity was read through non-mutating local/control-plane metadata only. Remote database schema, rows, RLS policies, function grants, and migration history were not queried because the linked ref may be the production backend. No patient-level data or PII was accessed or printed.

## Gate A Identity Conclusion

The repository does not define an isolated Firebase Staging identity, and the linked Supabase identity is ambiguous due to its use by the production-configured frontend. Environment identity requirements for Gate B are not met.

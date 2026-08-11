# Phase 9 — Environment Configuration Implementation

## Final Status

**PASS — ENVIRONMENT ISOLATION READY FOR GATE A RERUN**

The local fail-closed environment architecture is implemented and tested. The owner-supplied Staging Firebase Web App configuration, Supabase identity, and project-scoped origins pass the positive preflight. Gate A is eligible for its read-only rerun; Gate B remains unauthorized.

## Identity Resolution

| Identity | Supplied value | Result |
| --- | --- | --- |
| Staging Firebase project ID | `medwell-clinic-staging` | Accepted; distinct from Production |
| Staging Supabase project ref | `mrgjpgcppvikyrtaspuf` | Accepted; distinct from Production |
| Staging Supabase URL | `https://mrgjpgcppvikyrtaspuf.supabase.co` | Accepted; hostname matches ref |
| Staging Supabase region | `ap-southeast-1` | Recorded from owner |
| Protected Production Firebase | `medwell-clinic-system` | Protected |
| Protected Production Supabase | `rubqdcvwrwatxdrtfxkg` | Protected |

There is no Production identity collision.

## Manifest Architecture

Reviewable manifests now exist under `config/environments/`:

- `development.json`: incomplete and fail closed until the owner selects local Firebase settings.
- `staging.json`: contains the verified Firebase Web App public fields, Supabase ref/URL/region, and project-scoped Hosting/Auth origins.
- `production.json`: explicitly preserves the current public Production Firebase and Supabase identities.

Only public client identifiers are allowed. Server keys, database credentials, private keys, access tokens, and refresh tokens are excluded.

## Controlled Generator

`npm run build:config -- --environment <name>` validates exactly one manifest before atomically replacing `public/assets/js/runtime-config.js`.

- Explicit Production generation: PASS and preserves current behavior.
- Explicit Staging generation: PASS with trusted expected identity variables.
- Owner identity positive preflight: PASS.
- Explicit Production regeneration after the preflight: PASS, restoring the existing working default.
- Environment cannot be selected by query string, browser storage, request body, request header, or URL fragment.
- Staging generation additionally requires trusted operator variables `STAGING_FIREBASE_PROJECT_ID` and `STAGING_SUPABASE_PROJECT_REF` to match the manifest.

## Frontend Consolidation

`firebase-config.js` and `supabase-config.js` are compatibility adapters over the generated runtime module. They validate project/domain and Supabase host/ref consistency at module load. The generated file currently represents Production intentionally so the existing deployed behavior is preserved; nothing was deployed.

## Edge Startup Configuration

The Edge API now requires server-side:

| Name | State |
| --- | --- |
| `MEDWELL_ENV` | `TO_BE_CONFIGURED` |
| `FIREBASE_PROJECT_ID` | `TO_BE_CONFIGURED` |
| `ALLOWED_ORIGINS` | `TO_BE_CONFIGURED` |
| `SUPABASE_URL` | `TO_BE_CONFIGURED` |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS.default` | `TO_BE_CONFIGURED` |

The Firebase JWT issuer and audience now derive only from server-side `FIREBASE_PROJECT_ID`. Missing variables or key material terminate Edge startup. Staging rejects the protected Production Firebase project, protected Supabase ref, Production origins, non-HTTPS hosted URLs, and origins not belonging to the selected Staging Firebase project.

Current Supabase documentation confirms that `SUPABASE_SECRET_KEYS` is server-only key material and must never be used in browser code. This implementation supports its `default` entry and the legacy `SUPABASE_SERVICE_ROLE_KEY` without printing either value.

## CORS Isolation

- No wildcard.
- No localhost in Production.
- Staging origins must match the selected Staging Firebase project.
- An unapproved browser origin receives `403 CORS_ORIGIN_DENIED` with no Production `Access-Control-Allow-Origin` fallback.
- Requests without an Origin header remain available to trusted non-browser clients.

## Explicit Targets

`.firebaserc` has explicit `production` and owner-approved `staging` aliases while retaining the existing default to preserve current behavior. Future deployment commands must use an explicit alias/project; this phase performed no Firebase command that changed state.

The repository was not relinked to Supabase. Future remote action must compare the actual target ref with the owner-approved Staging ref immediately before mutation.

## Canonical Baseline and Backup Evidence

- Candidate baseline SHA-256: `430B276DCF9783AF715AC7EF0B6FCD4F1C4036AAEF936F6BFC55E63A0FD979E1` — unchanged.
- `CANONICAL_BASELINE_DETERMINISTIC = YES` — existing evidence retained.
- RLS: 21/21 required tables.
- Privileged RPC security: 12/12.
- Firebase actor identifiers: `text` compatible.
- Seed contains no real users, patients, clinical rows, or financial rows.
- Local encrypted backup/restore rehearsal: completed previously.
- Remote Staging backup: pending a verified Staging connection and approved primary/secondary destinations.

## Verification Results

| Check | Result |
| --- | --- |
| `npm test` | PASS — 27/27 (18 Functions tests + 9 root unit tests) |
| Environment manifest tests within root unit suite | PASS — 7/7 |
| `npx deno-bin@2.2.7 check supabase/functions/api/index.ts` | PASS |
| Edge environment Deno tests | PASS — 5/5 |
| Google login/runtime-config Playwright regression | PASS — 4/4 |
| Production runtime generation | PASS |
| Real Staging manifest validation | PASS |
| Owner identity comparison and Supabase host/ref match | PASS |
| Owner positive preflight | PASS |
| Synthetic isolated preflight mechanism | PASS — not owner identity evidence |
| Firebase Production-collision negative test | FAIL CLOSED as required |
| Supabase Production-collision negative test | FAIL CLOSED as required |
| Static secret scan | PASS; no real private/server credential added |

The first Playwright attempt could not start because `python` was absent from PATH. The same test was rerun with the bundled workspace Python path and passed 4/4. A Firebase CLI help lookup through `npx` timed out without changing local or remote configuration.

A read-only request to the public Firebase Hosting reserved configuration URL returned HTTP 404 before the owner supplied the Web App configuration. The subsequently supplied public values were validated directly; no value was copied from Production.

## Safety

No deployment, remote SQL, migration push/repair, schema inspection, data mutation, remote secret operation, project relink, Git staging, commit, or push occurred. Gate B remains unauthorized.

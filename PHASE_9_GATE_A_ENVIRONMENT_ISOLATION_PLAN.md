# Phase 9 Gate A Remediation — Environment Isolation Plan

## Status

**READY_FOR_OWNER_SETUP**

This document defines the configuration boundary required before Gate A can be repeated. It does not create projects, change current production defaults, deploy, relink Supabase, or set secrets.

## Protected Current Configuration

The following current production-shaped identifiers are protected and must not be overwritten or repurposed:

- Firebase: `medwell-clinic-system`
- Supabase: `rubqdcvwrwatxdrtfxkg`

The Supabase identifier remains ownership-ambiguous from Gate A evidence, but it is used by the production-configured frontend and must therefore be treated as Production-protected until the owner establishes otherwise.

## Explicit Three-Environment Model

| Variable | Development | Staging | Production |
| --- | --- | --- | --- |
| `MEDWELL_ENV` | `development` | `staging` | `production` |
| `DEV_FIREBASE_PROJECT_ID` | `UNASSIGNED / NOT_VERIFIED` | — | — |
| `STAGING_FIREBASE_PROJECT_ID` | — | `UNASSIGNED / NOT_VERIFIED` | — |
| `PRODUCTION_FIREBASE_PROJECT_ID` | — | — | `medwell-clinic-system` |
| `DEV_SUPABASE_PROJECT_REF` | `UNASSIGNED / NOT_VERIFIED`; local stack preferred | — | — |
| `STAGING_SUPABASE_PROJECT_REF` | — | `UNASSIGNED / NOT_VERIFIED` | — |
| `PRODUCTION_SUPABASE_PROJECT_REF` | — | — | `rubqdcvwrwatxdrtfxkg` (protected current default; ownership confirmation still required) |

Repository and account inspection found no locally verified Staging identity. Historical names `medwell-dev` and `medwell-clinic-staging` do not occur in active configuration and were not verified as existing projects.

Result: **STAGING_PROJECT_CREATION_OR_OWNER_CONFIRMATION_REQUIRED**

## Current Configuration Audit

| File | Current behavior | Risk |
| --- | --- | --- |
| `.firebaserc` | Default is `medwell-clinic-system` | An unqualified deploy targets Production |
| `.firebaserc.example` | Single generic placeholder | Does not enforce environment separation |
| `firebase.json` | One hosting configuration and production Auth domain in CSP | No Staging target/profile |
| `public/assets/js/firebase-config.js` | Production Firebase web config is hardcoded | Staging build can authenticate against Production |
| `public/assets/js/supabase-config.js` | Production-associated Edge URL is hardcoded | Staging frontend can silently call Production API |
| `supabase/functions/api/auth.ts` | Firebase issuer/audience hardcoded to `medwell-clinic-system` | Staging tokens cannot be verified independently |
| `supabase/functions/api/index.ts` | CORS origins and fallback origin are production hardcoded | Staging origin is not independently controlled |

## Recommended Minimal Configuration Architecture

### 1. Environment manifests

After owner confirmation, create explicit non-secret manifests outside public runtime code:

```text
config/environments/development.json
config/environments/staging.json
config/environments/production.json
```

Each manifest should contain only public identifiers and endpoints:

```text
environment
firebaseProjectId
firebaseAuthDomain
firebaseStorageBucket
firebaseMessagingSenderId
firebaseAppId
firebaseMeasurementId (optional)
supabaseProjectRef
supabaseApiUrl
firebaseHostingProjectId
allowedOrigins
```

No service-role key, database password, private key, or token belongs in these files.

### 2. Frontend build output

Generate one `public/assets/js/runtime-config.js` from exactly one selected manifest during a controlled build. The generated module should export both Firebase public config and the Edge API URL. Existing `firebase-config.js` and `supabase-config.js` remain unchanged until the owner approves implementation.

Required build invocation concept:

```text
npm run build:config -- --environment staging
```

The generator must fail when any required Staging field is missing, when the API hostname does not contain the approved Staging Supabase ref, or when the Firebase project equals the protected Production project. It must never copy Production values as defaults.

### 3. Edge configuration

Move environment identity from code into server-controlled values:

| Name | Requirement |
| --- | --- |
| `MEDWELL_ENV` | Required; one of `development`, `staging`, `production` |
| `FIREBASE_PROJECT_ID` | Required; used for JWT issuer and audience |
| `ALLOWED_ORIGINS` | Required JSON/list; no permissive wildcard |
| `SUPABASE_URL` | Required platform/runtime value |
| `SUPABASE_SERVICE_ROLE_KEY` | Required legacy single-key path, server-only; or use the key map below |
| `SUPABASE_SECRET_KEYS` | Supported alternative key-map path; server-only |

`FIREBASE_PROJECT_ID` must be read from Edge environment configuration and validated at startup. It must never be accepted from request headers, body, query parameters, or frontend storage.

The Edge function must fail startup/health readiness if the project ID or allowed origins are missing. Staging must reject `medwell-clinic-system` and the protected production origins. Production must reject unassigned/Staging identifiers.

### 4. Firebase aliases and hosting targets

After the owner supplies real IDs, define explicit aliases such as `staging` and `production`. Do not rely on `default` for release commands. Every future command must include the selected project explicitly and must run an identity preflight immediately before deployment.

The current `.firebaserc` remains unchanged in this remediation.

## Fail-Closed Rules

1. A Staging build fails if `STAGING_FIREBASE_PROJECT_ID` or `STAGING_SUPABASE_PROJECT_REF` is unassigned.
2. A Staging build fails if either identifier equals a protected Production identifier.
3. The generated API URL must be derived from and match the approved Staging ref; arbitrary URLs are rejected.
4. The generated Firebase Auth domain must match the approved Staging Firebase project.
5. Edge startup fails if `FIREBASE_PROJECT_ID`, `SUPABASE_URL`, server key material, or `ALLOWED_ORIGINS` is absent.
6. No environment may fall back to Production config.
7. Query strings, local storage, and user input cannot select environment identity.
8. Production deploy commands may never be used as defaults or examples in Staging automation.

## Deployment Protection Rules

Before any future Gate B command, an independent preflight must print only non-secret identity fields and require exact equality with owner-approved Staging IDs:

```text
MEDWELL_ENV == staging
Firebase target == approved STAGING_FIREBASE_PROJECT_ID
Firebase web config projectId == approved STAGING_FIREBASE_PROJECT_ID
Edge FIREBASE_PROJECT_ID == approved STAGING_FIREBASE_PROJECT_ID
Supabase CLI target == approved STAGING_SUPABASE_PROJECT_REF
Frontend API hostname contains approved STAGING_SUPABASE_PROJECT_REF
Neither identifier equals a protected Production identifier
```

Gate B commands must include explicit Staging project arguments. Unqualified `firebase deploy`, implicit Supabase links, and inferred defaults are prohibited.

## Owner Setup Required

1. Confirm or create an isolated Firebase Staging project and provide its project ID and public web-app config.
2. Confirm or create an isolated Supabase Staging project and provide its ref.
3. Confirm whether `rubqdcvwrwatxdrtfxkg` is Production; until then it remains protected.
4. Approve the environment-manifest/runtime-config architecture.
5. Approve moving Firebase issuer/audience and CORS identities to Edge environment values in a later source-change phase.
6. Approve explicit Firebase aliases/hosting targets and release preflight automation.

## No Mutation Confirmation

No source configuration, Firebase project, Supabase project, secret, remote database, staging data, or production data was changed.

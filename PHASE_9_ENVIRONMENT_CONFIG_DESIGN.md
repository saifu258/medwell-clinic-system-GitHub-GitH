# Phase 9 — Environment Configuration Design

## Status

**LOCAL CANDIDATE IMPLEMENTED — PRODUCTION RUNTIME UNCHANGED**

Review candidates are under `phase9-baseline-candidate/config/environments/`. They are not imported by the application and were not deployed.

## Environment Manifests

| Environment | Firebase | Supabase | State |
| --- | --- | --- | --- |
| Development | `UNASSIGNED` | `LOCAL_ONLY` | Requires owner/local emulator selection before build integration |
| Staging | `UNASSIGNED` | `UNASSIGNED` | Deliberately incomplete and fail closed |
| Production | `medwell-clinic-system` | protected `rubqdcvwrwatxdrtfxkg` | Mirrors current production-shaped public config for review only |

Unknown Staging values were not invented. Production values were not copied into Staging.

## Local Validator

`validate-environment-config.mjs` validates a selected manifest without changing runtime code. Tests passed:

| Case | Expected | Actual |
| --- | --- | --- |
| Incomplete Staging | reject | reject |
| Staging using protected Production Firebase/Supabase | reject | reject |
| Staging API hostname not matching Staging ref | reject | reject |
| Current Production candidate | accept | accept |

The validator requires non-empty origins and required identifiers. For Staging, it also requires HTTPS and exact `<staging-ref>.supabase.co` hostname equality.

## Later Frontend Integration Plan

After owner supplies Staging IDs:

1. A controlled build selects exactly one manifest.
2. A generator validates it and produces one public runtime-config module.
3. Firebase public config and Edge API URL come from the same manifest.
4. Missing/mismatched Staging values terminate the build.
5. Query strings, local storage, browser input, and silent Production fallback cannot select environment.

Current `firebase-config.js` and `supabase-config.js` were not changed.

## Later Edge Firebase Auth Plan

Replace hardcoded server identity only in a separately reviewed source-change phase:

```text
MEDWELL_ENV
FIREBASE_PROJECT_ID
ALLOWED_ORIGINS
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS
```

`FIREBASE_PROJECT_ID` must be required at Edge startup and used exclusively for JWT issuer/audience. It must never come from client input. Staging must reject the protected Production Firebase ID.

## Allowed Origins Plan

- Parse server-controlled `ALLOWED_ORIGINS` as an explicit list.
- No wildcard and no default Production fallback.
- Development: localhost origins only.
- Staging: verified Staging Hosting/Auth origins only.
- Production: protected Production origins only.
- Missing/malformed list fails startup/readiness.

## Deployment Guard

Every later Gate B command must explicitly name the owner-approved Staging Firebase project and Supabase ref. A preflight must compare the manifest, generated frontend config, Edge `FIREBASE_PROJECT_ID`, allowed origins, API hostname, and CLI target and reject any protected Production identifier.

No Firebase/Supabase project was created, linked, configured remotely, or deployed in this phase.

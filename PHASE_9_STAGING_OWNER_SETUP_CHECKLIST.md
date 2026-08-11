# Phase 9 — Staging Owner Setup Checklist

Gate B remains unauthorized. Complete this checklist before repeating Gate A.

## Values Received in Gate A Rerun Preparation

- [x] `STAGING_FIREBASE_PROJECT_ID` — `medwell-clinic-staging`.
- [x] `STAGING_SUPABASE_PROJECT_REF` — `mrgjpgcppvikyrtaspuf`.
- [x] `STAGING_SUPABASE_URL` — `https://mrgjpgcppvikyrtaspuf.supabase.co`.
- [x] `STAGING_SUPABASE_REGION` — `ap-southeast-1`.
- [x] Protected Production Firebase recorded as `medwell-clinic-system`.
- [x] Protected Production Supabase recorded as `rubqdcvwrwatxdrtfxkg`.
- [x] Local fail-closed manifest/generator/Edge/preflight architecture implemented.
- [x] Synthetic preflight and Production-collision guards tested locally.
- [x] Real owner-identity positive preflight passed with the owner-supplied Firebase Web App configuration and Supabase identity.

## Isolated Projects

- [x] Create or confirm an isolated Firebase Staging project.
- [x] Record exact `STAGING_FIREBASE_PROJECT_ID`.
- [x] Create or confirm an isolated empty Supabase Staging project.
- [x] Record exact `STAGING_SUPABASE_PROJECT_REF` and region.
- [x] Confirm `medwell-clinic-system` is protected Production Firebase.
- [x] Confirm `rubqdcvwrwatxdrtfxkg` is protected Production Supabase.
- [x] Confirm neither Staging identifier equals a protected Production identifier.

## Firebase Staging

- [x] Create a Staging Firebase Web App.
- [x] Record public web config without Admin credentials.
- [ ] Configure authorized Staging domains.
- [x] Define an explicit Staging project alias.
- [x] Approve build-time environment selection and fail-closed validation.

## Supabase/Edge Staging

- [x] Keep the repository unlinked until a later approved Staging-link step.
- [x] Record required secret names only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS`, `FIREBASE_PROJECT_ID`, `MEDWELL_ENV`, `ALLOWED_ORIGINS`.
- [ ] Configure secret values later through an approved secret channel; never commit them.
- [x] Confirm Staging `FIREBASE_PROJECT_ID` and allowed origins are isolated.
- [x] Confirm Edge API hostname contains the exact Staging ref.

Secret/config name readiness — values must remain outside Git:

| Name | Status |
| --- | --- |
| `MEDWELL_ENV` | `TO_BE_CONFIGURED` |
| `FIREBASE_PROJECT_ID` | `TO_BE_CONFIGURED` |
| `ALLOWED_ORIGINS` | `TO_BE_CONFIGURED` |
| `SUPABASE_URL` | `TO_BE_CONFIGURED` |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS` | `TO_BE_CONFIGURED` |

## Canonical Baseline Review

- [ ] Review `phase9-baseline-candidate/manifest.json` and artifact hashes.
- [ ] Approve both function return-type bridges as baseline-generation mechanics.
- [ ] Approve Phase 7 actor UID `text` correction.
- [ ] Approve `passport_no` certificate correction.
- [ ] Approve explicit browser privilege hardening.
- [ ] Approve reference seed contents and confirm no bootstrap user is included.
- [ ] Approve migration epoch activation and historical archive/mapping strategy.

## Backup and Restore

- [ ] Install PostgreSQL 17 client tools (`pg_dump`, `psql`, `pg_restore`) on the operator workstation, or approve the tested containerized runbook.
- [ ] Approve primary restricted backup destination.
- [ ] Approve independent secondary encrypted destination.
- [ ] Approve retention, access, password-manager, and secure deletion policy.
- [ ] Complete Staging-only encrypted dump, SHA-256, archive integrity, and disposable restore evidence before any non-empty Staging migration.

## Gate A Rerun Evidence

- [ ] Baseline commit/branch/clean-tree check passes.
- [ ] Firebase and Supabase Staging identities are verified.
- [ ] Production/Staging mapping has no crossover.
- [ ] Read-only Staging migration history and actual schema metadata are reconciled.
- [ ] Required Edge secret names are present without exposing values.
- [ ] Candidate activation artifact repeats local reset/lint/RLS/RPC/smoke tests.
- [ ] Backup readiness is `READY`.
- [ ] Gate A explicitly authorizes whether Gate B may be proposed.

Do not deploy, relink, push migrations, or repair history merely by completing this checklist.

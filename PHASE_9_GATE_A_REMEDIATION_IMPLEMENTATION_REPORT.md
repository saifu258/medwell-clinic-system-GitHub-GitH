# Phase 9 Gate A Remediation Implementation — Local Only

## Final Status

**PASS — LOCAL BASELINE PROVEN**

This status proves the local zero-to-one baseline candidate only. Gate B is not authorized.

## Docker and Local Supabase/PostgreSQL

- Docker Desktop was started locally; client/server `29.5.3`
- Supabase PostgreSQL image `17.6.1.156`; server `17.6`
- All test database ports bound to `127.0.0.1` only
- Local PostgreSQL migration/reset/lint/dump/restore operations passed
- Full Supabase stack is not fully healthy because pre-existing Vector log collectors restart

## Current-Chain Replay

**FAIL — EXPECTED AND PROVEN**

Current timestamp order fails at Phase 3 because Phase 4 already created the same workflow RPC signature with an incompatible return type.

## Canonical Dependency-Order Build

**PASS** after two local-only signature bridges:

1. Drop Phase 3 workflow RPC before Phase 4 changes its return type.
2. Drop Phase 4 payment RPC before Phase 5 changes its return type.

Historical migrations remain unchanged.

## Phase 7 Actor-Type Correction

**PASS**

Lock owner and actor/admin parameters are `text`. Synthetic non-UUID Firebase UID insertion, audit use, and lock acquire/refresh/release all passed.

## Baseline Candidate

**CREATED AND VALIDATED** at `phase9-baseline-candidate/`.

- Schema separated from reference seed
- Manifest and immutable source hashes included
- No real users, patients, clinical/financial rows, certificates, or secrets
- Candidate baseline SHA-256: `430B276D...79E1`

## Blank Resets and Determinism

- Reset #1: PASS
- Reset #2: PASS
- Seed twice on each reset: PASS, no duplicates
- Schema hashes equal: YES
- Reference hashes equal: YES
- `CANONICAL_BASELINE_DETERMINISTIC = YES`

## RLS/RPC Security

- Required tables: 21/21 present, RLS enabled
- `anon` mutation: false on all required tables
- `authenticated` mutation: false on all required tables
- Required privileged RPCs: 12/12 present
- All 12: security definer, fixed search path, browser/public execute revoked, service role execute granted
- New-table privilege probe: browser mutation false

## Seed Separation

**PASS**

Only clinic settings, service, medicine, and diagnosis reference data are included. Historical bootstrap user and all sensitive/transactional classes are excluded.

## Schema Lint

Error-level lint: PASS. Recorded non-blocking unused-variable/parameter warnings remain; none were suppressed.

## Local Backup/Restore

**PASS using local container PostgreSQL 17 tooling**

- Custom dump created
- SHA-256 generated
- AES encrypted 7-Zip archive created and tested
- Extracted hash matched
- Disposable restore succeeded with a filtered platform-ACL restore list
- Restored security validation passed
- Normalized application metadata matched source

Host `pg_dump`, `psql`, and `pg_restore` remain unavailable and are an owner/operator condition for the preferred workstation runbook.

## Vector

**NON-BLOCKING FOR CORE DATABASE PROOF / LOCAL STACK NOT FULLY HEALTHY**

Vector exits after its Docker log source receives connection refused. It is not in the PostgreSQL schema/migration/backup path used by this rehearsal.

## Environment Config Candidate

- Development/Staging/Production review manifests created
- Staging values remain `UNASSIGNED`
- Local validator rejects incomplete Staging, protected Production IDs, and API/ref mismatch
- Separate local fixtures proved the protected Firebase ID guard, protected Supabase ref guard, and API/ref hostname guard independently
- Production runtime files and Edge code were not changed

## Owner Actions Remaining

1. Create/confirm isolated Firebase and Supabase Staging projects.
2. Confirm protected Production IDs.
3. Review and approve candidate baseline corrections and migration epoch activation.
4. Approve the environment-config/Edge source integration phase.
5. Approve backup destinations and operator runbook; install host PostgreSQL clients if required.
6. Repeat Gate A using actual Staging identities and read-only remote metadata.

## Files Created

- `PHASE_9_LOCAL_MIGRATION_REHEARSAL_REPORT.md`
- `PHASE_9_CANONICAL_BASELINE_DESIGN.md`
- `PHASE_9_ENVIRONMENT_CONFIG_DESIGN.md`
- `PHASE_9_STAGING_OWNER_SETUP_CHECKLIST.md`
- `PHASE_9_GATE_A_REMEDIATION_IMPLEMENTATION_REPORT.md`
- Review candidate files under `phase9-baseline-candidate/`
- Ignored disposable evidence under `supabase/.temp/phase9-baseline-build/`

## Remote/Production Safety

No remote SQL, migration, history repair, project creation/relink, secret operation, Edge/Firebase deployment, Staging mutation, Production mutation, Git staging, commit, or push occurred.

The five disposable synthetic PostgreSQL containers were removed after evidence capture. Pre-existing Supabase containers were not modified.

## Gate A Rerun

Gate A must be repeated after owner supplies real isolated Staging identifiers, approves the epoch activation artifact, and completes Staging backup/secret readiness. Gate B remains unauthorized.

# Phase 9 Gate A Remediation Report

## Status

**PASS WITH CONDITIONS — OWNER DECISIONS REQUIRED**

This status means the Gate A blockers now have explicit remediation designs and operator actions. It does not mean Gate B is ready.

## Environment Isolation

**READY_FOR_OWNER_SETUP**

- Three-environment variable model documented.
- Production-shaped defaults remain unchanged and protected.
- Staging build/Edge behavior is designed to fail closed.
- Frontend runtime config, Edge environment config, CORS, Firebase JWT verification, and explicit deployment targeting are separated in the plan.
- No verified Staging identifiers currently exist.

## Migration Order

**REMEDIATION_STRATEGY_PROPOSED**

Recommended strategy: owner-approved canonical baseline migration epoch for new environments, generated and verified in a disposable local build lane using dependency order, with immutable old migrations preserved for audit. A late Phase 9 migration alone is explicitly rejected.

Additional blocker identified: Phase 7 uses `uuid` actor IDs and FK against `users.uid text`, while Firebase UIDs are strings. The canonical baseline and any existing-database forward correction must use `text` consistently.

## Backup Tooling

**ACTION_REQUIRED**

- 7-Zip 26.02 is installed at `C:\Program Files\7-Zip\7z.exe`.
- SHA-256 is available.
- Host `pg_dump`, `psql`, and `pg_restore` are not installed/discoverable.
- Secure destinations and restore evidence are not approved.

## Docker

**READY**

Docker Desktop client/server 29.5.3 is responsive and local Supabase PostgreSQL 17 containers are running. Formal rehearsal was not executed. Restarting local Vector containers require review before accepting full local-stack health evidence.

## Staging Project

**OWNER_ACTION_REQUIRED**

`STAGING_PROJECT_CREATION_OR_OWNER_CONFIRMATION_REQUIRED`

Historical candidates were not found in active repository configuration and were not assumed valid.

## Firebase Staging

**OWNER_ACTION_REQUIRED**

The only configured Firebase project is the protected Production project `medwell-clinic-system`. Owner must confirm/create an isolated Staging Firebase project and public web-app configuration.

## Supabase Staging

**OWNER_ACTION_REQUIRED**

The repository remains linked to protected production-shaped ref `rubqdcvwrwatxdrtfxkg`. Owner must confirm/create a separate Staging ref. No relink was performed.

## Fresh DB Bootstrap

Strategy: build and verify a new canonical baseline migration epoch locally from:

1. Nine legacy migrations in timestamp order.
2. Phase 2.
3. Phase 3 before Phase 4.
4. Phases 4, 5, and 6.
5. Corrected Phase 7 intent with text Firebase actor IDs.
6. Separate reviewed, idempotent reference-data seed without real users or clinical/financial data.

Then prove two clean blank resets produce equivalent schema before the baseline is eligible for verified empty Staging.

## Existing DB Upgrade

Strategy: verify environment identity, back up and restore-test, reconcile migration history against actual metadata, then classify blank/baseline-equivalent/partial. Never replay baseline over an existing schema. Baseline-equivalent databases require an owner-approved migration-epoch history mapping; partial databases require forward-only reconciliation migrations.

## Profiles/Users Conclusion

`public.users` is the canonical application identity/profile table.

Evidence:

- Legacy schema creates `public.users(uid text primary key, ...)`.
- Phase 2 role claim returns/inserts `public.users`.
- All user FKs in Phases 2–6 reference `public.users`.
- Edge API reads and manages `users`.
- No application or migration creates or queries `public.profiles`.

Therefore `profiles` is obsolete/generic checklist terminology, not evidence of a missing table. Do not create `profiles`. Future checklists should say `users (canonical identity/profile table)`.

## Required Owner Actions

1. Confirm/create isolated Firebase and Supabase Staging projects and provide exact IDs.
2. Confirm the current production-shaped Supabase ref is Production-protected.
3. Approve the fail-closed environment-manifest/runtime-config architecture.
4. Approve server-side `FIREBASE_PROJECT_ID` and environment-specific CORS configuration.
5. Approve the canonical migration baseline epoch and preservation/archive policy for old migrations.
6. Approve Phase 7 actor type correction to `text`.
7. Decide whether future Staging is rebuilt empty or reconciled in place.
8. Install PostgreSQL 17 client tools and approve two secure backup destinations.
9. Approve local synthetic rehearsal and encrypted restore rehearsal.
10. Repeat Gate A after all evidence is available.

## Files Created

- `PHASE_9_GATE_A_ENVIRONMENT_ISOLATION_PLAN.md`
- `PHASE_9_GATE_A_MIGRATION_ORDER_REMEDIATION_PLAN.md`
- `PHASE_9_GATE_A_BACKUP_REMEDIATION_PLAN.md`
- `PHASE_9_GATE_A_REMEDIATION_REPORT.md`

No application source or existing Gate A report was modified.

## No Remote Mutation Confirmation

Confirmed: no remote SQL, migration, `db push`, history repair, project creation, project relink, secret change, Edge deployment, Firebase deployment, staging-data change, or production-data change occurred.

## Git Status

The four remediation documents and the four prior Gate A documents remain untracked for owner review. Nothing was staged, committed, pushed, or tagged.

## Gate B

**NOT READY.** A new Gate A run must verify actual identities, schema/history, local migration rehearsal, backup/restore evidence, and secret-name readiness before Gate B can be proposed.

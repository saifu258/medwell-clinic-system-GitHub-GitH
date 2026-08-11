# Phase 9 — Local Migration Rehearsal Report

## Status

**PASS — LOCAL BASELINE PROVEN**

All database endpoints were local Docker containers bound to `127.0.0.1`. No remote project ref or remote database URL was present in the rehearsal workspace. The repository link was not changed or used.

## Safety Baseline

- Git commit: `e21a85a49271d3abb6fda05bed2f63b2e223f229`
- Branch: `main`; equal to `origin/main`
- Local workspace: `supabase/.temp/phase9-baseline-build/` (Git-ignored)
- PostgreSQL image/version: Supabase PostgreSQL `17.6.1.156` / server `17.6`
- Supabase CLI: `2.113.0`
- Synthetic data only
- All 15 historical SQL files were SHA-256 recorded before execution and remained unmodified

## Current Historical Filename Order

`CURRENT_CHAIN_REPLAY = FAIL`

The current filename sequence applied Phase 4 before Phase 3. PostgreSQL allowed Phase 4's PL/pgSQL body to be created even though Phase 3 columns were not yet present, but replay failed when Phase 3 reached its workflow RPC:

```text
20260810090218_phase3_clinical_workflow_foundation.sql:205
ERROR: cannot change return type of existing function
HINT: Use DROP FUNCTION medwell_workflow_transition(uuid,text,text,text,text[]) first.
```

Phase 4 had already created that identity signature returning `jsonb`; Phase 3 attempts to return `public.visits`. This proves filename order is not replayable.

## Intended Dependency Order Source Build

The unadjusted Phase 3 → Phase 4 order also failed:

```text
20260810032648_phase4_treatment_course_foundation.sql:403
ERROR: cannot change return type of existing function
```

Phase 3 returns `public.visits`; Phase 4 returns `jsonb`. A local-only bridge dropped the old signature between phases. A second return-type conflict was then found:

```text
20260810123000_phase5_financial_foundation.sql:435
ERROR: cannot change return type of existing function medwell_record_payment(...)
```

Phase 4 returns `public.payments`; Phase 5 returns `jsonb`. A second local-only bridge dropped that signature before Phase 5.

Adjusted dependency source order:

1. Nine legacy migrations in timestamp order
2. Phase 2
3. Phase 3
4. Local workflow-return bridge
5. Phase 4
6. Local payment-return bridge
7. Phase 5
8. Phase 6
9. Corrected Phase 7 intent

Result: `DEPENDENCY_ORDER_SOURCE_BUILD = PASS`

The bridges exist only in the ignored build workspace; historical migrations were not patched.

## Phase 7 UUID/Text Finding

Historical schema defines `public.users.uid` as `text`, while Phase 7 used `uuid` for:

- `record_edit_locks.locked_by`
- `medwell_acquire_edit_lock.p_actor`
- `medwell_force_release_edit_lock.p_admin_uid`

The source-build copy and candidate baseline use `text` consistently. The final signatures are:

```text
medwell_acquire_edit_lock(text, uuid, text, text, text) -> json
medwell_force_release_edit_lock(uuid, text, text) -> json
```

Synthetic UID `firebaseUser_A1b2C3xyz` successfully acquired, refreshed, and released a lock and appeared in `audit_logs.user_uid`. Result: **PASS**.

## Additional Candidate Corrections

Local lint found Phase 6 referenced `patients.passport_number`, but the canonical column is `passport_no`. The candidate baseline corrects this reference. It also uses an explicit `text[]` initializer for financial blocking reasons and explicitly revokes Supabase platform default browser privileges.

## Candidate Baseline Build

- Candidate: `phase9-baseline-candidate/baseline.sql`
- Schema only; no real rows or secrets
- SHA-256: `430B276DCF9783AF715AC7EF0B6FCD4F1C4036AAEF936F6BFC55E63A0FD979E1`
- Seed SHA-256: `257F9ECF662700FC4B75672C4F8FAF6ACB23B961F5DF344013E76A7F4FA66406`
- Automated dump output was normalized to remove random psql restriction tokens and platform-owned `supabase_admin` default ACL statements that cannot be restored by the migration role
- Explicit table, sequence, function, and default-privilege revocations make the baseline fail closed under Supabase platform defaults

## Blank Reset #1

- Baseline: PASS
- Seed run 1: PASS
- Seed run 2: PASS
- Required objects/security validation: PASS
- Synthetic integration smoke: PASS
- Reference counts: 4 clinic settings, 1 service, 1 medicine, 1 diagnosis
- Sensitive counts after rolled-back smoke: 0 users, patients, visits, payments

## Blank Reset #2

Same assertions and counts as reset #1: **PASS**.

## Determinism

Non-deterministic pg_dump restriction tokens were removed. OIDs and timestamps were not included in the comparison. Normalized public-schema dumps and ordered reference-data JSON were hashed.

| Artifact | Reset #1 | Reset #2 | Equal |
| --- | --- | --- | --- |
| Schema SHA-256 | `AB337146...540F` | `AB337146...540F` | YES |
| Reference SHA-256 | `7A145286...E80` | `7A145286...E80` | YES |

`CANONICAL_BASELINE_DETERMINISTIC = YES`

## RLS and Table Access

All 21 required tables exist and have RLS enabled. For each table, both `anon` and `authenticated` mutation checks returned false. The expected access path is the Edge API using `service_role` after verified Firebase authentication and backend RBAC.

Validated tables:

```text
users, patients, appointments, queues, visits, audit_logs, counters,
treatment_programs, course_products, course_product_programs,
course_enrollments, visit_treatments, course_usage_history,
invoices, invoice_items, payments, refunds, expenses,
user_professional_profiles, medical_certificates, record_edit_locks
```

`public.profiles` is absent by design; `public.users` is canonical.

## Privileged RPC Security

All 12 required RPCs passed:

- exactly one public-schema function per required name
- `SECURITY DEFINER`
- `search_path=public, pg_temp`
- no `PUBLIC`, `anon`, or `authenticated` execute privilege
- `service_role` execute privilege present

## Schema Lint

Final command used a localhost-only URL with SSL disabled:

```text
npx supabase db lint --db-url postgresql://...@127.0.0.1:55434/postgres?sslmode=disable --schema public --level warning --fail-on error
```

Exit code: 0. No error-level findings remained. Non-blocking warnings:

- unused `p_reason` and `p_admin_uid` in `medwell_force_release_edit_lock`
- unused local variables in `medwell_evaluate_visit_financial_status`
- unused `v_invoice` in `medwell_issue_refund`

Warnings were recorded, not suppressed.

## Local Backup/Restore

- PostgreSQL 17 container `pg_dump -Fc`: PASS
- Dump SHA-256: `C9345D79...A6D71`
- 7-Zip AES encrypted archive and integrity test: PASS
- Extracted dump hash equals source: YES
- Disposable restore: PASS
- Restore required pre-creating/hardening `public` and excluding platform-owned `supabase_admin` default ACL entries from the restore list
- Validation on restored DB: PASS
- Normalized application metadata SHA-256 before/after restore: `39E19189...F9834`, equal

## Vector Status

The pre-existing `supabase_vector_MEDWELL` and `supabase_vector_supabase` containers restart because the Docker-log source receives connection refused. Vector is the local log-routing component and was not used by the direct PostgreSQL migration, lint, dump, restore, RLS, RPC, or metadata tests. It is non-blocking for this core database proof, but the full local Supabase stack must not be described as fully healthy.

## Remote Safety Confirmation

No remote SQL, project link, migration push/repair, Edge/Firebase deployment, secret operation, Staging mutation, or Production mutation occurred.

After evidence capture, the five disposable synthetic PostgreSQL containers bound to `127.0.0.1:55432` through `127.0.0.1:55436` were removed. Pre-existing Supabase containers and all remote environments were left untouched.

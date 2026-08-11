# Phase 9 Gate A — Migration Readiness Report

## 1. Gate A Status

**FAIL — BLOCKED**

Gate B must not be authorized or started.

## 2. Baseline

- Commit: `e21a85a49271d3abb6fda05bed2f63b2e223f229`
- Branch: `main`
- `main == origin/main`: YES
- Working tree on entry: CLEAN

## 3. Environment Identity Result

- Supabase repository link: `rubqdcvwrwatxdrtfxkg`
- Supabase control-plane identity: `MEDWELL Clinic System`, `ap-southeast-1`, active healthy
- Supabase classification: **AMBIGUOUS** — the same ref is the API target of the production-configured frontend and is not explicitly identified as isolated Staging
- Firebase configured project: `medwell-clinic-system`
- Firebase classification: **VERIFIED_NON_STAGING** — repository documentation and live domains identify it as Production
- Staging Firebase project: NOT VERIFIED
- Production Supabase identity: `PRODUCTION_IDENTITY_NOT_VERIFIED`

## 4. Production Guard

**PRODUCTION OPERATIONS = PROHIBITED**

| Operation | Allowed Target |
| --- | --- |
| Database Migration | Verified Staging only |
| Edge Deploy | Verified Staging only |
| Firebase Deploy | Verified Staging only |
| Production DB | PROHIBITED |
| Production Edge | PROHIBITED |
| Production Firebase | PROHIBITED |

## 5. Migration Inventory

- Legacy ignored migrations: **9**, all expected files present
- Canonical tracked migrations: **6**, all expected files tracked
- Unexpected migrations: **0**
- No legacy or canonical migration was modified

## 6. Legacy Baseline Classification

**PARTIAL_OR_AMBIGUOUS_BASELINE**

The ignored legacy chain statically defines the foundational schema, but its state in a verified Staging database is unknown. Blind legacy execution is forbidden.

## 7. Static Phase 2–7 Dependency Matrix

| File / Phase | Requires tables/functions/columns | Creates or alters | Ordering dependency | Safe in actual filename order? |
| --- | --- | --- | --- | --- |
| `20260807063300_phase2_target_rbac_foundation.sql` / Phase 2 | Legacy `google_role_approvals`, `users`, `audit_logs`; prior role-claim function signature | Alters approval role constraint; replaces `medwell_claim_google_role` | Requires complete Google-approval legacy chain | YES only with verified legacy baseline |
| `20260810032648_phase4_treatment_course_foundation.sql` / Phase 4 | Legacy `users`, `patients`, `visits`, `screenings`, `queues`, `appointments`, `invoices`, `invoice_items`, `payments`, `prescriptions`, `set_updated_at`; **Phase 3 visit workflow columns** | Creates six treatment/course tables and seven RPCs; replaces workflow/payment RPCs | Depends on Phase 3 columns but filename executes before Phase 3 | **NO — HIGH BLOCKER** |
| `20260810090218_phase3_clinical_workflow_foundation.sql` / Phase 3 | Legacy `visits`, `appointments`, `users`, `queues`, `screenings`, `invoices`, `audit_logs` | Adds workflow, authorship, summary, and next-appointment columns; replaces open-visit/workflow RPCs | Must precede Phase 4's workflow RPC definition | Not in current filename order |
| `20260810123000_phase5_financial_foundation.sql` / Phase 5 | Legacy billing tables; Phase 3 workflow columns; Phase 4 treatment/course tables and ledger | Creates receipts/refunds/expenses/daily closing/disposition tables; replaces financial/workflow RPCs | Requires both Phases 3 and 4 to have succeeded | Conditionally yes after resolving Phase 3/4 blocker |
| `20260810130000_phase6_clinical_document_foundation.sql` / Phase 6 | Legacy `users`, `patients`, `visits`, `counters`, `clinic_settings` | Creates professional profiles and medical certificates; creates issue/cancel RPCs | Requires verified legacy baseline | YES conditionally |
| `20260810140145_phase7_realtime_offline_foundation.sql` / Phase 7 | `visits`; Phase 6 `medical_certificates`; legacy `users` | Adds version columns; creates edit-lock table, trigger function, and lock RPCs | Requires Phase 6 before Phase 7 | YES conditionally |

## 8. Phase 3/4 Timestamp-Order Analysis

Actual lexicographic order is:

1. `20260810032648_phase4_treatment_course_foundation.sql`
2. `20260810090218_phase3_clinical_workflow_foundation.sql`

Phase 4's `medwell_workflow_transition` body reads or updates these Phase 3-only `visits` columns:

- `workflow_stage`
- `stage_started_at`
- `stage_completed_at`
- `completed_at`
- `hp_recorded_by`
- `hp_recorded_at`
- `next_appointment_decision`
- `next_appointment_id`
- `visit_summary`
- `visit_summary_recorded_by`
- `visit_summary_recorded_at`

Therefore the explicit Gate A rule applies: Phase 4 depends on objects created only by Phase 3 while executing first.

Result: **MIGRATION_ORDER_CONFLICT — HIGH / BLOCKS GATE B**

Even if PostgreSQL defers part of PL/pgSQL body resolution, the Phase 4 RPC cannot be statically certified against the schema at its execution point, and Phase 3 subsequently replaces the Phase 4 workflow RPC. Manual out-of-order execution would make migration tracking/history inconsistent. Historical timestamps and committed migrations were not edited.

Forward-safe owner-review direction: define a new tracked Phase 9 reconciliation strategy that preserves immutable history and produces a deterministic final schema/function state. Do not create or apply it until the Staging identity, actual migration history, and schema are verified and the owner approves the strategy.

## 9. Remote Schema Reconciliation

- Remote schema metadata: **SKIPPED**
- Required table/function states: **AMBIGUOUS**
- RLS/policy/grant runtime state: `REMOTE_SECURITY_METADATA_SKIPPED`
- PII-safe confirmation: no patient-level rows or PII were queried or printed

Reason: the linked Supabase ref may be the production backend. Gate A did not treat production-associated access as authorized Staging inspection.

## 10. Migration History Reconciliation

- Repository migration inventory: STATIC VERIFIED
- Remote migration history: SKIPPED
- Actual remote schema: SKIPPED
- Reconciliation result: UNKNOWN / BLOCKED

No claim was made that migration-history presence proves actual schema correctness.

## 11. Local Disposable Rehearsal

**SKIPPED**

- Docker CLI: available, version 29.5.3
- Docker daemon: unavailable (`dockerDesktopLinuxEngine` named pipe not found)
- `psql`: unavailable
- No synthetic local database was created
- No historical migration was altered to force a pass

## 12. Backup Readiness

**NOT_READY**

`pg_dump`, `psql`, AES-256 archive tooling, approved secure destination, and disposable restore validation are not ready. SHA-256 hashing is available. This independently blocks Gate B.

## 13. Edge Configuration Readiness

| Name/config | Classification | Readiness |
| --- | --- | --- |
| `SUPABASE_URL` | REQUIRED | Presence in remote secrets/runtime: UNKNOWN |
| `SUPABASE_SERVICE_ROLE_KEY` | REQUIRED legacy key path | Presence in remote secrets/runtime: UNKNOWN |
| `SUPABASE_SECRET_KEYS` | REQUIRED alternative key-map path when legacy key absent | Presence in remote secrets/runtime: UNKNOWN |
| Firebase project ID | REQUIRED | Hardcoded to production project `medwell-clinic-system`; not Staging-ready |
| `CI` | TEST-ONLY/OPTIONAL | Not a production runtime requirement |

Source logic accepts either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS.default`. No secret values were printed. Remote secret names were not listed because the project environment is ambiguous. No service-role value was found in tracked public source. The Firebase Web API key is public client configuration, not an Admin/service secret.

## 14. Firebase Readiness

**NOT READY FOR STAGING**

`.firebaserc`, public Firebase config, Edge Firebase JWT issuer/audience, CSP, and documented live URLs all consistently target `medwell-clinic-system`. That is internally consistent for the live environment but provides no isolated Staging configuration.

## 15. Critical/High Blockers

### Critical

- None proven through the read-only static audit.

### High / Gate B blocking

1. Supabase Staging identity is ambiguous and overlaps the production-configured API endpoint.
2. Firebase target is verified non-Staging (`medwell-clinic-system`).
3. Production/Staging separation is not established.
4. Phase 4 depends on Phase 3-only columns but executes before Phase 3 by filename timestamp.
5. Actual Staging legacy baseline, migration history, schema, RLS, and RPC grants are unverified.
6. Backup capability is `NOT_READY`.
7. Required Edge secret presence is unknown for a verified Staging target.
8. Local disposable migration rehearsal is unavailable.

## 16. Conditions to Close Before a New Gate A Review

1. Owner identifies exact Supabase and Firebase Staging projects and confirms they are not Production.
2. Repository is configured or documented to target those Staging identities without altering Production defaults accidentally.
3. Read-only migration history and actual schema metadata are reconciled on verified Staging.
4. Owner approves a durable forward-only resolution for the Phase 3/4 ordering conflict.
5. `pg_dump`, restore tooling, AES-256 archive tooling, secure destination, and a successful disposable restore test are available.
6. Docker/local Postgres is available for blank-baseline and canonical-chain rehearsal using synthetic data only.
7. Required Staging Edge secret names are confirmed present without exposing values.

## 17. Recommendation

Stop at Gate A. Do not relink, repair migration history, push migrations, deploy Edge/Firebase, or inspect data until the owner supplies explicit Staging identities and approves remediation planning.

## 18. Gate B Eligibility

**NOT ELIGIBLE**

Gate B may not be proposed under the current evidence.

## 19. No Deployment Confirmation

Confirmed: no Supabase function deployment, Firebase deployment, database push, remote migration apply/repair/reset, Git push, or tag was performed.

## 20. No Remote Mutation Confirmation

Confirmed: no remote SQL, data mutation, secret update, project relink, staging data change, or production data change was performed.

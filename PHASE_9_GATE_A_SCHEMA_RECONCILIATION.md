# Phase 9 Gate A — Schema Reconciliation

## Status and Inspection Scope

**FAIL — BLOCKED**

Classification labels are kept distinct:

- Repository SQL review: **STATIC VERIFIED**
- Supabase identity: **CONTROL-PLANE VERIFIED / ENVIRONMENT AMBIGUOUS**
- Remote schema and security runtime: **SKIPPED**
- Local database execution: **SKIPPED**

No remote SQL was executed. No table rows or patient data were queried. The inspection was PII-safe.

## Migration Inventory

### A. Git-tracked canonical migrations (6)

1. `20260807063300_phase2_target_rbac_foundation.sql`
2. `20260810032648_phase4_treatment_course_foundation.sql`
3. `20260810090218_phase3_clinical_workflow_foundation.sql`
4. `20260810123000_phase5_financial_foundation.sql`
5. `20260810130000_phase6_clinical_document_foundation.sql`
6. `20260810140145_phase7_realtime_offline_foundation.sql`

All six are tracked by Git. Their actual filename order places Phase 4 before Phase 3.

### B. Intentionally ignored legacy migrations (9)

1. `20260801202355_medwell_initial_schema.sql`
2. `20260801203537_harden_rls_and_index_foreign_keys.sql`
3. `20260801210028_fix_utf8_seed_values_and_transactions.sql`
4. `20260801211426_complete_queue_after_payment.sql`
5. `20260801212954_atomic_clinic_workflows.sql`
6. `20260802041155_google_role_approvals.sql`
7. `20260802042157_deny_browser_google_role_approvals.sql`
8. `20260802144915_appointment_atomic_idempotency.sql`
9. `20260802150241_index_google_role_approval_foreign_keys.sql`

All nine files are present and are ignored by `.gitignore` rule `*.sql`. They were not modified, renamed, deleted, unignored, or staged.

### C. Unexpected/unclassified migrations

**None found.** Total SQL files: 15 = 9 expected legacy + 6 expected canonical.

## Legacy Baseline Origin Analysis

| Object area | Static origin/evidence |
| --- | --- |
| `users` | Legacy initial schema; this repository uses `users`, not a legacy `profiles` table |
| `patients` | Legacy initial schema |
| `appointments` | Legacy initial schema; later legacy idempotency migration adds `idempotency_key` and `medwell_create_appointment` |
| `queues` | Legacy initial schema; payment workflow migration later completes queue atomically |
| `visits` | Legacy initial schema; atomic workflow migration later replaces open-visit logic |
| `audit_logs` | Legacy initial schema |
| `counters` | Legacy initial schema |
| `invoices`, `invoice_items` | Legacy initial schema; atomic workflow migration adds invoice RPC |
| `payments` | Legacy initial schema; later legacy migrations replace payment RPC |
| Inventory structures | `medicines`, `stock_lots`, `prescriptions`, `prescription_items`, and `stock_movements` originate in the legacy initial schema; later atomic RPC migration hardens operations |
| `refunds`, `expenses` | Not created by the legacy chain; first created by tracked Phase 5 |
| Google approval structures | Legacy Google approval migrations add approval table, role-claim RPC, deny-browser policy, and FK indexes |

The ignored files are a necessary source baseline for the tracked Phase 2–7 chain. Blind execution remains prohibited because remote actual state and migration history are not verified.

## Required Remote Object Matrix

Because the linked project is not safely classified as Staging, remote schema inspection was not authorized. The following are therefore not claimed present merely because SQL exists in the repository.

| Required object | Remote state | Static source expectation |
| --- | --- | --- |
| `profiles` | AMBIGUOUS | No table with this name is created by the migration chain; application uses `users` |
| `patients` | AMBIGUOUS | Legacy initial schema |
| `appointments` | AMBIGUOUS | Legacy initial schema |
| `queues` | AMBIGUOUS | Legacy initial schema |
| `visits` | AMBIGUOUS | Legacy initial schema + Phases 3/7 alterations |
| `audit_logs` | AMBIGUOUS | Legacy initial schema |
| `counters` | AMBIGUOUS | Legacy initial schema |
| `invoices` | AMBIGUOUS | Legacy initial schema |
| `payments` | AMBIGUOUS | Legacy initial schema + Phase 5 constraint/RPC |
| `refunds` | AMBIGUOUS | Phase 5 |
| `expenses` | AMBIGUOUS | Phase 5 |
| `treatment_programs` | AMBIGUOUS | Phase 4 |
| `course_products` | AMBIGUOUS | Phase 4 |
| `course_product_programs` | AMBIGUOUS | Phase 4 |
| `course_enrollments` | AMBIGUOUS | Phase 4 |
| `visit_treatments` | AMBIGUOUS | Phase 4 |
| `course_usage_history` | AMBIGUOUS | Phase 4 |
| `user_professional_profiles` | AMBIGUOUS | Phase 6 |
| `medical_certificates` | AMBIGUOUS | Phase 6 + Phase 7 version column |
| `record_edit_locks` | AMBIGUOUS | Phase 7 |

## Required Function Matrix

| Function | Remote state | Static source |
| --- | --- | --- |
| `medwell_workflow_transition` | AMBIGUOUS | Phases 3, 4, and 5 successively replace it |
| `medwell_consume_course_session` | AMBIGUOUS | Phase 4 |
| `medwell_reverse_course_session` | AMBIGUOUS | Phase 4 |
| `medwell_record_payment` | AMBIGUOUS | Legacy, Phase 4, and Phase 5 replacements |
| `medwell_issue_refund` | AMBIGUOUS | Phase 5 |
| `medwell_evaluate_visit_financial_status` | AMBIGUOUS | Phase 5 |
| `medwell_issue_medical_certificate` | AMBIGUOUS | Phase 6 |
| `medwell_cancel_medical_certificate` | AMBIGUOUS | Phase 6 |
| `medwell_acquire_edit_lock` | AMBIGUOUS | Phase 7 |
| `medwell_refresh_edit_lock` | AMBIGUOUS | Phase 7 |
| `medwell_release_edit_lock` | AMBIGUOUS | Phase 7 |
| `medwell_force_release_edit_lock` | AMBIGUOUS | Phase 7 |

## Migration History vs Actual Schema

| Evidence source | Result |
| --- | --- |
| Repository files | STATIC VERIFIED: 9 ignored legacy + 6 tracked canonical |
| Remote migration history | SKIPPED: target environment is ambiguous and may be production |
| Actual remote schema metadata | SKIPPED: target environment is ambiguous and may be production |
| Remote RLS/function grants | `REMOTE_SECURITY_METADATA_SKIPPED` |

No equivalence is inferred between repository SQL and remote runtime state.

## Baseline Classification

**C. PARTIAL_OR_AMBIGUOUS_BASELINE**

Reasons:

1. The linked Supabase ref is not proven to be an isolated Staging target.
2. Remote migration history and actual schema were intentionally not inspected after the identity conflict was found.
3. The repository requires an ignored legacy baseline, but its presence in a verified Staging database is not proven.
4. The requested `profiles` table is not represented in the repository chain; the application uses `users`, requiring owner clarification or verified runtime evidence.

This classification blocks Gate B. No legacy migration may be executed until the owner identifies the Staging project and approves a durable baseline/reconciliation plan.

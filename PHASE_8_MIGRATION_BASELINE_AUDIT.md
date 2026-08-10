# Phase 8: Migration Baseline Audit

## Objective
To map and clarify the exact state of database migrations inside the repository. The repository contains both legacy explicitly ignored migrations and new Phase 2–7 canonical migrations.

## 1. Intentionally Ignored Legacy Migrations (Pre-Phase 2)
The following migrations exist in the `supabase/migrations` folder but are intentionally IGNORED by git (via the `*.sql` rule). They are legacy scripts from Phase 0/1.

- `20260801202355_medwell_initial_schema.sql`
- `20260801203537_harden_rls_and_index_foreign_keys.sql`
- `20260801210028_fix_utf8_seed_values_and_transactions.sql`
- `20260801211426_complete_queue_after_payment.sql`
- `20260801212954_atomic_clinic_workflows.sql`
- `20260802041155_google_role_approvals.sql`
- `20260802042157_deny_browser_google_role_approvals.sql`
- `20260802144915_appointment_atomic_idempotency.sql`
- `20260802150241_index_google_role_approval_foreign_keys.sql`

*Policy: Do NOT globally unignore these files. If any staging environment needs a clean rebuild, these scripts act as the assumed pre-Phase-2 schema baseline.*

## 2. Tracked Canonical Phase Migrations
The following migrations are explicitly unignored in `.gitignore` and represent the canonical feature foundations for Phase 2 through 7:

- `20260807063300_phase2_target_rbac_foundation.sql`
- `20260810090218_phase3_clinical_workflow_foundation.sql`
- `20260810032648_phase4_treatment_course_foundation.sql`
- `20260810123000_phase5_financial_foundation.sql`
- `20260810130000_phase6_clinical_document_foundation.sql`
- `20260810140145_phase7_realtime_offline_foundation.sql`

## 3. Staging Baseline Reconciliation
Because the pre-Phase-2 migrations are ignored by Git, pushing `main` to a staging environment will **not** include the base tables (`visits`, `patients`, etc.) unless staging already has that legacy baseline applied.

**Condition:** Staging MUST have the legacy `20260801...` baseline applied manually or preserved from earlier deployments before running `supabase db push` for the Phase 2-7 migrations.

This condition must be satisfied in the `PHASE_8_STAGING_MIGRATION_PLAN.md`.

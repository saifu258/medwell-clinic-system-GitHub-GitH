# DATABASE MIGRATION PLAN

## 1. Current Verified Database Baseline
- **Audit Date**: 2026-08-07
- **Schema version**: Based on `20260801202355_medwell_initial_schema.sql` and subsequent Phase 0 migrations up to `20260802150241_index_google_role_approval_foreign_keys.sql`.
- **Key Tables**: `users`, `patients`, `queues`, `appointments`, `visits`, `screenings`, `prescriptions`, `invoices`, `medicines`, `stock_lots`.

## 2. Legacy Role to Target Role Mapping
- `admin` -> `admin`
- `receptionist` -> `clinic_assistant`
- `nurse` -> `clinic_assistant`
- `cashier` -> `clinic_assistant`
- `doctor` -> `pending_role_review`
- `pharmacist` -> `pending_role_review`

## 3. Role Migration Recommendation (DO NOT EXECUTE YET)
We recommend mapping `receptionist`, `nurse`, and `cashier` directly to `clinic_assistant` in the `users` and `google_role_approvals` tables.

For `doctor` and `pharmacist`, map them to `pending_role_review` with these strict rules:
- The account remains stored.
- Do not delete its history or ownership references.
- Block normal application access.
- Show a Thai message that Admin must assign a new role.
- Only Admin can assign `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`, or keep `admin` where valid.
- Record old role, new role, Admin user, date, and time.
- Do not automatically infer a clinical profession.

## 4. Legacy Workflow-Status Mapping
The `queues` and `visits` tables currently use old enum values.
- **Old queue statuses**: `waiting`, `screening`, `waiting_doctor`, `in_consultation`, `waiting_pharmacy`, `waiting_payment`, `completed`, `cancelled`.
- **Target mapping**:
  - `waiting_pharmacy` -> `waiting_payment` (skip pharmacy step)
  - `waiting_doctor` -> `waiting_treatment` (or equivalent target enum)
- **Constraint Changes**: We will drop the existing `current_status` `CHECK` constraint on `queues` and recreate it with the new allowed values, preserving old ones during transition.

## 5. New and Modified Tables
- **New Tables**:
  - `treatment_programs`, `treatment_templates`, `treatment_courses`, `course_usage`
  - `medical_certificates`, `medical_certificate_counters`, `medical_certificate_number_reservations`, `standard_certificate_texts`
  - `icd10_codes`, `icd10_imports`
  - `invoice_revisions`
  - `receipt_counters`
  - `notifications`, `presence_sessions`, `export_jobs`, `offline_sync_metadata`, `conflict_histories`
- **Modified Tables**:
  - Add structural columns to `visits` for H&P (e.g., `pain_score`, `physical_exam_details`).
  - Add sequence columns to `invoices`.

## 6. New Enums or Check Constraints
- Add new statuses to `queues.current_status`.
- Add `language` enum to `medical_certificates`.
- Add `revision_reason` enum to `invoice_revisions`.

## 7. New Indexes
- Create indexes on `icd10_codes(search_vector)`.
- Create indexes on `medical_certificates(certificate_number)`.

## 8. Foreign Keys
- `medical_certificates.patient_id` -> `patients.patient_id`
- `treatment_courses.patient_id` -> `patients.patient_id`
- `invoice_revisions.invoice_id` -> `invoices.invoice_id`

## 9. Unique Constraints
- `receipt_counters` -> YY+6 atomic constraint.
- `medical_certificate_counters` -> YY+6 atomic constraint.

## 10. Atomic Counter and Reservation Functions
Implement Postgres sequence generator RPCs utilizing `SELECT ... FOR UPDATE SKIP LOCKED` or similar row-level locking to guarantee collision-free sequence generation for Receipts and Medical Certificates.

## 11. RLS and Authorization Changes
- All new tables MUST have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- Revoke all privileges from `anon` and `authenticated`.
- Grant explicit CRUD to `service_role`.

## 12. Realtime Publication Changes
- Enable Realtime on `notifications`, `export_jobs`, and `presence_sessions`.

## 13. Data Backfill Strategy
- Old `diagnosis_master` rows will be copied to `icd10_codes`.
- Old `receipt_number` values in `invoices` (if any existed outside `randomCode`) will seed the `receipt_counters`.

## 14. Reconciliation Queries
- Count matching diagnoses between `diagnosis_master` and `icd10_codes`.
- Validate all users have mapped roles (except `doctor`).

## 15. Dry-Run Process
- The migration will first be executed on the local Supabase environment against a restored Phase 0 database snapshot.
- Reconciliation scripts will run to verify data integrity.

## 16. Staging Migration Process
- Push to staging environment.
- Run Playwright E2E tests against staging to ensure no breakages.

## 17. Validation Checkpoints
- Pre-migration: Backup verification.
- Post-migration: Record count matches, role mappings applied, sequence counters initialized correctly.

## 18. Rollback Strategy
- Full point-in-time recovery (PITR) restore using Supabase dashboard if data corruption occurs.
- Write a `down` migration to revert schema additions, though data loss is expected in a `down` migration of new tables.

## 19. Irreversible-Operation Warnings
> [!CAUTION]
> Dropping the `diagnosis_master` table is irreversible. We will NOT drop it in Phase 1. It will remain in the schema until Phase 12 confirms successful migration.

## 20. Explicit Rules Preventing Data Loss
- **ADDITIVE FIRST**: Do not `DROP TABLE` or `DROP COLUMN` for any existing legacy structure.
- **NULLABLE NEW COLUMNS**: Any new columns added to existing tables must be nullable or have a default value to prevent breaking existing inserts.
- **MAINTAIN LEGACY STATUSES**: Do not remove old enums from `CHECK` constraints; append new ones instead.

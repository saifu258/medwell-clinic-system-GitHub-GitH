# Phase 8: Staging Migration Plan
**Notice**: This is a PLAN ONLY. Do not execute in Phase 8.

## 1. Prerequisites
- Target staging project exists and Firebase Auth integration is wired correctly.
- Admin access to Supabase CLI and Firebase Console.
- Staging DB is backed up if replacing an existing dataset.

## 2. Backup Requirement
Take a full PostgreSQL dump of the current staging environment (`pg_dump` via Supabase connection string).
Backup all `.env` and `supabase/config.toml` variables.

## 3. Schema Baseline Verification
The `supabase/migrations` folder contains old Phase 0/1 files that are Git-ignored.
**CRITICAL**: Verify that Staging already has the pre-Phase 2 base schema (visits, patients, etc.) applied. If Staging is a blank project, the ignored legacy migrations (`20260801...`) MUST be applied manually before proceeding.

## 4. Migration Order
Run `npx supabase db push --db-url <STAGING_DB_URL>`.
This will push the explicitly tracked Phase 2–7 migrations in order:
1. `20260807063300_phase2_target_rbac_foundation.sql`
2. `20260810090218_phase3_clinical_workflow_foundation.sql`
3. `20260810032648_phase4_treatment_course_foundation.sql`
4. `20260810123000_phase5_financial_foundation.sql`
5. `20260810130000_phase6_clinical_document_foundation.sql`
6. `20260810140145_phase7_realtime_offline_foundation.sql`

## 5. Environment Variables
Ensure the following are set in the staging Supabase Edge Secrets:
- `SUPABASE_SERVICE_ROLE_KEY`
- (Any other third-party API keys required by future phases)

## 6. Firebase Auth Verification
Ensure Firebase staging project `Project ID` and `Public Keys` are correctly mapped in the Edge API or Supabase Auth Configuration if used for token parsing.

## 7. Edge Function Deployment Order
Run `npx supabase functions deploy api --project-ref <STAGING_PROJECT_REF>`

## 8. Frontend Deployment Order
Build and deploy the `public` folder to the staging Firebase Hosting / Vercel equivalent using standard CI/CD.

## 9. Smoke Tests
1. Login as `admin` and `clinic_assistant`.
2. Register a dummy patient.
3. Push through the Clinical Workflow (Registration -> Completed).
4. Run daily closing as `admin`.

## 10. Reconciliation Checks
Verify the `visits.version` column exists.
Verify `record_edit_locks` is empty but accessible via RPC.
Verify legacy patient data remains accessible.

## 11. Rollback / Abort Triggers
If any migration fails mid-apply, DO NOT attempt to reverse migration in a live system. Instead, restore the `pg_dump` taken in Step 2.

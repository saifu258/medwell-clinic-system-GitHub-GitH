# DATABASE MIGRATION PLAN

## Overview
The migration will be executed using Supabase migration files. We will preserve existing patient and user data, but restructure the clinical workflow and introduce new tables for treatments, medical certificates, courses, and real-time features.

## Phase 1: Core System & Roles
1. **Roles Update**: 
   - We don't use a `roles` table (it's stored in `users.roles` as an array), but we will update `clinic_settings` and related validation logic.
2. **Patient HN & Settings**:
   - Ensure the new `HN` sequence table exists: `create table patient_hn_counters`.
3. **ICD-10 Updates**:
   - Alter `diagnosis_master` to `icd10_codes` (or create new `icd10_codes` table to match requirements exactly) with support for English name, Thai name, and active status.
   - Create `icd10_imports` log table.

## Phase 2: Treatment & Clinical Data
1. **Treatment Programs**:
   - Create `treatment_programs` and `treatment_templates`.
2. **Treatment Courses**:
   - Create `treatment_courses` (patient, total_sessions, remaining_sessions).
   - Create `course_usage` (links to visit, quantity deducted, balance before/after).
3. **Visits & Workflow Updates**:
   - Alter `visits` and `queues` statuses to match the new workflow.
   - Create `physical_examinations` (or alter visits).
   - Create `visit_treatment_items` (items selected during the visit).

## Phase 3: Medical Certificates
1. **Numbering**:
   - Create `medical_certificate_counters` and `medical_certificate_number_reservations`.
2. **Certificates**:
   - Create `medical_certificates` (patient_id, visit_id, diagnosis, dates, translation data, snapshot data).
   - Create `standard_certificate_texts`.

## Phase 4: Billing & Revisions
1. **Receipt Numbering**:
   - Create `receipt_counters` for atomic YY+6 sequence.
2. **Invoices & Payments**:
   - Alter `invoices` to support partial payments effectively.
   - Create `invoice_revisions` to track post-payment edits.

## Phase 5: Real-Time & Offline Support
1. **Notifications**:
   - Create `notifications` table (type, read_status, linked_record, due_date).
2. **Presence & Locks**:
   - Create `presence_sessions` and `edit_locks` (though locks might be better managed via Supabase Realtime Presence or a dedicated lightweight table).
3. **Drafts & Offline Sync**:
   - Create `automatic_drafts` and `conflict_histories`.
   - Create `offline_sync_metadata`.
4. **Background Jobs**:
   - Create `export_jobs` for tracking CSV generation.

## Execution
- Ensure no data loss by mapping existing `diagnosis_master` to `icd10_codes` if needed.
- Backup DB before applying migrations.
- RLS policies must be applied to all new tables.

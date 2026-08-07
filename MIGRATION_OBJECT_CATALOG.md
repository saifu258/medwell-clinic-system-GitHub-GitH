# MIGRATION OBJECT CATALOG

This catalog defines the logical database design for the MEDWELL Clinic System target architecture.

## 1. Core Users and Migration
### `users`
- **Purpose**: Core user identity and role assignment.
- **PK**: `user_id` (uuid)
- **Required**: `email` (text), `roles` (text[])
- **Nullable**: `first_name`, `last_name`, `phone`
- **FK**: None
- **Unique**: `email`
- **Check Constraints**: Active roles must be `admin`, `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`, `pending_role_review`.
- **Indexes**: `email`
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Managed via Edge Functions (Service Role).
- **Realtime**: No.
- **Audit**: Log changes in `audit_logs`.
- **Deletion**: Soft delete (`is_active` boolean).
- **Data Owner**: Admin.
- **Migration Phase**: M01

### `role_migration_reviews`
- **Purpose**: Tracks decisions for users placed in `pending_role_review`.
- **PK**: `review_id` (uuid)
- **Required**: `user_id` (uuid), `previous_role` (text), `new_role` (text), `approved_by` (uuid), `approved_at` (timestamptz).
- **Nullable**: `notes` (text).
- **FK**: `user_id` -> `users.user_id`, `approved_by` -> `users.user_id`.
- **Unique**: None.
- **Check Constraints**: `new_role` in valid target roles.
- **Indexes**: `user_id`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Insert only by Service Role on Admin action.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Restricted.
- **Data Owner**: Admin.
- **Migration Phase**: M01

## 2. Patients and HN
### `patients`
- **Purpose**: Core patient demographics.
- **PK**: `patient_id` (uuid)
- **Required**: `hn` (text), `first_name`, `last_name`, `dob`.
- **Nullable**: `citizen_id`, `phone`, `address`.
- **FK**: None.
- **Unique**: `hn`, `citizen_id` (where not null).
- **Check Constraints**: Valid HN format.
- **Indexes**: `hn`, `citizen_id`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Modifications logged. Manual HN edits require strict audit_logs entry.
- **Deletion**: Soft delete.
- **Data Owner**: Clinic.
- **Migration Phase**: Existing (Update in M08 for HN counter logic).

### `hn_counters`
- **Purpose**: Atomic generation of Buddhist year-based HNs.
- **PK**: `buddhist_year` (int)
- **Required**: `last_value` (int), `updated_at` (timestamptz).
- **Nullable**: None.
- **FK**: None.
- **Unique**: `buddhist_year`.
- **Check Constraints**: None.
- **Indexes**: None.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: No.
- **Deletion**: Restricted.
- **Data Owner**: System.
- **Migration Phase**: M08

## 3. Workflow and Clinical Data
### `queues`
- **Purpose**: Tracks patient lifecycle on a given day.
- **PK**: `queue_id` (uuid)
- **Required**: `patient_id` (uuid), `current_status` (text), `date` (date).
- **Nullable**: `notes`.
- **FK**: `patient_id` -> `patients.patient_id`.
- **Unique**: None.
- **Check Constraints**: `current_status` enum (see WORKFLOW_MIGRATION_MATRIX).
- **Indexes**: `date`, `current_status`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: Yes (Broadcast/Changes for UI).
- **Audit**: Status changes logged.
- **Deletion**: Restricted.
- **Data Owner**: Clinic.
- **Migration Phase**: M02

### `visits`
- **Purpose**: Master record of a patient's encounter.
- **PK**: `visit_id` (uuid)
- **Required**: `patient_id` (uuid), `queue_id` (uuid), `status` (text).
- **Nullable**: `chief_complaint` (text).
- **FK**: `patient_id` -> `patients.patient_id`, `queue_id` -> `queues.queue_id`.
- **Unique**: `queue_id`.
- **Check Constraints**: None.
- **Indexes**: `patient_id`.
- **Retention**: Indefinite.
- **Snapshot**: Snapshot of demographics if required.
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Modifications logged.
- **Deletion**: Restricted.
- **Data Owner**: Practitioner.
- **Migration Phase**: Existing (Modify in M03).

### `screenings`
- **Purpose**: Vital signs and initial screening data.
- **PK**: `screening_id` (uuid)
- **Required**: `visit_id` (uuid).
- **Nullable**: `bp_systolic`, `bp_diastolic`, `heart_rate`, `temperature`, `weight`, `height`.
- **FK**: `visit_id` -> `visits.visit_id`.
- **Unique**: `visit_id`.
- **Check Constraints**: Valid vital ranges.
- **Indexes**: `visit_id`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Cascade with visit.
- **Data Owner**: Clinic Assistant.
- **Migration Phase**: Existing (Modify in M03).

### `physical_examinations`
- **Purpose**: H&P data for Practitioners.
- **PK**: `pe_id` (uuid)
- **Required**: `visit_id` (uuid).
- **Nullable**: `pain_score` (int), `rom_data` (jsonb), `clinical_assessment` (text), `plan` (text).
- **FK**: `visit_id` -> `visits.visit_id`.
- **Unique**: `visit_id`.
- **Check Constraints**: `pain_score` 0-10.
- **Indexes**: `visit_id`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Cascade with visit.
- **Data Owner**: Practitioner.
- **Migration Phase**: M03

## 4. Treatments and Courses
### `treatment_programs`
- **Purpose**: Master catalog of treatment programs/services.
- **PK**: `program_id` (uuid)
- **Required**: `name` (text), `base_price` (numeric).
- **Nullable**: `description` (text).
- **FK**: None.
- **Unique**: None.
- **Check Constraints**: `base_price` >= 0.
- **Indexes**: `name`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Admin modifications logged.
- **Deletion**: Soft delete.
- **Data Owner**: Admin.
- **Migration Phase**: M04

### `treatment_templates`
- **Purpose**: Grouping of multiple programs for easy selection.
- **PK**: `template_id` (uuid)
- **Required**: `name` (text), `programs` (jsonb).
- **Nullable**: None.
- **FK**: None.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: None.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Admin modifications logged.
- **Deletion**: Hard delete allowed if unused.
- **Data Owner**: Admin.
- **Migration Phase**: M04

### `visit_treatment_items`
- **Purpose**: Treatments applied during a specific visit.
- **PK**: `item_id` (uuid)
- **Required**: `visit_id` (uuid), `program_id` (uuid), `quantity` (int).
- **Nullable**: `notes`.
- **FK**: `visit_id` -> `visits.visit_id`, `program_id` -> `treatment_programs.program_id`.
- **Unique**: None.
- **Check Constraints**: `quantity` > 0.
- **Indexes**: `visit_id`.
- **Retention**: Indefinite.
- **Snapshot**: Price at time of addition.
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Allowed before billing.
- **Data Owner**: Practitioner.
- **Migration Phase**: M04

### `treatment_courses`
- **Purpose**: Purchased multi-session packages.
- **PK**: `course_id` (uuid)
- **Required**: `patient_id` (uuid), `program_id` (uuid), `total_sessions` (int), `remaining_sessions` (int).
- **Nullable**: None.
- **FK**: `patient_id` -> `patients.patient_id`, `program_id` -> `treatment_programs.program_id`.
- **Unique**: None.
- **Check Constraints**: `remaining_sessions` >= 0 AND <= `total_sessions`.
- **Indexes**: `patient_id`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Restricted.
- **Data Owner**: Clinic.
- **Migration Phase**: M05

### `course_usage`
- **Purpose**: Ledger of course session deductions.
- **PK**: `usage_id` (uuid)
- **Required**: `course_id` (uuid), `visit_id` (uuid), `quantity_deducted` (int).
- **Nullable**: None.
- **FK**: `course_id` -> `treatment_courses.course_id`, `visit_id` -> `visits.visit_id`.
- **Unique**: `course_id, visit_id`.
- **Check Constraints**: `quantity_deducted` > 0.
- **Indexes**: `course_id`.
- **Retention**: Indefinite.
- **Snapshot**: Balance before/after (optional, calculable).
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Restricted (Must recalculate course balance).
- **Data Owner**: Clinic.
- **Migration Phase**: M05

### `follow_ups`
- **Purpose**: Practitioner's notes for future check-ins.
- **PK**: `follow_up_id` (uuid)
- **Required**: `visit_id` (uuid), `notes` (text).
- **Nullable**: `target_date` (date).
- **FK**: `visit_id` -> `visits.visit_id`.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: `visit_id`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Allowed.
- **Data Owner**: Practitioner.
- **Migration Phase**: M06

### `appointments`
- **Purpose**: Scheduled future appointments.
- **PK**: `appointment_id` (uuid)
- **Required**: `patient_id` (uuid), `date` (date).
- **Nullable**: `time` (time), `practitioner_id` (uuid).
- **FK**: `patient_id` -> `patients.patient_id`.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: `date`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: Yes.
- **Audit**: Yes.
- **Deletion**: Soft delete (cancelled status).
- **Data Owner**: Clinic Assistant.
- **Migration Phase**: Existing (Modify in M02).

## 5. Billing
### `invoices`
- **Purpose**: Final bill for a visit.
- **PK**: `invoice_id` (uuid)
- **Required**: `visit_id` (uuid), `receipt_number` (text), `grand_total` (numeric).
- **Nullable**: None.
- **FK**: `visit_id` -> `visits.visit_id`.
- **Unique**: `receipt_number`.
- **Check Constraints**: `grand_total` >= 0.
- **Indexes**: `receipt_number`.
- **Retention**: 7-10 years (regulatory).
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: High.
- **Deletion**: Void only.
- **Data Owner**: Clinic.
- **Migration Phase**: Existing (Modify in M07, M08).

### `invoice_items`
- **Purpose**: Line items on an invoice.
- **PK**: `item_id` (uuid)
- **Required**: `invoice_id` (uuid), `name` (text), `amount` (numeric).
- **Nullable**: None.
- **FK**: `invoice_id` -> `invoices.invoice_id`.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: `invoice_id`.
- **Retention**: Matches invoice.
- **Snapshot**: Historical prices at generation time.
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: High.
- **Deletion**: Void via invoice.
- **Data Owner**: Clinic.
- **Migration Phase**: Existing.

### `payments`
- **Purpose**: Record of funds received against an invoice.
- **PK**: `payment_id` (uuid)
- **Required**: `invoice_id` (uuid), `amount` (numeric), `method` (text).
- **Nullable**: `reference` (text).
- **FK**: `invoice_id` -> `invoices.invoice_id`.
- **Unique**: None.
- **Check Constraints**: `amount` > 0.
- **Indexes**: `invoice_id`.
- **Retention**: Matches invoice.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: High.
- **Deletion**: Restricted.
- **Data Owner**: Cashier/Clinic Assistant.
- **Migration Phase**: Existing.

### `invoice_revisions`
- **Purpose**: Audit trail for post-payment invoice edits.
- **PK**: `revision_id` (uuid)
- **Required**: `invoice_id` (uuid), `reason` (text), `difference_amount` (numeric), `approved_by` (uuid).
- **Nullable**: `notes` (text).
- **FK**: `invoice_id` -> `invoices.invoice_id`.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: `invoice_id`.
- **Retention**: Matches invoice.
- **Snapshot**: Previous invoice state (jsonb).
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Extremely High.
- **Deletion**: Never.
- **Data Owner**: Admin.
- **Migration Phase**: M07

### `receipt_counters`
- **Purpose**: Atomic generation of YY+6 receipt numbers. Exactly one global sequence across all years.
- **PK**: `id` (int)
- **Required**: `last_value` (int), `updated_at` (timestamptz).
- **Nullable**: None.
- **FK**: None.
- **Unique**: `id`.
- **Check Constraints**: `id = 1` (Ensures only one global row).
- **Indexes**: None.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: No (Audit handled by invoice generation/edits).
- **Deletion**: Restricted.
- **Data Owner**: System.
- **Migration Phase**: M08

## 6. Medical Certificates and ICD-10
### `icd10_codes`
- **Purpose**: Master table for diagnoses.
- **PK**: `code` (text)
- **Required**: `name_en` (text), `name_th` (text), `is_active` (boolean).
- **Nullable**: None.
- **FK**: None.
- **Unique**: `code`.
- **Check Constraints**: None.
- **Indexes**: Search vectors on names.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Admin imports logged.
- **Deletion**: Soft delete (`is_active` = false).
- **Data Owner**: Admin.
- **Migration Phase**: M09

### `icd10_imports`
- **Purpose**: Audit of CSV uploads.
- **PK**: `import_id` (uuid)
- **Required**: `imported_by` (uuid), `date` (timestamptz), `row_count` (int).
- **Nullable**: None.
- **FK**: None.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: None.
- **Retention**: 1 year.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Auto-purge.
- **Data Owner**: Admin.
- **Migration Phase**: M09

### `medical_certificates`
- **Purpose**: Issued medical certificates.
- **PK**: `certificate_id` (uuid)
- **Required**: `certificate_number` (text), `patient_id` (uuid), `visit_id` (uuid), `status` (text).
- **Nullable**: `diagnosis_code`, `rest_days`, `snapshot_data` (jsonb).
- **FK**: `patient_id` -> `patients.patient_id`, `visit_id` -> `visits.visit_id`.
- **Unique**: `certificate_number`.
- **Check Constraints**: Valid status (`draft`, `issued`, `cancelled`).
- **Indexes**: `certificate_number`, `patient_id`.
- **Retention**: Indefinite.
- **Snapshot**: Full layout text at time of issuance.
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Soft delete/Void.
- **Data Owner**: Practitioner.
- **Migration Phase**: M10

### `medical_certificate_counters`
- **Purpose**: Atomic generator for YY+6 certificate numbers. Global sequence.
- **PK**: `id` (int)
- **Required**: `last_value` (int), `updated_at` (timestamptz).
- **Nullable**: None.
- **FK**: None.
- **Unique**: `id`.
- **Check Constraints**: `id = 1` (Ensures only one global row).
- **Indexes**: None.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: No.
- **Deletion**: Restricted.
- **Data Owner**: System.
- **Migration Phase**: M11

### `medical_certificate_number_reservations`
- **Purpose**: Tracks unused/abandoned draft numbers for gap reuse.
- **PK**: `certificate_number` (text)
- **Required**: `numeric_sequence` (int), `year_prefix` (text), `reserved_by_user_id` (uuid), `reserved_by_session_id` (text), `reserved_at` (timestamptz), `status` (text).
- **Nullable**: `assigned_certificate_id` (uuid), `released_at` (timestamptz), `updated_at` (timestamptz).
- **FK**: `assigned_certificate_id` -> `medical_certificates.certificate_id`.
- **Unique**: `certificate_number`.
- **Check Constraints**: Valid statuses (`reserved`, `assigned_draft`, `issued`, `released`, `permanently_blocked`).
- **Indexes**: `status`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Released rows can be purged once reassigned.
- **Data Owner**: System.
- **Migration Phase**: M11

### `standard_certificate_texts`
- **Purpose**: Templates for medical opinions.
- **PK**: `template_id` (uuid)
- **Required**: `text_th` (text), `text_en` (text).
- **Nullable**: None.
- **FK**: None.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: None.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Allowed.
- **Data Owner**: Admin.
- **Migration Phase**: M10

## 7. System and Realtime
### `export_jobs`
- **Purpose**: Track async CSV generation.
- **PK**: `job_id` (uuid)
- **Required**: `user_id` (uuid), `status` (text).
- **Nullable**: `file_url` (text).
- **FK**: None.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: `user_id`.
- **Retention**: 7 days.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: Yes (Broadcast updates).
- **Audit**: No.
- **Deletion**: Auto-purge.
- **Data Owner**: System.
- **Migration Phase**: M12

### `notifications`
- **Purpose**: Persistent global notifications.
- **PK**: `notification_id` (uuid)
- **Required**: `message` (text), `is_read` (boolean), `is_action_required` (boolean), `created_at` (timestamptz), `updated_at` (timestamptz).
- **Nullable**: `link` (text), `source_type` (text), `source_id` (uuid), `resolution_state` (text), `resolved_at` (timestamptz).
- **FK**: None. (Notifications are global, no specific user_id owner).
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: None. (Global feed)
- **Retention**: 30 days.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: Yes.
- **Audit**: No.
- **Deletion**: Auto-purge.
- **Data Owner**: User.
- **Migration Phase**: M12

### `edit_locks`
- **Purpose**: Prevent concurrent editing of same record. Persistent server-authoritative table.
- **PK**: `lock_id` (uuid)
- **Required**: `resource_id` (uuid), `resource_type` (text), `locked_by_user_id` (uuid), `locked_by_session_id` (text), `lock_token` (text), `acquired_at` (timestamptz), `heartbeat_at` (timestamptz), `expires_at` (timestamptz), `updated_at` (timestamptz).
- **Nullable**: None.
- **FK**: None.
- **Unique**: `resource_id, resource_type`.
- **Check Constraints**: None.
- **Indexes**: `resource_id`.
- **Retention**: Transient.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: Yes.
- **Audit**: No.
- **Deletion**: Purged upon unlock or expiry.
- **Data Owner**: System.
- **Migration Phase**: M13

### `presence_metadata`
- **Decision**: NOT REQUIRED as a persistent table. Supabase Realtime Channels (Presence) will handle active user tracking Ephemerally.

### `automatic_drafts` (Offline Feature)
- **Purpose**: Server-side sync for offline data and retention tracking.
- **PK**: `draft_id` (uuid)
- **Required**: `original_owner_user_id` (uuid), `data_type` (text), `created_at` (timestamptz), `retention_started_at` (timestamptz), `expires_at` (timestamptz), `payload` (jsonb), `updated_at` (timestamptz).
- **Nullable**: `warning_at` (timestamptz), `expiry_warning_shown_at` (timestamptz), `final_confirmation_shown_at` (timestamptz), `deleted_at` (timestamptz), `deletion_reason` (text).
- **FK**: None.
- **Unique**: `draft_id`.
- **Check Constraints**: `expires_at = retention_started_at + interval '5 years'`.
- **Indexes**: `expires_at`, `original_owner_user_id`.
- **Retention**: Strictly 5 years (Asia/Bangkok time).
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Log deletion events (retention_expired) to notifications.
- **Deletion**: Strictly at end-of-day on expires_at (Asia/Bangkok time).
- **Data Owner**: Original User.
- **Migration Phase**: Post-M15 (Offline Design).

### `offline_sync_metadata` (Offline Feature)
- **Purpose**: Track sync watermarks.
- **PK**: `device_id` (uuid)
- **Required**: `last_synced_at` (timestamptz).
- **Nullable**: None.
- **FK**: `device_id` -> `authorized_devices.device_id`.
- **Unique**: `device_id`.
- **Check Constraints**: None.
- **Indexes**: None.
- **Retention**: Transient.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: No.
- **Deletion**: Purged on logout.
- **Data Owner**: System.
- **Migration Phase**: Post-M15.

### `authorized_devices` (Offline Feature)
- **Purpose**: Tracks authorized clinic devices for offline access and supports revocation.
- **PK**: `device_id` (uuid)
- **Required**: `status` (text), `display_name` (text), `first_registered_at` (timestamptz), `last_seen_at` (timestamptz).
- **Nullable**: `registered_by` (uuid), `revoked_by` (uuid), `revoked_at` (timestamptz).
- **FK**: `registered_by` -> `users.user_id`, `revoked_by` -> `users.user_id`.
- **Unique**: None.
- **Check Constraints**: `status` in (`active`, `revoked`, `disabled`).
- **Indexes**: `status`.
- **Retention**: Indefinite.
- **Snapshot**: N/A
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Changes to status logged.
- **Deletion**: Soft delete or status change.
- **Data Owner**: Admin.
- **Migration Phase**: Post-M15 (Offline Design).

### `conflict_histories` (Offline Feature)
- **Purpose**: Immutable ledger of resolved merge conflicts.
- **PK**: `conflict_id` (uuid)
- **Required**: `resolved_by` (uuid), `server_state` (jsonb), `client_state` (jsonb), `resolution` (jsonb).
- **Nullable**: None.
- **FK**: None.
- **Unique**: None.
- **Check Constraints**: None.
- **Indexes**: `resolved_by`.
- **Retention**: Indefinite.
- **Snapshot**: Full jsonb.
- **RLS**: Service Role only.
- **Realtime**: No.
- **Audit**: Yes.
- **Deletion**: Never.
- **Data Owner**: Admin.
- **Migration Phase**: Post-M15.

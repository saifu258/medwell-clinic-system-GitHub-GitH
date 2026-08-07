# DATABASE MIGRATION PLAN

## 1. Additive Migration Sets (M01-M15)

No existing table or column may be dropped in these packages.

### M01 — Role foundations and pending-role review
- **Purpose**: Prepare database for target roles.
- **Dependencies**: None.
- **Forward changes**: Create `role_migration_reviews` table.
- **Backfill**: Update `users` table replacing legacy roles with target roles or `pending_role_review`.
- **Validation queries**: Count unmapped legacy roles (must be 0).
- **Rollback method**: Compatibility rollback (update rows back to original roles).
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 5 minutes.
- **Approval gate**: YES.

### M02 — New workflow status foundations
- **Purpose**: Add new queue statuses.
- **Dependencies**: M01.
- **Forward changes**: Alter `queues.current_status` check constraint to include new target statuses.
- **Backfill**: Map legacy `queues` and `visits` statuses per the `WORKFLOW_MIGRATION_MATRIX.md`.
- **Validation queries**: Count queues with unsupported statuses.
- **Rollback method**: Forward fix (re-map to legacy status if needed).
- **Data-loss risk**: Medium.
- **Locking risk**: Medium (exclusive lock on constraint).
- **Estimated downtime**: 5 minutes.
- **Approval gate**: YES.

### M03 — Clinical assessment and physical examination
- **Purpose**: Add H&P structure.
- **Dependencies**: M02.
- **Forward changes**: Create `screenings`, `physical_examinations` tables (if not existing/modifying).
- **Backfill**: None.
- **Validation queries**: None.
- **Rollback method**: Do nothing.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 2 minutes.
- **Approval gate**: NO.

### M04 — Treatment programs and visit treatment items
- **Purpose**: Core services configuration.
- **Dependencies**: M03.
- **Forward changes**: Create `treatment_programs`, `treatment_templates`, `visit_treatment_items`.
- **Backfill**: Migrate active generic `services` to `treatment_programs`.
- **Validation queries**: Count `treatment_programs`.
- **Rollback method**: Disable UI usage.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 2 minutes.
- **Approval gate**: NO.

### M05 — Treatment courses and course usage
- **Purpose**: Multi-session package tracking.
- **Dependencies**: M04.
- **Forward changes**: Create `treatment_courses`, `course_usage`.
- **Backfill**: None.
- **Validation queries**: None.
- **Rollback method**: Additive-schema compatibility rollback.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 1 minute.
- **Approval gate**: NO.

### M06 — Follow-up
- **Purpose**: Track practitioner follow-ups.
- **Dependencies**: None.
- **Forward changes**: Create `follow_ups` table.
- **Backfill**: None.
- **Validation queries**: None.
- **Rollback method**: Additive-schema compatibility rollback.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 1 minute.
- **Approval gate**: NO.

### M07 — Billing revisions and partial-payment support
- **Purpose**: Post-payment edits.
- **Dependencies**: None.
- **Forward changes**: Create `invoice_revisions` table.
- **Backfill**: None.
- **Validation queries**: None.
- **Rollback method**: Additive-schema compatibility rollback.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 1 minute.
- **Approval gate**: NO.

### M08 — Receipt and HN counters
- **Purpose**: Atomic numbering.
- **Dependencies**: None.
- **Forward changes**: Create `receipt_counters` (`id`, `last_value`, `updated_at`) and `hn_counters` (`buddhist_year`, `last_value`, `updated_at`). Ensure exactly one active global receipt counter (no reset per year). Add constraints. Add audit logic for HN edits.
- **Backfill**: Extract highest current receipt numeric 6-digit suffix globally and insert into `receipt_counters`. Extract highest HN sequence per year prefix and insert into `hn_counters`.
- **Validation queries**: Ensure counter `last_value` matches table max value.
- **Rollback method**: Compatibility rollback.
- **Data-loss risk**: High (number collision).
- **Locking risk**: High.
- **Estimated downtime**: 5 minutes.
- **Approval gate**: YES.

### M09 — ICD-10 foundations
- **Purpose**: Diagnosis tracking and staging legacy data.
- **Dependencies**: None.
- **Forward changes**: Create `icd10_codes`, `icd10_imports`. Do NOT drop or permanently modify `diagnosis_master`.
- **Backfill**: Import verified ICD-10 dataset into `icd10_codes`. `diagnosis_master` remains as staging/reference data.
- **Validation queries**: Compare counts between old and new table.
- **Rollback method**: Forward-fix migration (do not drop legacy data).
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 5 minutes.
- **Approval gate**: NO.

### M10 — Medical certificate foundations
- **Purpose**: Store certificates.
- **Dependencies**: M09.
- **Forward changes**: Create `medical_certificates`, `standard_certificate_texts`.
- **Backfill**: None.
- **Validation queries**: None.
- **Rollback method**: Additive-schema compatibility rollback.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 2 minutes.
- **Approval gate**: NO.

### M11 — Certificate numbering and reservations
- **Purpose**: Certificate gap-reuse system and atomic global numbering.
- **Dependencies**: M10.
- **Forward changes**: Create `medical_certificate_counters` (`id`, `last_value`, `updated_at`), `medical_certificate_number_reservations` (`certificate_number`, `numeric_sequence`, `year_prefix`, `status`, `reserved_by_user_id`, `reserved_by_session_id`, `reserved_at`, `assigned_certificate_id`, `released_at`, `updated_at`). Add state transition check constraints.
- **Backfill**: Extract highest current certificate sequence (if any) and insert into `medical_certificate_counters`.
- **Validation queries**: None initially.
- **Rollback method**: Additive-schema compatibility rollback.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 2 minutes.
- **Approval gate**: YES.

### M12 — Notifications and export jobs
- **Purpose**: Async event tracking.
- **Dependencies**: None.
- **Forward changes**: Create `notifications` (`notification_id`, `message`, `is_read`, `is_action_required`, `source_type`, `source_id`, `resolution_state`, `resolved_at`) and `export_jobs`.
- **Backfill**: None.
- **Validation queries**: None.
- **Rollback method**: Additive-schema compatibility rollback.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 2 minutes.
- **Approval gate**: NO.

### M13 — Edit locks and conflict history
- **Purpose**: Prevent overwrite.
- **Dependencies**: None.
- **Forward changes**: Create `edit_locks` (`lock_id`, `resource_type`, `resource_id`, `locked_by_user_id`, `locked_by_session_id`, `lock_token`, `acquired_at`, `heartbeat_at`, `expires_at`, `updated_at`) with unique constraint on `resource_type` + `resource_id`. Create `conflict_histories`.
- **Backfill**: None.
- **Validation queries**: None.
- **Rollback method**: Additive-schema compatibility rollback.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 2 minutes.
- **Approval gate**: NO.

### M14 — Realtime configuration
- **Purpose**: Enable Supabase publication.
- **Dependencies**: M12.
- **Forward changes**: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications, export_jobs;` (Note: edit_locks presence is managed via explicit RPC, but may be added here if Postgres Changes are used for lock notifications).
- **Backfill**: None.
- **Validation queries**: Check publication members.
- **Rollback method**: Remove from publication.
- **Data-loss risk**: Low.
- **Locking risk**: Low.
- **Estimated downtime**: 1 minute.
- **Approval gate**: NO.

### M15 — Backfill and reconciliation
- **Purpose**: Final data sanity check before API deployment.
- **Dependencies**: M01-M14.
- **Forward changes**: None.
- **Backfill**: Final pass on queues and orphaned keys.
- **Validation queries**: Execute all POST-MIGRATION queries.
- **Rollback method**: See MIGRATION_ROLLBACK_PLAN.
- **Data-loss risk**: Medium.
- **Locking risk**: Low.
- **Estimated downtime**: 10 minutes.
- **Approval gate**: YES.

### Post-M15 — Offline Security and Storage (Deferred)
- **Purpose**: Server-side support for authorized devices, cross-account offline draft access, and strict 5-year retention expiry.
- **Dependencies**: M15.
- **Forward changes**: Create `authorized_devices`, `offline_sync_metadata`, `automatic_drafts`, `conflict_histories`. Ensure `automatic_drafts` contains all required retention metadata (`original_owner_user_id`, `created_at`, `retention_started_at`, `expires_at`, etc.) and constraint `expires_at = retention_started_at + interval '5 years'`.
- **Note**: Exact implementation deferred.


## 2. Backfill Plan

### User roles
- **Source**: `users.roles`
- **Destination**: `users.roles`
- **Transformation**: `receptionist`->`clinic_assistant`, `doctor`->`pending_role_review`, etc.
- **Invalid-data handling**: Leave unknown roles as-is, flag in exception report.
- **Duplicate handling**: N/A.
- **Idempotent rerun behavior**: Safe, already mapped roles skip.
- **Row-count verification**: Count(users) remains identical.
- **Exception report**: Users with empty roles or non-target roles.
- **Rollback/Correction**: Manual correction or JSONB snapshot restore.

### ICD-10 Import and Legacy Staging
- **Source**: Verified external ICD-10 dataset (and `diagnosis_master` for historical referencing).
- **Destination**: `icd10_codes`. `diagnosis_master` is preserved as-is.
- **Transformation**: Import new dataset supporting Thai and English names.
- **Invalid-data handling**: Invalid, unrecognized, or unmappable legacy rows from `diagnosis_master` must be written to an exception report.
- **Duplicate handling**: Use ICD-10 code as the primary matching key.
- **Idempotent rerun behavior**: Safe (`ON CONFLICT (code) DO UPDATE`).
- **Row-count verification**: Count imported new rows, updated rows, and skipped/invalid rows.
- **Exception report**: Unmapped legacy strings, malformed codes.
- **Rollback/Correction**: `TRUNCATE icd10_codes`.

### Existing HNs
- **Source**: `patients.hn`
- **Destination**: `hn_counters`
- **Transformation**: Parse Buddhist year prefix from HN (e.g. `69` -> 2569), find max 5-digit sequence, insert to `last_value` for that `buddhist_year`.
- **Invalid-data handling**: Default to starting value if unparseable.
- **Duplicate handling**: N/A.
- **Idempotent rerun behavior**: `INSERT ON CONFLICT (buddhist_year) DO UPDATE SET last_value = GREATEST(...)`.
- **Row-count verification**: One row per year found in DB.
- **Exception report**: HNs failing regex parse.
- **Rollback/Correction**: Update counter.

### Existing Receipt Numbers
- **Source**: `invoices.receipt_number`
- **Destination**: `receipt_counters`
- **Transformation**: Parse the 6-digit suffix from all receipt numbers, find the global maximum, and insert as `last_value` where `id = 1`.
- **Invalid-data handling**: Default to starting value if unparseable.
- **Duplicate handling**: N/A.
- **Idempotent rerun behavior**: `INSERT ON CONFLICT DO UPDATE SET last_value = GREATEST(...)`.
- **Row-count verification**: Exactly one row in `receipt_counters`.
- **Exception report**: Receipts failing regex parse.
- **Rollback/Correction**: Update counter.

### Queue statuses
- **Source**: `queues.current_status`
- **Destination**: `queues.current_status`
- **Transformation**: Matrix mapping (e.g. `waiting_payment` -> `outstanding_payment`). Active `waiting_pharmacy` records must NOT be bulk-converted automatically.
- **Invalid-data handling**: Fail transaction if unmapped.
- **Duplicate handling**: N/A.
- **Idempotent rerun behavior**: Safe.
- **Row-count verification**: Sum of mapped queues equals total queues before migration.
- **Exception report**: Status not found in matrix.
- **Rollback/Correction**: Forward fix query.

### Legacy Pharmacy Data
- **Source**: `prescriptions`, `medicines`, `stock_movements`, etc.
- **Destination**: Same (preservation only).
- **Transformation**: None. Do not drop or migrate out of these tables. Historical data remains exactly as-is.
- **Invalid-data handling**: N/A.
- **Duplicate handling**: N/A.
- **Idempotent rerun behavior**: N/A.
- **Row-count verification**: Pre- and Post-migration counts must be identical for all pharmacy tables.
- **Exception report**: Any deletion or modification.
- **Rollback/Correction**: Phase 0 full restore.

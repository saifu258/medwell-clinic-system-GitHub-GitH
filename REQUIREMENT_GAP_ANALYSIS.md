# REQUIREMENT GAP ANALYSIS

## Role Replacement
- **Requirement ID**: REQ-001
- **Requirement summary**: Replace legacy roles with target roles (admin, physiotherapist, thai_traditional_practitioner, clinic_assistant) and map `doctor`/`pharmacist` to `pending_role_review`.
- **Current state**: Legacy roles hardcoded in UI and `helpers.ts`.
- **Evidence**: `supabase/functions/api/helpers.ts:38-44`, `public/assets/js/permissions.js`
- **Gap**: Old roles exist; new roles missing.
- **Risk**: Unauthorized access if old roles remain active.
- **Required change**: Update RBAC mapping. Map `receptionist`, `nurse`, `cashier` to `clinic_assistant`. Map `doctor`, `pharmacist` to `pending_role_review` (blocking access until Admin assigns a new role). Remove old UI modules.
- **Affected frontend files**: `permissions.js`, `router.js`, `ui.js`.
- **Affected backend files**: `helpers.ts`, `index.ts`.
- **Affected database objects**: None (roles stored as text[]).
- **Required tests**: Role-based access control tests.
- **Migration dependency**: Must map existing users to safe target roles before dropping.
- **Priority**: P0
- **Estimated complexity**: Medium
- **Status**: TO DO

## Google Sign-in and Role Approval
- **Requirement ID**: REQ-002
- **Requirement summary**: Allow target roles to self-select upon first Google login.
- **Current state**: Supports old roles.
- **Evidence**: `supabase/functions/api/helpers.ts` (`GOOGLE_SELF_SELECT_ROLES`).
- **Gap**: Needs to allow only the new roles.
- **Risk**: Users selecting deprecated roles.
- **Required change**: Change `GOOGLE_SELF_SELECT_ROLES` to `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`.
- **Affected frontend files**: `selectRolePage.js`.
- **Affected backend files**: `helpers.ts`, `index.ts`.
- **Affected database objects**: `google_role_approvals`.
- **Required tests**: Google login and role selection tests.
- **Migration dependency**: REQ-001.
- **Priority**: P0
- **Estimated complexity**: Low
- **Status**: TO DO

## Core Patient Workflow (Registration -> Billing)
- **Requirement ID**: REQ-003
- **Requirement summary**: New workflow logic bypassing pharmacy dependency.
- **Current state**: Pharmacy/Dispense tightly coupled to queue flow (`waiting_pharmacy`).
- **Evidence**: `supabase/functions/api/index.ts:297`, `supabase/migrations/20260801202355_medwell_initial_schema.sql` (queue statuses).
- **Gap**: Queue statuses do not match the new flow (Registration -> Screening -> H&P -> Treatment -> Next Appt -> Billing).
- **Risk**: Workflow breakage if intermediate steps are missing.
- **Required change**: Update queue/visit state machines.
- **Affected frontend files**: `queuePage.js`, `dashboardPage.js`.
- **Affected backend files**: `index.ts`, `helpers.ts`.
- **Affected database objects**: `queues.current_status` check constraint.
- **Required tests**: Full E2E workflow test.
- **Migration dependency**: REQ-001.
- **Priority**: P1
- **Estimated complexity**: High
- **Status**: TO DO

## Clinical Assessment (Shared Form)
- **Requirement ID**: REQ-004
- **Requirement summary**: Shared clinical assessment form for PT and Thai Med.
- **Current state**: Doctor visit format.
- **Evidence**: `visits` table schema.
- **Gap**: Missing specific fields for physical exam, pain score in visit, treatment programs.
- **Risk**: Clinical data loss if fields don't match.
- **Required change**: Add/modify `visits` columns, create `physical_examinations` or JSONB payload.
- **Affected frontend files**: `clinicalAssessmentPage.js` (NEW).
- **Affected backend files**: `index.ts`.
- **Affected database objects**: `visits` table.
- **Required tests**: API validation tests.
- **Migration dependency**: REQ-003.
- **Priority**: P1
- **Estimated complexity**: Medium
- **Status**: TO DO

## Treatment Programs and Courses
- **Requirement ID**: REQ-005
- **Requirement summary**: Standard treatment programs and course tracking.
- **Current state**: No course tracking; uses generic `services` or `medicines`.
- **Evidence**: Tables don't exist.
- **Gap**: Missing `treatment_programs`, `treatment_courses`, `course_usage`.
- **Risk**: Inability to manage multi-session packages.
- **Required change**: Create tables, APIs, and UI to track sessions.
- **Affected frontend files**: `treatmentCoursesPage.js` (NEW).
- **Affected backend files**: `index.ts`.
- **Affected database objects**: New tables.
- **Required tests**: Course deduction logic tests.
- **Migration dependency**: None.
- **Priority**: P2
- **Estimated complexity**: High
- **Status**: TO DO

## Billing and Paid-Invoice Adjustment
- **Requirement ID**: REQ-006
- **Requirement summary**: Split payments, partial payments, and post-payment edits.
- **Current state**: Simple payment append logic.
- **Evidence**: `medwell_record_payment` RPC.
- **Gap**: No built-in way to revise paid invoices and calculate differences.
- **Risk**: Financial inconsistency.
- **Required change**: Update RPC logic, add `invoice_revisions`.
- **Affected frontend files**: `billingPage.js`.
- **Affected backend files**: `index.ts`, DB RPCs.
- **Affected database objects**: `invoices`, new `invoice_revisions`.
- **Required tests**: Financial reconciliation tests.
- **Migration dependency**: None.
- **Priority**: P1
- **Estimated complexity**: High
- **Status**: TO DO

## Receipt and HN Numbering
- **Requirement ID**: REQ-007
- **Requirement summary**: Global YY+6 sequence format for receipts and certificates, and atomic `HNYY/NNNNN` generation for HNs.
- **Current state**: Uses `randomCode` (`prefix-date-uuid`).
- **Evidence**: `supabase/functions/api/helpers.ts:3`.
- **Gap**: Format doesn't match new requirements (YY+6 for receipts, HNYY/NNNNN for HNs).
- **Risk**: Collision or non-compliance.
- **Required change**: Use atomic PostgreSQL counters (`SELECT ... FOR UPDATE`). Receipt/Certificate 6-digit sequence does NOT reset by year. HN 5-digit sequence RESETS per Buddhist year. Allow manual receipt edits by `admin`/`clinic_assistant` with strict uniqueness. Allow manual HN edits ONLY by `admin` with a mandatory reason written to `audit_logs`. HN edits must not lower the HN counter, and must reconcile upward if a higher number is manually set.
- **Affected frontend files**: None.
- **Affected backend files**: `helpers.ts`, `index.ts`.
- **Affected database objects**: `receipt_counters`, `medical_certificate_counters`, `hn_counters`.
- **Required tests**: Concurrency tests (100 simultaneous generations), year rollover tests for HN, manual edit audit log verification.
- **Migration dependency**: None.
- **Priority**: P1
- **Estimated complexity**: Medium
- **Status**: TO DO

## Medical Certificates
- **Requirement ID**: REQ-008
- **Requirement summary**: Full certificate module, PDF, translation.
- **Current state**: Non-existent.
- **Evidence**: Not in schema.
- **Gap**: Missing tables, numbering, UI, PDF generator, and translation API.
- **Risk**: Scope creep if not constrained, number collisions, lost sequences.
- **Required change**: Implement certificate module with atomic global YY+6 numbering using a reservation pool (lowest-number reuse), login-time abandoned reservation recovery, and date/year mismatch warnings. Deferred translation API.
- **Affected frontend files**: `medicalCertificatesPage.js`, `medicalCertificateFormPage.js`.
- **Affected backend files**: `index.ts` (reservation allocator/RPCs).
- **Affected database objects**: `medical_certificates`, `medical_certificate_counters`, `medical_certificate_number_reservations`.
- **Required tests**: Number reservation concurrency (100 simultaneous), draft recovery, duplicate prevention.
- **Migration dependency**: REQ-009 (ICD-10).
- **Priority**: P2
- **Estimated complexity**: Very High
- **Status**: TO DO

## ICD-10 Management
- **Requirement ID**: REQ-009
- **Requirement summary**: CSV import, search ranking.
- **Current state**: Basic `diagnosis_master`.
- **Evidence**: `supabase/migrations/20260801202355_medwell_initial_schema.sql:180`
- **Gap**: Legacy data is unverified staging data. Needs new dataset and better import functionality.
- **Risk**: Modifying or dropping legacy records could break historical snapshot integrity.
- **Required change**: Preserve `diagnosis_master` as staging/reference data. Import new verified ICD-10 dataset into `icd10_codes` supporting Thai and English names. Map duplicate handling by code and log unmappable legacy rows.
- **Affected frontend files**: `icd10ManagementPage.js`.
- **Affected backend files**: `index.ts`.
- **Affected database objects**: `icd10_codes`, `icd10_imports`.
- **Required tests**: CSV parsing tests.
- **Migration dependency**: None.
- **Priority**: P2
- **Estimated complexity**: Medium
- **Status**: TO DO

## Realtime Synchronization & Notifications
- **Requirement ID**: REQ-010
- **Requirement summary**: Presence, global notifications, persistent edit locks, and resilient realtime sync.
- **Current state**: Polling or static.
- **Evidence**: No realtime endpoints or config in JS.
- **Gap**: Needs Supabase Realtime Channels, DB lock authority, global notifications, and cross-tab lock blocking.
- **Risk**: Concurrent overwrite, missed events, connection instability.
- **Required change**: Implement Channels for presence. Implement a persistent `edit_locks` table with an atomic acquire/release/heartbeat RPC (server authoritative). Use BroadcastChannel for cross-tab UI coordination. Use Postgres Changes for notifications, exports, and queue status. Action-required notifications must block manual deletion until resolved. Implement robust reconnect/deduplication logic and polling fallback.
- **Affected frontend files**: `notifications.js`, UI wrappers, lock managers.
- **Affected backend files**: `index.ts`.
- **Affected database objects**: `notifications` table, `edit_locks` table.
- **Required tests**: Multi-tab lock blocking, heartbeat expiry, global notification sync, reconnect/polling resilience.
- **Migration dependency**: None.
- **Priority**: P3
- **Estimated complexity**: High
- **Status**: TO DO

## Autosave, Offline Drafts, and Conflict Resolution
- **Requirement ID**: REQ-011
- **Requirement summary**: 30-second autosave, encrypted IndexedDB device-level vault, cross-account continuation support, device revocation, strictly 5-year retention.
- **Current state**: Not implemented.
- **Evidence**: No service worker or `idb` usage in `public/`.
- **Gap**: Client-side storage, sync logic, and secure offline cross-account access missing.
- **Risk**: Complex state management bugs, data exposure on shared devices, and unauthorized offline access.
- **Required change**: Implement an encrypted device-level vault using IndexedDB (NOT keyed solely to the UID). Allow authenticated users on the same device to view/continue drafts created by others, preserving original ownership, subject to strict role-based access rules. Require online re-authorization before sync. Support device revocation. Implement conflict UI. Implement strict 5-year auto-deletion (Asia/Bangkok time) with a 30-day warning UI and no extension possible.
- **Affected frontend files**: `store.js`, new offline managers.
- **Affected backend files**: Sync APIs, device revocation APIs.
- **Affected database objects**: `conflict_histories`, `authorized_devices`, `automatic_drafts`.
- **Required tests**: Cross-account offline draft continuation, role-based blocking, device revocation sync blocking, offline re-authorization, 5-year expiry limits, 30-day warning, and end-of-day deletion.
- **Migration dependency**: None.
- **Priority**: P3
- **Estimated complexity**: Very High
- **Status**: TO DO

## Data Export (CSV/Background)
- **Requirement ID**: REQ-012
- **Requirement summary**: Generate large CSVs with BOM.
- **Current state**: Direct JSON return (`/reports`).
- **Evidence**: `index.ts:327`.
- **Gap**: Needs to handle large files asynchronously.
- **Risk**: Timeout on large queries.
- **Required change**: Background jobs for CSV creation and storage bucket upload.
- **Affected frontend files**: `reportsPage.js`.
- **Affected backend files**: Edge function or pg_cron.
- **Affected database objects**: `export_jobs`.
- **Required tests**: Export format and encoding tests.
- **Migration dependency**: None.
- **Priority**: P3
- **Estimated complexity**: Medium
- **Status**: TO DO

## Layered Rollback Strategy
- **Requirement ID**: REQ-013
- **Requirement summary**: Layered rollback architecture supporting app, Edge function, additive schema, and full restore, without reliance on PITR.
- **Current state**: No documented/tested rollback procedures.
- **Evidence**: `MIGRATION_ROLLBACK_PLAN.md` newly defined.
- **Gap**: Missing formal mechanisms and CI/CD triggers for rollback.
- **Risk**: Prolonged downtime or data loss upon failed release.
- **Required change**: Implement and document scripts/processes for Firebase rollback, Edge function rollback, forward-fix DB scripts, and `pg_dump` restore procedures. Define post-rollback reconciliation queries. Implement recovery-delta capture.
- **Affected frontend files**: None.
- **Affected backend files**: Deployment scripts, CI/CD pipelines, SQL reconciliation scripts.
- **Affected database objects**: All.
- **Required tests**: Frontend/Edge rollback tests, forward-fix tests, full restore rehearsal, post-restore reconciliation, local offline draft sync tests after rollback.
- **Migration dependency**: Must be ready before execution.
- **Priority**: P0
- **Estimated complexity**: High
- **Status**: TO DO

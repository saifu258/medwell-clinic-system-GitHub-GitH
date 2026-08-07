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
- **Requirement summary**: YY+6 format and atomic generation.
- **Current state**: Uses `randomCode` (`prefix-date-uuid`).
- **Evidence**: `supabase/functions/api/helpers.ts:3`.
- **Gap**: Format doesn't match YY+6.
- **Risk**: Collision or non-compliance.
- **Required change**: Use atomic PostgreSQL counters and sequences.
- **Affected frontend files**: None.
- **Affected backend files**: `helpers.ts`, `index.ts`.
- **Affected database objects**: `counters` or new sequence tables.
- **Required tests**: Concurrency tests.
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
- **Risk**: Scope creep if not constrained.
- **Required change**: Implement all certificate features. Translation API integration is deferred to Phase 6 and production translation must remain disabled until Admin configures the API keys.
- **Affected frontend files**: `medicalCertificatesPage.js`, `medicalCertificateFormPage.js`.
- **Affected backend files**: `index.ts` (or new PDF edge function).
- **Affected database objects**: New tables.
- **Required tests**: Number reservation concurrency, layout tests.
- **Migration dependency**: REQ-009 (ICD-10).
- **Priority**: P2
- **Estimated complexity**: Very High
- **Status**: TO DO

## ICD-10 Management
- **Requirement ID**: REQ-009
- **Requirement summary**: CSV import, search ranking.
- **Current state**: Basic `diagnosis_master`.
- **Evidence**: `supabase/migrations/20260801202355_medwell_initial_schema.sql:180`
- **Gap**: Needs better import functionality and schema alignment.
- **Risk**: None.
- **Required change**: Upgrade table and add import API.
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
- **Requirement summary**: Presence, notifications, edit locks.
- **Current state**: Polling or static.
- **Evidence**: No realtime endpoints or config in JS.
- **Gap**: Needs Supabase Realtime Channels.
- **Risk**: Concurrent overwrite.
- **Required change**: Implement Channels for presence and Postgres triggers for notifications.
- **Affected frontend files**: `notifications.js`, UI wrappers.
- **Affected backend files**: `index.ts`.
- **Affected database objects**: `notifications` table.
- **Required tests**: Multi-tab concurrency tests.
- **Migration dependency**: None.
- **Priority**: P3
- **Estimated complexity**: High
- **Status**: TO DO

## Autosave, Offline Drafts, and Conflict Resolution
- **Requirement ID**: REQ-011
- **Requirement summary**: 30-second autosave, IndexedDB, 5-year retention, UI resolution.
- **Current state**: Not implemented.
- **Evidence**: No service worker or `idb` usage in `public/`.
- **Gap**: Client-side storage and sync logic missing.
- **Risk**: Complex state management bugs.
- **Required change**: Implement local storage wrappers and sync queue.
- **Affected frontend files**: `store.js`, new offline managers.
- **Affected backend files**: Sync APIs.
- **Affected database objects**: `conflict_histories`.
- **Required tests**: Offline simulation tests.
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

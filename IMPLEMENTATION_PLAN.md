# IMPLEMENTATION PLAN

## Phase 1A: Verified Audit and Frozen Baseline
- **Objective**: Establish the truth about the current system architecture and freeze the codebase.
- **Scope**: Code inspection, database schema review, environment validation.
- **Dependencies**: Phase 0 completion.
- **Files likely to change**: Documentation only (Audit reports).
- **Database changes**: None.
- **Tests required**: Baseline E2E execution (Dry run).
- **Entry criteria**: Master prompt approved, Phase 0 finished.
- **Exit criteria**: Phase 1 Audit Report approved.
- **Risks**: Missed legacy edge cases.
- **Rollback point**: Not applicable (no code changes).
- **Approval required**: YES.

## Phase 1B: Migration Design and Approvals
- **Objective**: Finalize database schemas, UI wireframes, and API contracts.
- **Scope**: Write SQL migrations without executing them in production.
- **Dependencies**: Phase 1A.
- **Files likely to change**: `.sql` migration scripts, UI mockups.
- **Database changes**: None yet.
- **Tests required**: None.
- **Entry criteria**: Phase 1A approved.
- **Exit criteria**: SQL scripts reviewed and approved.
- **Risks**: Misunderstanding of clinic workflow.
- **Rollback point**: Discard SQL scripts.
- **Approval required**: YES.

## Phase 2: Authentication and Target RBAC
- **Objective**: Transition to target roles and remove legacy roles.
- **Scope**: UI role mapping, API auth middleware, RBAC enforcement.
- **Dependencies**: Phase 1B.
- **Files likely to change**: `helpers.ts`, `permissions.js`, `router.js`, `selectRolePage.js`.
- **Database changes**: `users`, `google_role_approvals` (manual data migration).
- **Tests required**: Google login tests, role permission unit tests.
- **Entry criteria**: Phase 1B approved. Phase 2 must not begin until Phase 1B migration design is reviewed and approved.
- **Exit criteria**: Only 4 active target roles exist in UI and API, plus `pending_role_review`.
- **Risks**: Lockout of current staff.
- **Rollback point**: Revert code and restore `users` table from snapshot.
- **Approval required**: NO.

## Phase 3: Core Patient Workflow
- **Objective**: Implement the unified Registration -> Billing workflow.
- **Scope**: Queue and visit state machines, new Screening and H&P forms.
- **Dependencies**: Phase 2.
- **Files likely to change**: `index.ts`, `queuePage.js`, `screeningPage.js`, `clinicalAssessmentPage.js`.
- **Database changes**: `queues` status check, `visits` schema updates.
- **Tests required**: E2E workflow tests.
- **Entry criteria**: Phase 2 complete.
- **Exit criteria**: Patients can flow from registration to billing seamlessly.
- **Risks**: Workflow deadlocks.
- **Rollback point**: Code reversion.
- **Approval required**: NO.

## Phase 4: Treatment Programs and Courses
- **Objective**: Enable management of treatment courses and session deductions.
- **Scope**: Course purchase, tracking remaining sessions, deducting sessions.
- **Dependencies**: Phase 3.
- **Files likely to change**: `treatmentCoursesPage.js`, `index.ts`.
- **Database changes**: Create `treatment_programs`, `treatment_courses`, `course_usage`.
- **Tests required**: Deduction logic tests.
- **Entry criteria**: Phase 3 complete.
- **Exit criteria**: Sessions can be correctly bought and consumed.
- **Risks**: Accounting errors on session balance.
- **Rollback point**: Drop new tables, revert code.
- **Approval required**: NO.

## Phase 5: Billing and Numbering
- **Objective**: Implement partial payments, split payments, and atomic YY+6 receipt numbering.
- **Scope**: Payment RPC updates, Invoice editing UI.
- **Dependencies**: Phase 4.
- **Files likely to change**: `billingPage.js`, `invoiceRevisionPage.js`, `index.ts`.
- **Database changes**: `receipt_counters`, `invoice_revisions`.
- **Tests required**: Concurrency testing on sequence generator.
- **Entry criteria**: Phase 4 complete.
- **Exit criteria**: Correct receipt format generated without collisions.
- **Risks**: Invoice duplication or sequence gaps.
- **Rollback point**: Code reversion.
- **Approval required**: NO.

## Phase 6: Medical Certificates and ICD-10
- **Objective**: Full certificate lifecycle with translation and ICD-10 linkage.
- **Scope**: Certificate UI, translation API, PDF generation, ICD-10 CSV import.
- **Dependencies**: Phase 5.
- **Files likely to change**: `medicalCertificatesPage.js`, `medicalCertificateFormPage.js`, `index.ts`.
- **Database changes**: `medical_certificates`, `icd10_codes`, certificate sequences.
- **Tests required**: PDF layout tests, translation API mock tests.
- **Entry criteria**: Phase 5 complete.
- **Exit criteria**: PDFs perfectly match the Word template.
- **Risks**: Layout discrepancies, API key failures.
- **Rollback point**: Revert code.
- **Approval required**: YES (for translation API costs/keys. Production certificate translation must remain disabled until Admin configures and validates Google Cloud Translation API or Gemini API).

## Phase 7: Realtime Notifications and Presence
- **Objective**: Implement global notifications and user presence.
- **Scope**: Supabase Realtime Channels, Toast UI.
- **Dependencies**: Phase 6.
- **Files likely to change**: `notifications.js`, UI wrappers, `index.ts`.
- **Database changes**: `notifications`, `presence_sessions`.
- **Tests required**: Multi-tab concurrency tests.
- **Entry criteria**: Phase 6 complete.
- **Exit criteria**: Instant toasts on background events.
- **Risks**: WebSocket connection limits.
- **Rollback point**: Revert to polling.
- **Approval required**: NO.

## Phase 8: Autosave, Offline Drafts, and Conflict Resolution
- **Objective**: Prevent data loss via IndexedDB caching.
- **Scope**: Client-side storage wrappers, 30s loop, diff UI.
- **Dependencies**: Phase 7.
- **Files likely to change**: `offlineStorage.js`, `store.js`.
- **Database changes**: `conflict_histories`.
- **Tests required**: Network disconnection simulations.
- **Entry criteria**: Phase 7 complete.
- **Exit criteria**: Unsaved forms persist across refresh without internet.
- **Risks**: Corrupt local storage.
- **Rollback point**: Disable offline module.
- **Approval required**: NO.

## Phase 9: Reporting and Exports
- **Objective**: Generate complex CSVs asynchronously.
- **Scope**: Background jobs for export processing.
- **Dependencies**: Phase 8.
- **Files likely to change**: `reportsPage.js`, `index.ts`.
- **Database changes**: `export_jobs`.
- **Tests required**: CSV BOM validation.
- **Entry criteria**: Phase 8 complete.
- **Exit criteria**: Large datasets export successfully without timeouts.
- **Risks**: Edge function timeouts.
- **Rollback point**: Revert code.
- **Approval required**: NO.

## Phase 10: Security Hardening and Full Regression
- **Objective**: Validate RLS, API security, and overall stability.
- **Scope**: Code review, security scan, E2E regression suite execution.
- **Dependencies**: Phase 9.
- **Files likely to change**: Any buggy files discovered.
- **Database changes**: RLS policy adjustments.
- **Tests required**: Security and Regression tests.
- **Entry criteria**: All features merged.
- **Exit criteria**: 100% test pass rate.
- **Risks**: Found vulnerabilities delay launch.
- **Rollback point**: Fix issues.
- **Approval required**: NO.

## Phase 11: Staging UAT
- **Objective**: User Acceptance Testing by the clinic team.
- **Scope**: Deploy to staging Firebase/Supabase environment.
- **Dependencies**: Phase 10.
- **Files likely to change**: None (configuration only).
- **Database changes**: None.
- **Tests required**: Manual UAT.
- **Entry criteria**: Regression passed.
- **Exit criteria**: Sign-off from clinic owner.
- **Risks**: User feedback requires major changes.
- **Rollback point**: Address feedback.
- **Approval required**: YES.

## Phase 12: Production Migration and Post-Deployment Validation
- **Objective**: Go live.
- **Scope**: Production DB migration, Firebase deployment.
- **Dependencies**: Phase 11.
- **Files likely to change**: None.
- **Database changes**: Apply Additive Migration Sets (M01-M15) to Production as per `DATABASE_MIGRATION_PLAN.md` and `MIGRATION_CUTOVER_CHECKLIST.md`.
- **Tests required**: Post-deployment smoke tests.
- **Entry criteria**: UAT signed off.
- **Exit criteria**: Live system functional.
- **Risks**: Production data corruption.
- **Rollback point**: Restore Phase 0 backup.
- **Approval required**: YES.

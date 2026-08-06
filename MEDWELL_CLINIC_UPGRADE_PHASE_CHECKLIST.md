# MEDWELL CLINIC SYSTEM Upgrade Phase Checklist

A checked box is valid only when the Decision and Approval Register contains an APPROVED or APPROVED_WITH_CONDITIONS record with a named approver and evidence reference.

## Phase 0: Discovery, Audit, Backup, and Migration Readiness
- [ ] Source code, schema, and routing inventory complete.
- [ ] Orphan records, duplicate identifiers, invalid statuses documented.
- [ ] RLS policy audit documented.
- [ ] `BACKUP_EVIDENCE_REGISTER.md` populated.
- [ ] `RESTORE_REHEARSAL_REPORT.md` signed off.
- [ ] Financial totals and document counters reconciled after restore.
- [ ] Rollback rehearsal completed.
- [ ] Blocking open questions resolved.
- **[ ] EXPLICIT SIGN-OFF GRANTED to proceed to Phase 1.**

## Phase 1: Identity, RBAC, RLS, Audit, and Database Foundation
- [ ] Authentication architecture implemented.
- [ ] Identity mapping (`users` table) created.
- [ ] New role definitions and `role_migration_reviews` table created.
- [ ] Backend authorization middleware updated and RLS applied.
- [ ] Security and permission tests executed and passed.
- **[ ] APPROVAL GRANTED to proceed to Phase 2.**

## Phase 2: Core Patient, Queue, Visit, and Clinical Workflow
- [ ] Explicit state machine implemented (registered -> completed).
- [ ] Screening and Clinical Assessment pages updated.
- [ ] E2E workflow tests running.
- **[ ] APPROVAL GRANTED to proceed to Phase 3.**

## Phase 3: Treatment Programs, Templates, Courses, and Usage
- [ ] `treatment_programs` and `treatment_courses` integrated.
- [ ] Transactional course deduction logic verified.
- **[ ] APPROVAL GRANTED to proceed to Phase 4.**

## Phase 4: Billing, Payments, Receipts, Refunds, and Daily Closing
- [ ] Split, partial, and full payment flows implemented.
- [ ] Immutable paid invoices and void/refund logging verified.
- [ ] Daily Closing calculations implemented.
- **[ ] APPROVAL GRANTED to proceed to Phase 5.**

## Phase 5: Medical Certificates and PDF Documents
- [ ] Draft -> Under Review -> Approved -> Issued workflow enforced.
- [ ] Reissue and Void policies implemented.
- [ ] Server-side PDF generation matches Thai Ministry standards.
- [ ] Atomic numbering tests passed.
- **[ ] APPROVAL GRANTED to proceed to Phase 6.**

## Phase 6: ICD-10, Translation, and Clinical Reference Data
- [ ] Secure CSV import and parsing completed.
- [ ] Server-side translation wrapper built and protected.
- **[ ] APPROVAL GRANTED to proceed to Phase 7.**

## Phase 7: Notifications, Realtime, Scheduled Jobs, and Exports
- [ ] Persistent notification system and Toast alerts working.
- [ ] Cron/scheduled functions configured.
- **[ ] APPROVAL GRANTED to proceed to Phase 8.**

## Phase 8: Autosave, Offline Drafts, and Conflict Resolution
- [ ] IndexedDB configured strictly for clinical text drafts.
- [ ] Offline financial/certificate attempts blocked correctly.
- **[ ] APPROVAL GRANTED to proceed to Phase 9.**

## Phase 9: Data Migration, Staging UAT, Cutover, and Production Monitoring
- [ ] Schema frozen; migration SQL scripts sequentially executed on staging.
- [ ] Legacy data mapped to new schema correctly.
- [ ] Post-migration reconciliation verifies financial and record totals.
- [ ] Playwright smoke tests passed on staging.
- **[ ] FINAL PRODUCTION GO/NO-GO DECISION.**

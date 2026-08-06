# MEDWELL CLINIC SYSTEM Upgrade Implementation Plan

## 1. Executive Summary
This document provides a comprehensive, state-driven, and safe implementation plan for the MEDWELL CLINIC SYSTEM upgrade. It ensures the preservation of historical data, establishes explicit financial boundaries, and enforces strict RBAC security over clinical actions.

## 2. Current Architecture Findings
- **Authentication**: `UNVERIFIED` (Requires Phase 0 proof-of-concept to determine Firebase-to-Supabase integration capabilities).
- **Frontend Routing**: `PARTIALLY CONFIRMED` (Basic Hash-based router discovered).
- **Edge Functions**: `PARTIALLY CONFIRMED` (Presence of Deno edge functions handling API logic).

## 3. Confirmed Decisions
- *No decisions are officially confirmed at this time. All previously proposed decisions are moved to Open Questions or Pending Approval until explicit evidence is provided in the Decision and Approval Register.*

## 4. Assumptions
- Point-in-Time Recovery (PITR) is currently unavailable or unverified, requiring explicit `pg_dump` rehearsal in Phase 0.

## 5. Authentication Architecture
Firebase Auth is `PROPOSED` as the selected identity provider. The final database authorization execution path remains `PENDING PHASE 0 SECURITY PROOF-OF-CONCEPT`. 

## 6. Identity Mapping
Firebase `uid` is proposed to map to Supabase `external_uid` in the `users` table. Statuses track `invited`, `active`, `suspended`, `disabled`, and `migration_review_required`.

## 7. Action-level Permission Matrix Summary
Roles are `admin`, `physiotherapist`, `thai_traditional_practitioner`, and `clinic_assistant`. Permissions are broken down by explicit actions. Refer to `ROLE_PERMISSION_MATRIX.md`.

## 8. RLS Enforcement Strategy
**CRITICAL**: `SET LOCAL request.jwt.claims` must NEVER be assumed to activate RLS protection on a bypass connection (such as service_role).
Depending on the Phase 0 Security Proof-of-Concept, we will use either:
- **Execution Path A**: Caller-scoped identity with native RLS.
- **Execution Path B**: Edge Functions with restricted database RPCs that manually verify permissions inside the transaction.

## 9. Workflow Transition Summary
Enforced via `transition_entity_status()`. Statuses flow from `registered` to `completed`. 

## 10. Financial Completion and Visit Closing Policy
*(Pending Financial Approval)* A visit can be clinically closed while retaining a `partially_paid` financial status, resulting in an `outstanding_balance` on the case.

## 11. Medical Certificate Reissue Architecture
Reissuing requires voiding the original certificate. The new certificate is generated as a draft linked to the old one.

## 12. Backup and Restore Evidence Requirements
Phase 0 mandates that a `RESTORE_REHEARSAL_REPORT.md` is populated to prove successful restoration.

---

## 13. Revised Phase 0–9
**Phase 0 — Discovery, Audit, Backup, and Migration Readiness**
**Phase 1 — Identity, RBAC, RLS, Audit, and Database Foundation**
**Phase 2 — Core Patient, Queue, Visit, and Clinical Workflow**
**Phase 3 — Treatment Programs, Templates, Courses, and Usage**
**Phase 4 — Billing, Payments, Receipts, Refunds, and Daily Closing**
**Phase 5 — Medical Certificates and PDF Documents**
**Phase 6 — ICD-10, Translation, and Clinical Reference Data**
**Phase 7 — Notifications, Realtime, Scheduled Jobs, and Exports**
**Phase 8 — Autosave, Offline Drafts, and Conflict Resolution**
**Phase 9 — Data Migration, Staging UAT, Cutover, and Production Monitoring**

## 14. Dependencies
- An unresolved question blocks only the phase assigned in its primary blocking classification, unless it creates a direct safety risk to an earlier phase.

## 15. Migration Impact
Deprecated roles will be locked from business logic until an Admin maps them to an active role. Legacy queues are safely quarantined.

## 16. Security Risks
- Unauthorized API calls (Mitigation: Strict RLS & Edge Function validation).
- Secret exposure (Mitigation: Translation API keys live in Supabase Vault only).

## 17. Testing Requirements
Includes E2E Playwright tests, atomic counter concurrency tests, and strict RLS tests.

## 18. Rollback Requirements
If the migration fails during Phase 9, a pre-migration `pg_dump` snapshot will be restored within the RTO window.

## 19. Open Questions
Questions are grouped by their blocking phase (e.g., `BLOCKING_PHASE_0_EXIT`, `BLOCKING_PHASE_4`). See `MEDWELL_CLINIC_UPGRADE_OPEN_QUESTIONS.md`.

## 20. Phase 0 Entry Criteria
Phase 0 may begin only when:
- [x] Phase 0 scope is approved.
- [x] Phase 0 owner is named. (Clinic Admin)
- [x] Read-only access boundaries are documented.
- [x] Evidence storage location is defined. (Local Machine)
- [x] Production modification prohibition is acknowledged.
- [x] Environment inventory is available.
- [x] Approval checkboxes have been evidence-validated.
- [x] Open questions are correctly classified.
- [x] Authentication and RLS descriptions have been corrected.
- [x] Phase 0 receives authorization to begin.

## 21. Phase 0 Exit Criteria
- [ ] Authentication execution path selected and approved.
- [ ] Firebase token verification proof-of-concept passed.
- [ ] Wrong-project token rejection passed.
- [ ] Expired-token rejection passed.
- [ ] Disabled-user rejection passed.
- [ ] Service-role usage inventory completed.
- [ ] RLS execution model verified.
- [ ] Privileged RPC authorization model reviewed.
- [ ] Backup evidence exists.
- [ ] Staging restore rehearsal passed.
- [ ] Row counts reconciled.
- [ ] Financial totals reconciled.
- [ ] Document counters reconciled.
- [ ] Rollback rehearsal completed.
- [ ] Phase 0 blocking questions resolved.
- [ ] Approval evidence recorded.
- [ ] Phase 0 explicitly signed off.

## 22. Phase 1 Entry Criteria
Phase 1 may begin only when all of the following are true in the Decision Register:
- [ ] One authentication architecture is approved.
- [ ] Identity mapping is documented.
- [ ] Action-level permission matrix is approved.
- [ ] RLS policy matrix is approved.
- [ ] Workflow transition matrix is approved.
- [ ] Partial payment rules are approved.
- [ ] Visit closing rules are approved.
- [ ] Medical certificate reissue model is approved.
- [ ] Certificate signing authority is confirmed.
- [ ] Backup evidence exists.
- [ ] Staging restore rehearsal passed.
- [ ] Financial totals reconciled after restore.
- [ ] Document counters reconciled after restore.
- [ ] Rollback rehearsal completed.
- [ ] Blocking open questions are resolved.
- [ ] Phase 0 receives explicit sign-off.

## 23. Final Readiness Decision

**READY TO START PHASE 0**

All Phase 0 entry criteria have been met and authorization to proceed with read-only technical inspection has been explicitly granted by the Phase 0 Owner (Clinic Admin).

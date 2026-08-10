# Phase 8: User Acceptance Testing (UAT) Plan

## Overview
This UAT plan ensures the MEDWELL Clinic System meets operational and clinical requirements across all authorized roles before production release.

## UAT Evidence Template
*For every execution, record the results in this format:*
- **Test ID**: UAT-XX
- **Scenario**: [Description of test]
- **Role**: [Admin / Clinic Assistant / Practitioner]
- **Precondition**: [System state before test]
- **Steps**:
  1. ...
  2. ...
- **Expected**: [Expected outcome]
- **Actual**: [What actually happened]
- **Result**: [PASS / FAIL / BLOCKED]
- **Evidence**: [Screenshot links / log excerpts]
- **Tester**: [Name]
- **Date**: [YYYY-MM-DD]

---

## Required UAT Scenarios

### UAT-01: Patient Registration (Role: Clinic Assistant)
- **Steps**: Register a new patient.
- **Expected**: Patient created successfully. PII (Citizen ID) is masked by default on the listing page.

### UAT-02: Complete Clinical Workflow (Role: Clinic Assistant & Physiotherapist)
- **Steps**: Assistant adds patient to queue -> Assistant performs screening -> Physiotherapist acquires edit lock on H&P -> Physiotherapist assigns treatment and next appointment -> Assistant finalizes billing and takes payment.
- **Expected**: All steps transition cleanly. Practitioner-only forms reject Assistant edits.

### UAT-03: Medical Certificate Issue (Role: Physiotherapist)
- **Steps**: Practitioner drafts and issues a medical certificate for the visit.
- **Expected**: Draft uses offline session encryption safely. Issuance generates a monotonic high-water certificate number. The certificate becomes immutable.

### UAT-04: Lock Concurrency Conflict (Role: Two users)
- **Steps**: User A opens a visit H&P. User B opens the same visit H&P.
- **Expected**: User A receives an edit lock. User B receives a "Read-only — being edited" warning.

### UAT-05: Offline Draft Reconnect (Role: Any)
- **Steps**: User goes offline, types in the H&P draft, then reconnects to the network.
- **Expected**: UI indicates local save. Upon reconnect, user is prompted to reconcile. `expectedVersion` guards prevent silent overwrite if the server version advanced.

### UAT-06: Financial Daily Closing (Role: Admin)
- **Steps**: Admin performs daily closing.
- **Expected**: All receipts and refunds from the business day (Asia/Bangkok timezone) are correctly aggregated.

### UAT-07: Course Consumption (Role: Physiotherapist)
- **Steps**: Purchase a 10-session course. Consume 1 session.
- **Expected**: Deducted to 9 sessions. The history log records the exact usage. Double consumption (spamming the consume button) results in only 1 deduction.

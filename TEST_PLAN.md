# TEST PLAN

## 1. Automated Testing Strategy
- **E2E Tests (Playwright)**: We will write comprehensive user journeys for the 4 active roles (`admin`, `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`), focusing on the new workflow. E2E tests map to `REQ-003`.
- **Unit Tests (Node.js `node:test`)**: Edge functions, validations, translation mock logic, sequence generators, and atomic DB functions. Map to `REQ-007` and `REQ-001`.
- **Database Tests (pgTAP / manual RPC tests)**: To ensure atomic locking on certificate/receipt numbering, and idempotency. Map to `REQ-006` and `REQ-007`.

## 2. Role Tests (REQ-001, REQ-002)
- **Admin**: Verify access to all modules, settings, user management, and ICD-10 uploads.
- **Physiotherapist & Thai Traditional Medicine**: Verify access to queues, screening, H&P, treatment plans, medical certificates (cannot access prescription or inventory pricing).
- **Clinic Assistant**: Verify registration, queue management, screening, follow-up recording, billing/payment (edit quantities/prices), and managing certificates.
- **Pending Role Review**: Verify that logging in as an account with `pending_role_review` is blocked from normal access and shows the required Thai message for Admin reassignment.
- **Obsolete Roles**: Verify that logging in as an old role (if forced) is rejected or that they no longer appear in the UI selection.

## 3. Workflow & Assessment Tests (REQ-003, REQ-004)
- Verify state transitions matching: Registration -> Screening -> H&P -> Treatment -> Next Appt -> Billing.
- Verify shared clinical assessment form data is saved correctly.

## 4. Course & Billing Tests (REQ-005, REQ-006)
- Split/Partial payments.
- Course usage deductions and retroactive edits causing balance recalculations.
- Paid invoice revisions (creating audit logs and adjusting balances without cash).

## 5. Medical Certificate Tests (REQ-008)
- Validate concurrent reservation of numbers (no duplicates).
- Verify draft creation, deletion (number returns to pool).
- Verify mandatory field validation before issuance.
- Verify status transitions (Draft -> Issued -> Canceled).
- Verify Thai/English/Bilingual generation and translation API toggling.
- Print/PDF preview validations.

## 6. ICD-10 Tests (REQ-009)
- CSV Upload: Valid vs Invalid row handling.
- Duplicate resolution.
- UI Search: verify relevance sorting and disabled items not showing.

## 7. Real-Time & Offline Tests (REQ-010, REQ-011)
- **Concurrency**: Open same record in two tabs, verify lock acquisition and UI blocking.
- **Real-time Notifications**: Trigger a low stock or export job completion, verify toast and bell count on another client without refresh.
- **Autosave**: Verify IndexedDB saves every 30s. Disconnect network, edit, reconnect, verify sync/conflict resolution dialog.

## 8. Export Tests (REQ-012)
- Trigger background CSV generation.
- Verify file encoding (UTF-8 with BOM).

## 9. Security & Migration Tests
- **Security**: Role validation at the Edge Function level (bypass UI). XSS prevention in translation and text inputs.
- **Migration Reconciliation**: Validate record counts before and after migration. Verify role mapping logic correctly isolates `doctor` and `pharmacist` into `pending_role_review` for manual review, preserving their history.
- **Backup/Rollback**: Test DB snapshot restore functionality locally.

## Execution & Reporting
- Tests will run in the CI/CD pipeline or locally via `npm run test:e2e` and `npm test`.
- A final `TEST_RESULTS.md` will be generated summarizing passed/failed scenarios.

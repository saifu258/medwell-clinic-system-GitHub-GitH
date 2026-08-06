# TEST PLAN

## 1. Automated Testing Strategy
- **E2E Tests (Playwright)**: We will write comprehensive user journeys for the 4 active roles, focusing on the new workflow.
- **Unit Tests (Node.js `node:test`)**: Edge functions, validations, translation mock logic, sequence generators, and atomic DB functions.
- **Database Tests (pgTAP / manual RPC tests)**: To ensure atomic locking on certificate/receipt numbering and idempotency.

## 2. Role Tests
- **Admin**: Verify access to all modules, settings, user management, and ICD-10 uploads.
- **Physiotherapist & Thai Traditional Medicine**: Verify access to queues, screening, H&P, treatment plans, medical certificates (cannot access prescription or inventory pricing).
- **Clinic Assistant**: Verify registration, queue management, screening, follow-up recording, billing/payment (edit quantities/prices), and managing certificates.
- **Obsolete Roles**: Verify that logging in as an old role (if forced) is rejected or that they no longer appear in the UI selection.

## 3. Medical Certificate Tests
- Validate concurrent reservation of numbers (no duplicates).
- Verify draft creation, deletion (number returns to pool).
- Verify mandatory field validation before issuance.
- Verify status transitions (Draft -> Issued -> Canceled).
- Verify Thai/English/Bilingual generation and translation API toggling.
- Print/PDF preview validations.

## 4. ICD-10 Tests
- CSV Upload: Valid vs Invalid row handling.
- Duplicate resolution.
- UI Search: verify relevance sorting and disabled items not showing.

## 5. Billing & Course Tests
- Split/Partial payments.
- Course usage deductions and retroactive edits causing balance recalculations.
- Paid invoice revisions (creating audit logs and adjusting balances without cash).

## 6. Real-Time & Offline Tests
- Concurrency: Open same record in two tabs, verify lock acquisition and UI blocking.
- Real-time Notifications: Trigger a low stock or export job completion, verify toast and bell count on another client without refresh.
- Autosave: Verify IndexedDB saves every 30s. Disconnect network, edit, reconnect, verify sync/conflict resolution dialog.

## 7. Security Tests
- Role validation at the Edge Function level (bypass UI).
- XSS prevention in translation and text inputs.
- CSV formula injection prevention.

## Execution & Reporting
- Tests will run in the CI/CD pipeline or locally via `npm run test:e2e` and `npm test`.
- A final `TEST_RESULTS.md` will be generated summarizing passed/failed scenarios.

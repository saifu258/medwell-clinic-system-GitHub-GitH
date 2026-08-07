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

## 4. Course & Billing Tests (REQ-005, REQ-006, REQ-007)
- Split/Partial payments.
- Course usage deductions and retroactive edits causing balance recalculations.
- Paid invoice revisions (creating audit logs and adjusting balances without cash).
- **Receipt Numbering Concurrency**: Hit invoice creation RPC simultaneously from 100 workers. Verify 100 unique receipts generated with no gaps/dupes, correct high-water increases, and idempotency key safety.
- **Manual Receipt Edit**: Verify `admin` and `clinic_assistant` can manually edit to a lower unused receipt number without lowering the global high-water mark, and duplicate edits are rejected. Verify warning on YY mismatch.

## 5. Medical Certificate Tests (REQ-008)
- **Concurrency (100 simultaneous reservations)**: Hit RPC from 100 workers. Verify no duplicates. Verify multiple clients competing for the same released-number pool correctly consume the lowest eligible numbers safely without decreasing the high-water mark, and transition to new high-water allocation only after pool exhaustion.
- **Number Lifecycle**: Verify draft creation (assigns number), draft deletion (releases number), and that canceled certificates permanently block the number (rejects reallocation/reuse).
- **Manual Editing**: Verify duplicate rejection, permanently blocked rejection, and correct update of issued certificates without lowering the high-water mark. Verify old number release on change (if not canceled).
- **Abnormal Closure Recovery**: Verify that abandoned reservations (e.g. from closing tab without saving) are recovered or re-allocated appropriately when the user next logs in. Verify same-user multiple-tab behavior.
- **Idempotency**: Verify idempotent retry behavior for reservations.
- **Validation**: Verify warning on YY mismatch. Verify mandatory field validation before issuance.
- **Output**: Verify Thai/English/Bilingual generation and translation API toggling. Print/PDF preview validations.

## 6. HN Numbering Tests (REQ-007)
- **Standard Generation**: Verify newly created patient receives correct `HNYY/NNNNN` format.
- **First HN of a Buddhist year**: Verify the sequence starts precisely at `00001` immediately after year rollover (Asia/Bangkok timezone), without leaking prior sequences.
- **Concurrency (100 allocations)**: Hit registration/HN allocation RPC simultaneously from 100 workers. Verify 100 unique, sequential HNs with no duplicates, and correct counter increment.
- **Duplicate Rejection**: Verify backend rejects forced duplicate HNs under race conditions.
- **Admin Manual Edit**: Verify `admin` can edit, mandatory reason is enforced, and audit log is created.
- **Non-Admin Edit Denial**: Verify `physiotherapist`, `thai_traditional_practitioner`, and `clinic_assistant` are blocked from manual HN edits.
- **Manual Edit Counter Reconciliation**: Verify a lower-number manual edit does not reduce the counter. Verify a higher-number manual edit safely reconciles the automatic counter upward to prevent future collisions.
- **Invalid Format Rejection**: Verify manual edits strictly validate format and reject malformed HNs.
- **Historical Preservation**: Verify existing historical HNs (different year prefix) are never automatically changed when year rolls over.

## 7. ICD-10 Tests (REQ-009)
- CSV Upload: Valid vs Invalid row handling (exception report generation).
- Duplicate resolution by ICD-10 code.
- UI Search: verify relevance sorting and disabled items not showing in active search.
- Bilingual checks: Verify Thai and English names are properly populated and displayed.
- Historical viewing: Verify disabled ICD-10 codes still render correctly in historical issued documents.

## 8. Realtime, Locks, and Notification Tests (REQ-010)
**EDIT LOCK TESTS:**
- Two different users attempt simultaneous edit.
- Same user in two tabs attempts simultaneous edit.
- Lock acquisition is atomic.
- Lock heartbeat renewal.
- Lock expiry.
- Save releases lock.
- Cancel releases lock.
- Logout/session expiry release.
- Unexpected tab closure recovery.
- Edit button re-enabled in real time after release.
- Stale client cannot overwrite after losing lock.

**PRESENCE TESTS:**
- Multiple users on same page.
- Same account in multiple tabs.
- Duplicate display names.
- Viewing/editing state.
- Leave/offline removal.
- Save/cancel page-presence behavior.

**NOTIFICATION TESTS:**
- Global create.
- Global read.
- Global mark-all-read.
- Global delete.
- Action-required remains after read.
- Action-required blocks manual deletion.
- Auto-resolution.
- Bell count sync.

**REALTIME RESILIENCE:**
- Duplicate events.
- Out-of-order events.
- Reconnect.
- Subscription restoration.
- Polling fallback.
- Network interruption during editing.
- Reconnect storm prevention.

## 8b. Offline Tests (REQ-011)
**CROSS-ACCOUNT ACCESS:**
- User A creates encrypted offline draft.
- User B logs into the same authorized device and can see the draft where permitted.
- Original owner remains User A.
- User B can continue the draft if role permits.
- User B is blocked if role does not permit the module.
- Cross-account draft deletion.
- Same draft opened in multiple tabs respects edit-lock rules.

**ENCRYPTION & SECURITY:**
- UID-only key architecture is not used.
- Plaintext clinical content is not present in IndexedDB records intended to be encrypted.
- Logout does not expose decrypted draft state.
- New login requires authorization before decryption/use.
- Corrupted encrypted payload fails safely.
- Wrong/invalid vault key fails safely.

**AUTHORIZATION & REVOCATION:**
- Revoked account cannot sync after reconnect.
- Permission removed while offline blocks sync.
- Device revocation behavior.

**RETENTION EXPIRY (D-011):**
- Draft retention timestamp creation on initial save.
- Exactly 30-day warning notification and UI display.
- Warning actions limited to Open / Sync / Delete.
- No retention-extension action exists in the UI.
- Sync success during warning period removes the local draft.
- Sync failure does not change the expiry deadline.
- Manual deletion during warning period correctly deletes local data and shows Toast.
- Final confirmation on exact expiry date.
- End-of-day deletion using Asia/Bangkok time.
- Expiry correctly executes while device is fully offline.
- Expiry correctly executes while sync is failing.
- Application closed during expiry deadline: first startup after expiry deletes the draft before showing the draft list.
- Deleted draft cannot be restored.
- Encrypted payload and local indexes/metadata are permanently removed upon expiry.
- Global deletion notification contains original owner, data type, deletion date.
- Device clock moved backward does not improperly extend retention after trusted-time reconciliation.
- Cross-account continuation does not reset retention.
- Draft edits do not reset retention.
## 9. Export Tests (REQ-012)
- Trigger background CSV generation.
- Verify file encoding (UTF-8 with BOM).

## 10. Security & Migration Tests
- **Security**: Role validation at the Edge Function level (bypass UI). XSS prevention in translation and text inputs.
- **Migration Reconciliation**: Validate record counts before and after migration. Verify role mapping logic correctly isolates `doctor` and `pharmacist` into `pending_role_review` for manual review, preserving their history.

## 11. Rollback Tests (D-013)
- Frontend rollback to previous release.
- Edge Function rollback.
- Old frontend operating against additive schema (compatibility rollback).
- Forward-fix migration execution.
- Failed backfill correction workflow.
- Full restore rehearsal using Phase 0 backup.
- Post-restore reconciliation execution.
- Receipt, HN, and certificate counter reconciliation after rollback.
- Offline draft sync behavior after backend rollback.
- Failure during cutover before frontend deployment.
- Failure after frontend deployment.
- Recovery of transactions created after backup point.
- *Note: PITR must remain SKIPPED/NOT VERIFIED until independently confirmed.*

## Execution & Reporting
- Tests will run in the CI/CD pipeline or locally via `npm run test:e2e` and `npm test`.
- A final `TEST_RESULTS.md` will be generated summarizing passed/failed scenarios.

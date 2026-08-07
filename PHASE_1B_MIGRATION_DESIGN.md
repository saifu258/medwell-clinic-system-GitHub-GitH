# PHASE 1B MIGRATION DESIGN

## 1. Atomic Numbering Design

### A. Receipt Numbers (D-006)
- **Format**: YY + 6-digit sequence (e.g., `69000123`). The YY prefix is derived dynamically from the Buddhist year of the receipt date at issuance.
- **Implementation Strategy**: One global high-water sequence across all years. We DO NOT create independently resetting counters per year. Example: `69000123` -> `70000124`.
- **Counter Table Design**: `receipt_counters` (`id` int PK DEFAULT 1, `last_value` int, `updated_at` timestamptz). Exactly one logical active counter must exist.
- **Automatic Allocation Rules**:
  1. Uses `high_water_value + 1`.
  2. The high-water value (`last_value`) must only move forward.
  3. A lower previously unused number may be assigned manually.
  4. Using a lower number must never reduce the high-water value.
  5. Skipped unused numbers may be used retrospectively.
  6. Receipt numbers must remain globally unique.
  7. Number allocation must use an atomic database transaction and row-level lock.
  8. Idempotency must prevent duplicate receipt generation from repeated requests.
  9. If a transaction fails before commit, the allocation must roll back safely; no duplicate receipt number may be produced.
- **Date/Year Mismatch**: If the YY prefix in the receipt number does not match the Buddhist year of the receipt date, show a warning and require user confirmation. Allow save after confirmation. Do not automatically rewrite the receipt number. (Warning condition, not blocking).
- **Manual Number Editing**: Roles `admin` and `clinic_assistant` may edit the trailing 6-digit sequence. Backend uniqueness validation is mandatory. Editing to a lower unused number is allowed without lowering the high-water value. No specific audit history required for receipt-number edits unless another finance audit rule applies.
- **Concurrency Design**:
  - The RPC `medwell_create_invoice()` opens a transaction.
  - Execute `SELECT last_value FROM receipt_counters WHERE id = 1 FOR UPDATE`.
  - Increment `last_value` and generate the 6-digit sequence.
  - Combine it with the Buddhist-year prefix derived from the `receipt_date`.
  - Validate the final number against a `UNIQUE` constraint.
  - Commit atomically.
- **Concurrent Test Cases**: Hit the RPC simultaneously from 100 concurrent workers. Verify 100 unique, sequential receipts are generated with no gaps/dupes. Verify high-water increases correctly. Verify retries with same idempotency key return same receipt. Verify manual use of lower number does not affect next automatic number.
- **Reconciliation Query**: `SELECT count(*), count(DISTINCT receipt_number) FROM invoices;` (should be equal).

### B. Medical Certificate Numbers (D-007)
- **Format**: YY + 6-digit sequence (e.g., `69000123`). The YY prefix is derived dynamically from the Buddhist year of the certificate date.
- **Implementation Strategy**: One global high-water sequence across all years + Reservation table. The 6-digit sequence does NOT reset by year. Completely separate from receipt counters. Example: `69000123` -> `70000124`.
- **Global Counter Table**: `medical_certificate_counters` (`id` int PK DEFAULT 1, `last_value` int, `updated_at` timestamptz). `last_value` represents the high-water 6-digit sequence. Reusing a lower released number must never reduce `last_value`. Allocation must be atomic.
- **Reservation Table**: `medical_certificate_number_reservations` (`certificate_number` text PK, `numeric_sequence` int, `year_prefix` text, `status` text, `reserved_by_user_id` uuid, `reserved_by_session_id` text, `reserved_at` timestamptz, `assigned_certificate_id` uuid, `released_at` timestamptz, `updated_at` timestamptz).
- **Status Model**: `reserved`, `assigned_draft`, `issued`, `released`, `permanently_blocked`. Invalid state transitions must be rejected by backend.
- **New Certificate Page Reservation**:
  - Automatically reserve a number via trusted backend RPC/transaction when page opens (do not allocate purely on client).
  - **Lowest Reusable Number Rule**: First, select the lowest numeric eligible `released` number.
  - If a released number exists, use it (e.g. `69000005` out of `[005, 012]`). The high-water mark does not change.
  - If no reusable number exists, lock the global counter (`SELECT ... FOR UPDATE`), allocate `high_water + 1`, and increment the high-water value.
  - The reusable pool uses `SELECT ... FOR UPDATE SKIP LOCKED` ordering by numeric sequence ascending to preserve lowest-number preference under concurrency.
- **Canceled Certificate Numbers**: Marked as `permanently_blocked`. Never returned to the reusable pool. Never reallocated. Manual editing cannot override this. This history survives later edits.
- **Saved Draft Behavior**: Number transitions to `assigned_draft`. Remains associated permanently unless draft is deleted or number manually changed. Incomplete drafts permitted.
- **Deleting Saved Drafts**: Requires confirmation showing number/patient. Transitions unblocked numbers to `released`. If previously canceled, remains `permanently_blocked`. Shows success Toast.
- **Editing an Issued Number**: Validated for uniqueness and eligibility. Old number becomes `released` only if NEVER permanently blocked.
- **Manual Certificate Number Editing**: Roles `admin`, `physiotherapist`, `thai_traditional_practitioner`, and `clinic_assistant` may edit. Validate via backend: reject duplicates/permanently blocked. Lower unused/released numbers allowed without lowering high-water mark. Only latest number stored (no specific audit required unless another rule applies).
- **Year Prefix Mismatch**: If YY prefix differs from certificate date Buddhist year, show warning, require confirmation, allow save, do not auto-rewrite.
- **Concurrency & Transaction Design**:
  - *Reusable allocation*: Begin transaction -> Select lowest released eligible row (`FOR UPDATE SKIP LOCKED`) -> Transition to `reserved` -> Record user/session -> Commit.
  - *High-water allocation*: Lock global counter (`FOR UPDATE`) -> Increment `last_value` -> Create full YY+6 number -> Insert as `reserved` -> Commit.
  - *Protections*: UNIQUE constraint, idempotency, atomic release/cancellation/replacement.

### C. Reservation Recovery
- **Normal Flow**: Normal page close without save releases the reservation immediately (`reserved` -> `released`), making it eligible for future lowest-number reuse without waiting for scheduled cleanup.
- **Abnormal Closure**: If browser/network closes before release, preserve reservation state. On next login, check abandoned reservations for that user/session. If original number is still available, recover it. If consumed, auto-allocate a new eligible number when resuming creation.
- **Cleanup**: A scheduled stale-reservation cleanup may exist only as a secondary safeguard; it must not replace login-time recovery.

## 2. HN Design

### A. Format and Numbering (D-008)
- **Format**: `HNYY/NNNNN`
- **YY**: Last two digits of the Buddhist year (derived dynamically using Asia/Bangkok).
- **NNNNN**: 5-digit sequence, zero-padded.
- **Year Rollover**: The 5-digit sequence resets at the beginning of each Buddhist year (e.g., first patient of 2570 gets `HN70/00001`). Existing patient HNs must never change automatically when the year changes.

### B. Counter Structure and Atomic Generation
- **Counter Table**: `hn_counters` (`buddhist_year` PK/UNIQUE, `last_value` (int, >= 0), `updated_at` timestamptz).
- **Generation Logic**: Must be performed via trusted backend transaction/RPC (not client-side only).
  1. Determine current business date (Asia/Bangkok) and YY suffix.
  2. Safely create `hn_counters` row for that Buddhist year if missing.
  3. Lock row: `SELECT ... FOR UPDATE`.
  4. Increment `last_value`.
  5. Format sequence and create HN.
  6. Enforce `UNIQUE(hn)`.
  7. Insert/update patient and commit atomically.
- **Duplicate Prevention**: DB-level UNIQUE constraint on `patients.hn` is mandatory. The backend must reject duplicates and handle concurrent allocations safely.
- **Concurrency Test**: 100 simultaneous generations for the same year to verify uniqueness and correct sequence increments.

### C. Manual Editing and Audit
- **Allowed Roles**: Only `admin` can manually edit an existing patient HN.
- **Denied Roles**: `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`.
- **Validation**: Reason is mandatory. Must not be blank. Must be unique. Must validate against `HNYY/NNNNN` format (or syntactically valid manual override if explicitly permitted). Historical links must resolve correctly.
- **Audit Log**: Every manual edit creates an immutable record in `audit_logs` containing: `patient_id`, `old_hn`, `new_hn`, `reason`, `changed_by_user_id`, `changed_by_role`, `changed_at`, and `request_id`. This record cannot be overwritten or deleted by normal users and must remain available for Admin review.
- **Counter Reconciliation**: Manual edits must never reduce the automatic counter. If an Admin manually assigns a higher sequence for the current Buddhist year, the counter must be reconciled upward to at least that numeric sequence to prevent future collisions (e.g., if counter is 125 and Admin assigns HN69/00200, the counter becomes at least 200).

## 3. RLS and Authorization Design

- **Architecture Strategy**: The frontend communicates solely via the Supabase Edge API passing a Firebase ID token. The Edge function validates the token manually.
- **Edge API Permissions**: The API router checks permissions via `hasPermission(user.role, required_scope)`.
- **Allowed Roles**: `admin`, `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`.
- **Database Access**: The Edge Function initializes the Supabase client using the `SUPABASE_SERVICE_ROLE_KEY`.
- **RLS Configuration**:
  - `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` applied to ALL tables.
  - No policies created for `anon` or `authenticated`. Direct access is blocked.
  - `service_role` bypasses RLS by Postgres definition. Application-level authorization remains mandatory.
- **RPC Hardening**:
  - All RPCs must be defined with `SECURITY INVOKER`.
  - `SET search_path = public` appended to all RPC definitions to prevent path injection.
  - Execution granted only to `service_role`. `REVOKE EXECUTE ON FUNCTION <func> FROM PUBLIC;`
- **Audit & Idempotency**: All mutating endpoints log to `audit_logs` and require an `idempotency_key`.

## 4. Realtime Architecture and Edit Locks (D-009)

### A. Realtime Architecture Overview
Use Supabase Realtime deliberately by feature:
- **Notifications**: Use Postgres Changes for inserts, updates, and deletions. Main feed is global.
- **Export Jobs**: Use Postgres Changes for status transitions to update menu badges.
- **Queue / Workflow Status**: Use Postgres Changes for important status changes to update UI without full refresh.
- **Presence**: Use Supabase Presence channels. Presence is session/tab based.
- **Edit Locks**: Use a persistent database-backed `edit_locks` table as the single source of truth. Broadcast/Changes notify clients, but are not authoritative for ownership.

### B. Edit Lock Data Model
`edit_locks` table required structure:
- `lock_id`
- `resource_type`
- `resource_id`
- `locked_by_user_id`
- `locked_by_session_id`
- `lock_token`
- `acquired_at`
- `heartbeat_at`
- `expires_at`
- `updated_at`

Only one active lock may exist for a given logical resource (`resource_type` + `resource_id`). Do not rely solely on frontend state.

### C. Atomic Lock Acquisition
Backend RPC `medwell_acquire_edit_lock(...)` behavior:
1. Authenticate Firebase user in Edge API.
2. Verify permission to edit resource.
3. Begin transaction.
4. Check existing active lock for `resource_type` + `resource_id`.
5. If no active lock: insert/acquire lock atomically.
6. If active lock belongs to another user/session: deny acquisition.
7. If active lock belongs to same user but another tab/session: deny acquisition (Multi-Tab Rule).
8. Return lock ownership metadata.
9. Commit transaction.

### D. Same-User Multi-Tab Rule
- Same account may appear multiple times in Presence (once per tab).
- Same account in another tab cannot edit the same record simultaneously.
- Show: “รายการนี้กำลังถูกแก้ไขอยู่ในอีกแท็บหนึ่งของคุณ”
- Action: “ไปยังแท็บที่กำลังแก้ไข”
- Fallback: “กรุณากลับไปยังแท็บที่กำลังแก้ไขรายการนี้”
- Use BroadcastChannel for cross-tab UI coordination. It must not replace the server database lock.

### E. Lock Heartbeat and Expiry
- Editing tab periodically renews `heartbeat_at` / `expires_at`.
- Expiry must tolerate temporary network jitter.
- Lock must not remain permanently orphaned.
- Expired locks reclaimed safely through atomic backend operation.
- Recommended defaults: Heartbeat every 30s, Expiry at 90s.

### F. Lock Release Rules
Explicit release when: Save succeeds, Cancel pressed, workflow exited, logout, session expiry, or editing ends.
- Unexpected disconnects: Heartbeat expiry provides authoritative fallback.
- On save/cancel success: Remove tab from page-level presence and release lock atomically.

### G. Realtime Lock State Updates
- Available: Re-enable Edit button without refresh.
- Acquired: Disable editing immediately, show who is editing.
- Use Postgres Changes or trusted Broadcast.

### H. Presence Design
- Use Supabase Presence for page/session visibility. Each tab has its own identity.
- Metadata: `user_id`, `display_name`, `role`, `session_id`, `page/resource context`, `mode` (viewing/editing).
- Do NOT expose sensitive clinical data in presence payloads.
- UI: Show all viewers/editors (duplicate names allowed). Viewing (gray), Editing (green). Initials follow MEDWELL UI rules.
- Disconnect: Presence updates automatically.

## 5. Notifications and Realtime Resilience (D-009)

### A. Notification Realtime Rules
Global notifications update across all clients in real time for: Create, Mark read, Mark all read, Delete, Action-required resolution, Auto-deletion, Bell unread count, Export completion, Offline-draft expiry.
- Read/delete by one user reflects on every connected client.

### B. Action-Required Notification Rules
- Reading does NOT resolve the action.
- Must contain: `source_type`, `source_id`, `requires_action`, `resolution_state`, `resolved_at`, `created_at`, `updated_at`.
- Remain above general notifications even if read.
- Cannot be manually deleted while unresolved.
- Auto-delete ONLY when source condition resolves via trusted backend logic.
- Examples: Outstanding payment resolving to zero, Follow-up outcome recorded, Low stock restored, Waiting-for-price assigned, System failure cleared.

### C. Duplicate / Out-of-Order Event Protection
- Deduplicate by Event ID or record PK.
- Compare `updated_at` / version.
- Use idempotent state reducers.
- Ignore stale updates older than applied version.
- Re-fetch authoritative state when ordering cannot be trusted.
- No duplicate Toasts from replayed events.

### D. Reconnection Design
1. Show connection state only if operationally useful.
2. Controlled reconnect with backoff (prevent storms).
3. Re-subscribe once per required channel.
4. Re-fetch authoritative state (notifications, bell count, export jobs, edit lock, queue state).
5. Presence rejoins with fresh session state.

### E. Polling Fallback
- Fallback for critical functions when Realtime is unavailable: queue status, notification count, lock verification, export jobs.
- No overlapping requests (use AbortController).
- Stop/reduce polling when tab is hidden. Resume/reconcile immediately when visible.
- Do not create refresh loops.

### F. Realtime Channel Naming
- Consistent conventions: `clinic:notifications`, `clinic:exports`, `clinic:presence`, `record:<resource_type>:<resource_id>`.
- NO sensitive data (patient names, IDs, HNs, diagnoses) directly in channel names.

### G. Authorization and Data Exposure
- Firebase auth remains required. Edge API handles application authorization.
- Realtime exposure must be intentionally scoped.
- Do not publish sensitive tables broadly for convenience.
- Expose only required columns for UI updates.
- Fetch clinical details via authorized API calls after change signal.

## 6. Offline Data Design (D-010, D-011)

### A. Approved Offline Access Model
The MEDWELL system may store offline drafts on an authorized clinic device.
- Offline drafts are stored in an encrypted device-level vault using IndexedDB.
- Multiple authenticated MEDWELL accounts using the same authorized device may view and continue offline drafts created by another user.
- The original draft owner must always remain recorded and visible.
- Continuing another user's draft must NOT replace the original owner.
- Access to the device vault does not itself grant application permission.
- Every user must authenticate before accessing offline drafts.
- Role/permission checks must still be applied before opening or continuing a draft.

### B. Device-Level Encrypted Vault
Do NOT derive the encryption key solely from the original Firebase UID, as this would prevent authorized cross-account access on the same device.
- Design uses IndexedDB for encrypted payload storage.
- Use AES-GCM or equivalent authenticated encryption.
- Implement a device-level vault key or wrapped key architecture.
- An authenticated application session is required before key use.
- No plaintext clinical draft data in LocalStorage.
- No plaintext encryption keys in LocalStorage.
- No encryption secret embedded directly in frontend source code.

### C. Authorized Device Model
A logical authorized-device concept is required to support future revocation.
- **Minimum Definition**: `device_id`, device registration state, device display name, first registered date, last seen date, status (`active`, `revoked`, `disabled`), optional `registered_by`, `revoked_by`, `revoked_at`.
- **Revocation Behavior**: A revoked device must not receive new offline authorization. On the next successful online authentication, the application must refuse access to the MEDWELL offline vault according to the final policy.
- *Note: Exact implementation of device revocation is deferred to a later phase, but the security design must support it.*

### D. Original Owner Preservation
Each offline/automatic draft must preserve at minimum:
- `draft_id`
- `original_owner_user_id`
- `original_owner_display_name` snapshot
- `data_type`
- related patient/document identifiers (as allowed by the security design)
- `created_at`
- `latest_local_save_at`
- `encrypted_payload`
- `sync_state`
- `expiry_at`

If another user continues the draft, the original owner user ID remains unchanged and display name remains available. The latest editor may be tracked separately.

### E. Access Rules & Role-Aware Draft Access
Before an authenticated user may open or continue a draft created by another user on the same device:
1. User must be logged into MEDWELL.
2. User account must be active.
3. User role must still exist in the active target RBAC model.
4. User must have permission to access the relevant draft/data type.
5. If the system is online, current permission must be verified with the trusted backend where practical.
6. If fully offline, use the last securely cached authorization state only within the approved offline-security model.

**Role Restrictions**: Draft access must follow the final target role permissions. A user must not open an offline draft for a module they cannot access (e.g., physiotherapist cannot access medicine drafts; clinic_assistant accesses only permitted modules).

### F. Security Tradeoff
**Approved tradeoff**: Allowing cross-account access on the same clinic device increases the risk that authenticated staff sharing that device may see sensitive patient/health information created by another staff member. This is not a zero-risk design.
**Mitigations**: Authorized-device controls, strong user authentication, role/permission validation, device-level encrypted vault, no plaintext draft storage, automatic session locking, secure logout handling, device revocation capability, local data expiry/deletion rules, backend re-authorization before sync, and sensitive-data minimization.

### G. Local Metadata Minimization
Avoid storing unnecessary plaintext clinical or identity information outside the encrypted payload.
Prefer encrypted storage for: patient name, identity number, telephone, diagnosis, treatment details, certificate content, financial data.
Only retain minimal plaintext metadata where technically necessary for local indexing and UX.

### H. Online Re-Authorization
When connectivity returns:
- Never trust the local vault alone. Re-authenticate/refresh the current user session.
- Verify current account status and permissions with the backend.
- Verify authorization to access the related record/module before synchronizing the draft.
- If permission has been removed since the offline period: Block synchronization, preserve the encrypted local draft temporarily according to retention policy, show a clear Thai error/status, and do not silently upload.

### I. Cross-Account Continue Flow
Draft list must show: original owner, data type/page, permitted related patient/document summary, latest save date/time.
When opening the draft: clearly show original owner, do not auto-change ownership.
Actions: Continue, Delete, Back.
If another user/session currently holds the edit lock: open read-only, show active editor, disable Continue.

### J. Delete Rules
All active roles may delete eligible auto/offline drafts only according to the approved rules.
Before deletion: show original owner, patient/document context, permanent-deletion warning.
After deletion: remove the encrypted local payload, remove associated local indexes/metadata, show success Toast.
No deletion audit is required unless another rule requires one.

### K. Device Revocation Design (Proposed Future)
- Admin-facing authorized-device inventory.
- Device disable/revoke action.
- Server-side device status.
- Next-online enforcement and vault-access denial after revocation.
- Remote deletion limitations when a device remains permanently offline.
- Need for local expiry as an additional safeguard.
*Note: This specific device-control design is PROPOSED, whereas the cross-account draft-access behavior is APPROVED.*

### L. Threat Model Considerations
Mitigations and residual risks must be documented for:
- Lost or stolen shared clinic device.
- Staff member using another staff member's authenticated session.
- Local IndexedDB extraction.
- Browser profile copying.
- XSS attempting to read decrypted drafts.
- Unauthorized role accessing another module's local draft.
- Revoked user returning while device is offline.
- Revoked device remaining offline.
- Encryption-key theft.
- Local database corruption.

### M. Five-Year Offline Draft Retention Policy (D-011)
- **Approved Retention Period**: Offline drafts must be retained for exactly 5 years. Calculated from the approved draft creation/retention-start timestamp. Use `Asia/Bangkok` as the business timezone for retention-date calculations. Users cannot extend the retention period.
- **30-Day Advance Warning**: Exactly 30 days before expiry, create a warning notification and surface the draft in the offline-draft warning UI. Clearly show it will be deleted. Available actions limited to: เปิดดู (Open), ซิงก์ (Sync), ลบ (Delete). Do NOT provide extension or snooze options.
- **Sync During Warning Period**: If the user selects Sync during the 30-day window: perform normal auth checks, sync if permitted. If successful, remove local draft. If failed, keep the original expiry deadline. Failed sync does not extend retention.
- **Manual Delete During Warning Period**: If the user selects Delete before the deadline, follow standard deletion confirmation, delete encrypted payload and local metadata, and show success Toast.
- **Expiry-Day Final Confirmation**: On the exact five-year expiry date, show a final confirmation dialog when an authorized user encounters the expiring draft. Actions: Open, Sync, Delete now, Close dialog. Closing/ignoring does NOT extend the deadline.
- **End-of-Day Automatic Deletion**: If no earlier deletion occurs, automatically delete the offline draft at the end of that day (`Asia/Bangkok` time). The draft must be deleted even if the device is offline, sync failed, server unreachable, or draft has unsynchronized changes.
- **Local Deletion Scope**: Permanent expiry deletion must remove ALL recoverable local representations: encrypted payload, local draft index entry, local sync metadata, conflict metadata tied only to the draft, temporary decrypted state, and cached previews. Do not leave a recoverable backup.
- **Application Closed at Expiry**: If the app is open at expiry end-of-day, delete immediately. If closed, the first startup after the deadline must delete the expired draft BEFORE making it available or rendering the normal draft list. The expired draft must not appear recoverable.
- **Clock and Timezone Safety**: Use `Asia/Bangkok`. Protect against incorrect local clocks by storing authoritative server time when online and maintaining a trusted time offset. Reconcile on reconnect. Changing device clock backward must not extend retention.
- **Post-Deletion Toast**: After automatic expiry deletion, show the Toast: “ลบฉบับร่างออฟไลน์ที่ครบกำหนดแล้ว”. If fully offline/closed during deletion, surface the Toast on next startup without restoring the draft.
- **Global Notification After Deletion**: Create a global MEDWELL notification containing: original owner, data type, deletion date, and the message “ลบฉบับร่างออฟไลน์ที่ครบกำหนดแล้ว”. If offline, queue only minimal metadata to create the server notification upon reconnect; do not queue the clinical payload.
- **Original Owner Preservation**: Throughout the lifecycle, preserve `original_owner_user_id` and `original_owner_display_name` snapshot. Post-deletion notifications must identify the original owner.
- **No Retention Extension**: Users cannot add years, restart the timer, postpone expiry, or change expiry through cross-account continuation, editing, or failed sync.
- **Security and Privacy Design**: Mandatory expiry limits indefinite retention of sensitive clinical information, reducing exposure on lost/compromised shared devices. Residual risk remains due to the 5-year window; device encryption and authorization controls remain mandatory.

### N. Retention Metadata
Logical retention metadata required for offline drafts:
- `created_at`
- `retention_started_at`
- `expires_at`
- `warning_at`
- `expiry_warning_shown_at`
- `final_confirmation_shown_at`
- `deleted_at`
- `deletion_reason` (e.g., `retention_expired`)
- `original_owner_user_id`
- `data_type`
Do not store unnecessary clinical content in retention metadata.

## 7. Migration Operations Design

### A. Queue Cutover (D-003)
- **Pre-migration State**: Before any real migration begins, there must be no uncontrolled active legacy queues.
- **Legacy Queue Disposition**: Every legacy queue must be reviewed and placed into `completed`, `cancelled`, or explicitly held in a reviewed migration hold list before cutover.
- **No Automatic Remapping**: Do not automatically remap an actively processed queue into a new clinical workflow status.
- **Intake Freeze**: The clinic must define a temporary queue intake freeze window before production cutover.
- **Execution Approval**: The actual production cutover date and time still require a separate execution approval.
- **Historical Preservation**: Preserve all historical queue records and legacy status meanings.

### B. Legacy Pharmacy Data (D-004)
- **Pharmacy Workflow Status**: The new MEDWELL clinical workflow will not use Pharmacy Workflow as a mandatory treatment step.
- **Historical Preservation**: All legacy pharmacy-related information must be preserved exactly for history, reporting, reconciliation, and audit purposes (including prescriptions, dispensing records, medicines, stock lots, pharmacy-related visit data, historical `waiting_pharmacy` statuses, medicine-related billing references, and inventory movements).
- **Data Protection Rules**:
  1. Do not delete legacy pharmacy data.
  2. Do not rewrite the historical meaning of legacy pharmacy statuses.
  3. Completed historical pharmacy records remain unchanged.
  4. Any record still in `waiting_pharmacy` at cutover must be reviewed individually.
  5. If no further medicine-dispensing action is required, map to `waiting_summary_payment` ONLY after manual review.
  6. If medicine dispensing is still required, complete or close the pharmacy-related operation in the legacy workflow before cutover.
  7. Do not automatically bulk-convert active `waiting_pharmacy` records.
  8. Preserve historical links between prescriptions, visits, patients, medicines, stock lots, and invoices/payments.
- **Role Permissions for Pharmacy**:
  - `admin`: manage medicines, inventory, and stock (where allowed by final RBAC).
  - `clinic_assistant`: manage medicines and inventory according to approved permissions.
  - `physiotherapist` & `thai_traditional_practitioner`: NO prescribing, NO dispensing, NO medicine-stock management.
- **Legacy Structures**: Any legacy pharmacy tables or columns must remain in the first additive migration. Do not drop pharmacy-related structures during Phase 2 or early migration packages. Historical pharmacy data must remain readable.

## 8. ICD-10 Source Data Validation (D-005)

### A. Legacy `diagnosis_master` Handling
- **Status**: Existing `diagnosis_master` data must NOT be treated as automatically complete, authoritative, or fully valid ICD-10 data. It is considered staging/reference data only during migration.
- **Preservation**: Do not delete `diagnosis_master` during early migration phases. Do not rewrite or alter historical diagnosis records. Historical records and issued documents must preserve their original diagnosis code/name snapshots.
- **Retirement Conditions**: `diagnosis_master` may only be considered for retirement after:
  1. ICD-10 import validation passes,
  2. reconciliation passes,
  3. migration testing passes,
  4. UAT passes,
  5. System Owner gives a later explicit execution approval.
- Do not drop or permanently modify `diagnosis_master` in Phase 1B or early additive migrations.

### B. New `icd10_codes` Import
- **Verified Dataset**: A new verified ICD-10 dataset must be imported into `icd10_codes`.
- **Duplicate Handling**: Duplicate handling must use the ICD-10 code as the primary matching key.
- **Language Support**: New ICD-10 records must support Thai and English disease names where available.
- **Exception Reporting**: Invalid, unrecognized, or unmappable legacy rows must be written to an exception report.
- **Disabled Codes**: Disabled ICD-10 codes must remain visible in historical records but must not be selectable for new records.

## 9. Rollback Strategy (D-013)

### A. Layered Rollback Approach
MEDWELL uses a layered rollback strategy to minimize data loss and downtime. Do NOT rely on PITR as the primary rollback mechanism. 
Approved layers:
1. Application rollback
2. Supabase Edge Function rollback
3. Additive-schema compatibility rollback
4. Forward-fix migration
5. Controlled backfill correction
6. Full database restore using the verified Phase 0 backup
7. PITR only if D-014 is later independently verified as available

### B. Additive-Schema Compatibility
The migration philosophy is **ADDITIVE FIRST**. New structures must coexist with the previous application long enough to permit application rollback. Legacy tables, columns, and status values must not be dropped in early phases.

### C. Forward-Fix Migration
Destructive down migrations that delete migrated data or drop live tables/columns are not routinely allowed. Forward-fix migrations that preserve data and are idempotent should be preferred for corrective actions.

### D. Full Restore and Transaction Preservation
Full restore via Phase 0 backup is the verified last-resort recovery method. Because it overwrites post-backup transactions, a recovery-delta capture procedure must be executed to safely export, preserve, and selectively reapply transactions created during the failed release window.

### E. Offline Draft Synchronization After Rollback
A backend rollback does not clear the encrypted IndexedDB vault on client devices. After a backend rollback:
- Expired offline drafts remain strictly deleted based on the 5-year limit; rollback does not extend retention.
- Offline drafts must be revalidated before sync.
- Resolving referencing errors to lost backend objects must use the approved conflict-resolution UI without silently overwriting restored server data.

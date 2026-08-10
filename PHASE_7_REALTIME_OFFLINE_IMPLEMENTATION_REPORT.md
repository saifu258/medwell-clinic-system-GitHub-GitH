# Phase 7 Realtime, Presence, Concurrency Locks & Offline Draft Foundation
**Status**: PASS WITH CONDITIONS

## Overview
Implemented the Phase 7 database migration, API guards, and frontend architecture to support realtime polling, concurrency locks, and secure offline draft storage.

## Owner Decisions & Constraints Applied
1. **Locking Mechanism**:
   - `LOCK_TTL_SECONDS = 90`
   - `HEARTBEAT_INTERVAL_SECONDS = 30`
   - Centralized in `medwell_acquire_edit_lock` and `record_edit_locks` table.
   - The server decides expiry. A client heartbeat failure does not declare ownership without server reconciliation.
2. **Realtime Mechanism**:
   - Direct Supabase Realtime is DEFERRED due to Firebase Auth integration issues (`DIRECT_SUPABASE_REALTIME_DEFERRED_DUE_AUTH_BOUNDARY`).
   - A secure Edge API polling fallback is used instead.
   - Frontend `PollingClient` respects `visibilityState` (`document.visibilityState !== 'visible'`) to pause unnecessary polling when the browser tab is hidden, and immediately reconciles when visible.
   - Polling uses normal API authentication and does not bypass Firebase tokens.
   - `navigator.onLine` is treated as a UX signal only.
   - Full realtime presence is DEFERRED (`FULL_REALTIME_PRESENCE_DEFERRED`). Lock-owner awareness is implemented.
3. **Offline Storage & Encryption**:
   - A `PHASE_7_SECURE_SESSION_DRAFT_MODE` is implemented using Web Crypto AES-GCM and IndexedDB.
   - The Data Encryption Key (DEK) is securely generated, maintained only in `sessionStorage`, and used to encrypt drafts before saving them to IndexedDB.
   - Sensitive draft plaintext is NOT stored in local/sessionStorage.
   - Long-term offline draft key recovery (surviving a browser close) is explicitly DEFERRED as compatibility debt: `LONG_TERM_OFFLINE_DRAFT_KEY_RECOVERY_DEFERRED`.
   - Reload in the same surviving browsing session: SUPPORTED
   - Network disconnect/reconnect: SUPPORTED
   - Tab close: NOT GUARANTEED / key may be lost
   - Browser close/restart: NOT SUPPORTED
   - Logout: key intentionally cleared / recovery unavailable
   - Long-term recovery: DEFERRED
   - `PHASE_7_SECURE_SESSION_DRAFT_MODE` protects clinical drafts from plaintext persistence but trades persistence durability for key isolation. If the encrypted payload survives in IndexedDB after its key is lost, it remains physically stored but unreadable. Undecryptable drafts will be safely cleaned up/discarded, not recovered.
   - User isolation is ensured by partitioning draft IDs by `uid`.
4. **Optimistic Concurrency (Version Guard)**:
   - The `version` column (integer NOT NULL DEFAULT 1) was added to `visits` and `medical_certificates`.
   - The database automatically increments `version` on `UPDATE` via a Postgres trigger `medwell_increment_version()`. There is NO double increment in the application logic.
   - Edge API endpoints for `visits` updates now accept and enforce `expectedVersion`. Stale updates return 409 `RECORD_VERSION_CONFLICT`.
   - For `medical_certificates`, since draft UI editing is not yet built, the guard integration is marked as `CERTIFICATE_DRAFT_VERSION_GUARD_UI_INTEGRATION_DEFERRED`.
5. **Security Verifications**:
   - `medwell_acquire_edit_lock` endpoints in `index.ts` verify the resource exists and the user has correct permissions (`visits.write` or `medical_certificates.write` via `requireClinicalPractitioner`) BEFORE delegating to the lock RPC.
   - Force release is admin-only, requires a reason, and is audited via `force_release_lock`.
   - Lock table `record_edit_locks` has RLS enabled and is restricted from anon/authenticated direct access.
   - RPCs use `SECURITY DEFINER SET search_path = public, pg_temp` and proper `REVOKE EXECUTE` / `GRANT EXECUTE TO service_role` patterns.
   - Online-only operations like workflow transitions and billing remain synchronously processed at the server. No generic offline mutation queue reports success for them.

## Files Added / Modified
The following exact files were created/modified in Phase 7:
- `M .gitignore`
- `M supabase/functions/api/index.ts`
- `?? PHASE_7_REALTIME_OFFLINE_IMPLEMENTATION_NOTES.md`
- `?? PHASE_7_REALTIME_OFFLINE_IMPLEMENTATION_REPORT.md`
- `?? public/assets/js/offline/draftRecovery.js`
- `?? public/assets/js/offline/encryptedDraftStore.js`
- `?? public/assets/js/realtime/networkState.js`
- `?? public/assets/js/realtime/pollingClient.js`
- `?? public/assets/js/realtime/recordLocks.js`
- `?? supabase/migrations/20260810140145_phase7_realtime_offline_foundation.sql`
- `?? task.md`

## Tests Executed
- Node API unit tests: **PASS** (18 tests)
- Deno static check: **PASS** (`npx deno-bin@2.2.7 check supabase/functions/api/index.ts` succeeded without errors)
- Deno pure: **SKIPPED** (No Deno pure tests authored)
- PostgreSQL RPC integration: **SKIPPED** (Local Supabase/Docker unavailable)
- Concurrency: **SKIPPED** (Requires integration test harness)
- Playwright E2E: **SKIPPED** (Local Web Server unavailable)
- Secret scan: **SKIPPED** (Tool unavailable)

## Next Steps
PASS WITH CONDITIONS — READY FOR PHASE 7 GIT REVIEW

Ready for owner Git review.

Phase 8 must not start until:
- Phase 7 staged diff reviewed
- commit succeeds
- push succeeds
- main matches origin/main
- working tree clean

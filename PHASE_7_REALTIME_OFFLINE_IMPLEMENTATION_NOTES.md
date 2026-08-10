# Phase 7: Realtime & Offline Foundation — Audit & Findings

## 1. Existing Realtime & Polling Logic
- **Realtime / Supabase Channels:** None. There is zero usage of Supabase Realtime subscriptions, Websockets, or `BroadcastChannel` in the current codebase.
- **Polling:** None. The application currently relies on hard page loads or manual navigation clicks to refresh data (e.g., clicking on the Queue page fetches the queue once).
- **Concurrency / Locking:** None. There are no mechanisms preventing two users from opening the same visit or invoice and overwriting each other's changes.
- **Optimistic UI:** There are no optimistic UI mechanisms or version guards in place.

## 2. Existing Offline & Storage Logic
- **`localStorage`:** Only used for non-sensitive UX state: `medwell_email` (remember me for login) and `medwell_locale` (i18n).
- **`IndexedDB`:** Not used.
- **Offline Mode:** Not supported. `navigator.onLine` is not monitored.

## 3. Realtime Authentication Assessment
- The application uses Firebase Authentication for all client-side authentication, passing the Firebase ID token in the `Authorization: Bearer` header to the Supabase Edge API.
- Supabase Realtime requires a valid Supabase JWT to authenticate channels securely if RLS is to be applied at the socket level.
- Since we are not using Supabase Auth (and the Owner explicitly stated "Do NOT migrate authentication to Supabase Auth merely to enable realtime"), direct secure Supabase Realtime subscriptions cannot easily leverage RLS based on the user's role without a complex custom JWT minting bridge.
- **Architectural Conclusion:** To maintain the strict security boundary (Edge API -> `service_role` -> DB) and avoid leaking sensitive row data, we must use a safer signal-only approach or fallback to polling. Direct table publication (`supabase_realtime` publication) of sensitive clinical data should NOT be done because the client lacks a Supabase JWT to enforce RLS on the socket.

## 4. Planned Changes for Phase 7
1. **Connectivity Manager:** A centralized `networkState.js` to monitor `navigator.onLine` and `visibilityState`.
2. **Polling Fallback:** A safe, visible-tab-only polling mechanism (`pollingClient.js`) to refresh queue, active visits, and billing status every 10-15 seconds.
3. **Edit Locks:** A new database table `record_edit_locks` with Edge API RPCs (`medwell_acquire_edit_lock`, `medwell_refresh_edit_lock`, `medwell_release_edit_lock`) for pessimistic locking of clinical drafts.
4. **Optimistic Versioning:** Adding `version` columns to high-risk mutable records (`visits`, `medical_certificates`).
5. **Offline Encrypted Drafts:** `encryptedDraftStore.js` utilizing IndexedDB and Web Crypto API (AES-GCM) to safely store unsaved clinical drafts when offline or lock is lost.
6. **Multi-Tab Coordination:** `BroadcastChannel` to synchronize lock states across same-origin tabs.

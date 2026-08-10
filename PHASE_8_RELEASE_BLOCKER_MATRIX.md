# Phase 8: Release Blocker Matrix

## Categories & Definitions

| Priority | Definition | Release Impact |
| :--- | :--- | :--- |
| **Critical** | Major security bypass, severe financial ledger corruption, data loss. | **BLOCKS STAGING & PROD** |
| **High** | UI bugs preventing core workflows, performance crashes, PII leaks. | **BLOCKS STAGING & PROD** |
| **Medium** | Missing translations, edge-case UI glitches, minor UX degradation. | Blocks Prod, allows Staging |
| **Low** | Code style issues, deferred refactoring, minor padding issues. | Allows Staging & Prod |
| **Deferred** | Features explicitly moved out of scope per architectural design. | Allows Staging & Prod |

---

## Identified Blockers Matrix

### Critical Blockers
*These must result in `FAIL — BLOCKED` if encountered.*

1. **Authentication Bypass**: Edge API accepts requests without a valid verified Firebase ID token.
2. **RBAC Bypass / Privilege Escalation**: `clinic_assistant` acts as a clinical author, or `admin` writes clinical data directly without practitioner license.
3. **Double Payment / Ledger Corruption**: A duplicate payment is successfully recorded for a single idempotent intent.
4. **Duplicate Document Numbering**: Medical Certificates or Receipts assign the same high-water sequence number twice under concurrency.
5. **Lost Update / Stale Overwrite**: A client overwrites an actively modified visit without triggering `RECORD_VERSION_CONFLICT`.
6. **Plaintext Sensitive Draft Persistence**: Web Crypto fails and saves clinical plaintext to `localStorage` or unencrypted `IndexedDB`.
7. **Service Role Leak**: `service_role` or `SUPABASE_SERVICE_ROLE_KEY` is exposed in browser bundles or public configurations.
8. **Direct Table Manipulation**: Anon/Authenticated users bypass RLS and mutate tables directly without the Edge API.

### High Blockers
1. **Migration Apply Failure**: Running `supabase db push` with Phase 2-7 migrations crashes or fails on constraints.
2. **PII Minimization Failure**: Full Citizen IDs are routinely sent to unauthorized clients for list views.
3. **Missing Workflow Validation**: A visit skips from Registration directly to Completed without Billing.
4. **Offline Mutation Success**: High-risk financial operations (like payments) queue offline and return faux-success without syncing.

### Deferred (Compatibility Debt)
*These do NOT block release, but must be tracked.*

1. **Long-Term Offline Draft Key Recovery**: `LONG_TERM_OFFLINE_DRAFT_KEY_RECOVERY_DEFERRED` (Draft keys drop on browser close).
2. **Direct Supabase Realtime**: `DIRECT_SUPABASE_REALTIME_DEFERRED_DUE_AUTH_BOUNDARY` (Polling fallback in use).
3. **Full Realtime Presence**: `FULL_REALTIME_PRESENCE_DEFERRED` (Only lock ownership visibility).
4. **Certificate Draft Version Guard UI**: `CERTIFICATE_DRAFT_VERSION_GUARD_UI_INTEGRATION_DEFERRED` (Draft MC UI not yet built).

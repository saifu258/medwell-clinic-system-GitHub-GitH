# Database Authorization Execution Model

Firebase Authentication remains the selected identity provider. Every request must include a Firebase ID token. The Firebase ID token must be cryptographically verified and restricted to the approved Firebase project. The verified Firebase UID must be mapped to an active internal MEDWELL user account. Roles and action-level permissions must be loaded from trusted server-side data. The browser must never be trusted to provide its own role, permission, actor ID, branch scope, or approval level.

## Required Execution Paths (Pending Phase 0 Decision)

Phase 0 must perform a security proof-of-concept and select exactly one primary execution path.

### Execution Path A — Caller-scoped identity with RLS
```
Browser
→ Firebase Authentication
→ Verified Firebase token
→ Supabase-supported third-party authentication integration
→ Authenticated database role
→ Database grants
→ RLS policies
→ PostgreSQL
```
This path may be used only if Phase 0 confirms that:
- Firebase third-party authentication is supported by the current Supabase configuration.
- Firebase claims are correctly visible to PostgreSQL.
- Requests run as a non-bypass database role.
- RLS policies receive the expected user identity.
- Disabled users are rejected.
- Incorrect Firebase project tokens are rejected.
- Direct database access remains restricted by RLS and grants.

### Execution Path B — Edge Functions with restricted database RPCs
```
Browser
→ Firebase Authentication
→ Firebase ID Token
→ Edge Function verifies token
→ Internal user and permission lookup
→ Restricted transactional RPC
→ Explicit server-side authorization
→ PostgreSQL transaction
```
This path may be used when the browser is not permitted to access Supabase Data APIs directly.

**Critical Requirements for Path B:**
- RLS must not be assumed to protect a service-role connection. 
- Never describe `SET LOCAL request.jwt.claims` as sufficient to activate RLS on a bypass connection.
- Every privileged RPC must explicitly verify the actor, permission, record scope, branch scope, expected state, and idempotency key.
- The RPC must record the audit event in the same transaction as the business operation.

## Required Trust Rules
- Never trust `role` from the browser.
- Never trust `permission` from the browser.
- Never trust `actor_id` from the request body.
- Never trust `branch_id` from the request body without validating scope.
- Never use frontend visibility as authorization.
- Never expose the Supabase service-role key.
- Never expose Firebase Admin credentials.
- Never expose Translation API secrets.
- Never describe `SET LOCAL request.jwt.claims` as sufficient to activate RLS on a bypass connection.

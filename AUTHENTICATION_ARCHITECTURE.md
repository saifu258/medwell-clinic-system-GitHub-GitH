# Authentication Architecture

Firebase Authentication remains the selected identity provider. Every request must include a Firebase ID token. The Firebase ID token must be cryptographically verified and restricted to the approved Firebase project. The verified Firebase UID must be mapped to an active internal MEDWELL user account. Roles and action-level permissions must be loaded from trusted server-side data. The browser must never be trusted to provide its own role, permission, actor ID, branch scope, or approval level.

## Database Authorization Execution Path
The final database authorization execution path remains `PENDING PHASE 0 SECURITY PROOF-OF-CONCEPT`. Phase 0 will evaluate the feasibility of Execution Path A (Caller-scoped identity with RLS) vs Execution Path B (Edge Functions with restricted database RPCs).

*Note: RLS must not be assumed to protect a service-role connection.*

## Audit Identity
Every sensitive audit event must include:
- `firebase_uid`
- `internal_user_id`
- `active_role_assignment_id`
- `role_code`
- `branch_id`
- `request_id`
- `session_id` (when available)
- `operation`
- `entity_type`
- `entity_id`
- `occurred_at`
- `success`
- `error_code`

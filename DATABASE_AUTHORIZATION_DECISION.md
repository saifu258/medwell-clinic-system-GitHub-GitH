# Database Authorization Decision

**Decision Date**: 2026-08-06
**Result**: `PASS`
**Selected Execution Path**: `Execution Path B — Edge Functions with restricted database RPCs`

## Rationale
The Phase 0 POC confirmed that 100% of Edge Function requests already utilize the `SUPABASE_SERVICE_ROLE_KEY` (bypassing RLS) and verify Firebase tokens locally using `jose`. 

Attempting to implement **Execution Path A** would require generating a Custom JWT inside the Edge Function on every request and passing it down to Supabase to enforce RLS natively, forcing a massive rewrite of `db.ts` and removing the current `createClient` singleton pattern.

Therefore, **Execution Path B** is the most feasible path. 
Under Path B, we accept that the Edge Function operates with elevated privileges, but we enforce security by requiring that all critical business logic is wrapped in explicit PostgreSQL RPCs, where actor identity, branch scope, and permissions are validated within the transaction itself.

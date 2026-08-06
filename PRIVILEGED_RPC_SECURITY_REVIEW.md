# Privileged RPC Security Review

**Review Date**: 2026-08-06
**Result**: `PASS` (Review completed, vulnerability documented)

## Current State Analysis
Under Execution Path B, all privileged RPCs must verify the actor and explicitly record the audit event in the *same transaction* as the business operation.

Upon reviewing `index.ts`, we discovered that operations are currently executed sequentially across multiple HTTP calls to Supabase, rather than being wrapped in a single transactional RPC:
```typescript
const { data, error } = await db.from("patients").insert({...}).select().single(); 
await audit(request, profile, "create", "patients", data.patient_id); 
```

## Security Vulnerability
If the edge function crashes or times out after the `insert` but before the `audit` function completes, the action will persist in the database but leave no trace in the `audit_logs` table.

## Mandated Fix for Phase 1
To satisfy the strict requirements of Execution Path B, the separate `insert`/`update` and `audit` commands must be replaced with PostgreSQL RPCs (`CREATE FUNCTION`).
For example, a new RPC `medwell_create_patient` must accept the patient payload alongside the `actor_uid` and perform both the `INSERT INTO patients` and `INSERT INTO audit_logs` inside a single implicit `BEGIN ... COMMIT` block.

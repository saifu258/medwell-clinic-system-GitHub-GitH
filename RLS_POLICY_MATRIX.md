# Row Level Security (RLS) Policy Matrix

## Execution Dependency
The enforcement mechanism for RLS depends entirely on the outcome of the Phase 0 Security Proof-of-Concept.

**If Execution Path A is selected:**
RLS will inherently protect queries because requests run as a non-bypass database role tied to the verified identity.

**If Execution Path B is selected:**
RLS CANNOT be assumed to protect service-role connections. Every privileged Edge Function RPC must explicitly verify the actor, permission, record scope, branch scope, expected state, and idempotency key manually before executing operations. The `SET LOCAL request.jwt.claims` approach is deemed insufficient for authorization on a bypass connection.

## Expected Policies (Path A Assumption)

### Table: `users`
- **Select**: Allow if `role = admin` OR `internal_user_id = auth.uid()`.
- **Insert/Update**: Allow if `role = admin`.

### Table: `patients`
- **Select**: Allow if `role IN ('admin', 'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant')`.
- **Insert/Update**: Allow if `role IN ('admin', 'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant')`.
- **Delete**: Allow if `role = admin`.

### Table: `clinical_assessments`
- **Select**: Allow if `role IN ('admin', 'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant')`.
- **Insert/Update**: Allow if `role IN ('admin', 'physiotherapist', 'thai_traditional_practitioner')`.

### Table: `medical_certificates`
- **Select**: Allow if `role IN ('admin', 'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant')`.
- **Insert**: Allow if `role IN ('admin', 'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant')` (Draft creation).
- **Update**: 
  - Allow state `draft -> under_review` for `clinic_assistant`.
  - Allow state `under_review -> approved -> issued` ONLY for `admin`, `physiotherapist`, `thai_traditional_practitioner`.
  - Allow state `voided` ONLY for `admin`, `physiotherapist`, `thai_traditional_practitioner`.

### Table: `invoices` & `receipts`
- **Select**: Allow if `role IN ('admin', 'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant')`.
- **Insert**: Allow for `clinic_assistant`, `admin`.
- **Update**: DENY ALL. 

### Table: `audit_logs`
- **Select**: Allow if `role = admin`.
- **Insert**: Allow ALL roles.
- **Update/Delete**: DENY ALL.

# Phase 8: System Integration & Architectural Audit
This document catalogs the integration validations of Phase 2–7 logic, confirming authorization boundaries, RBAC roles, and RPC security rules.

## 1. Role Boundaries & Identity
The identity flow is strictly enforced at the Edge API layer. The browser sends a Firebase ID token, which is decoded. The Edge layer relies solely on the verified identity and its backend configuration (`profiles` table) for roles.
Browser-provided roles are ignored.

**Target Roles Validated:**
- `admin`: Permitted administrative overrides, force-release locks, global operations.
- `physiotherapist` & `thai_traditional_practitioner`: The ONLY roles permitted to be clinical authors.
- `clinic_assistant`: Strict boundary enforcement. Can manage queue, registration, initial screening, and financial workflow but CANNOT claim clinical authorship.
- `pending_role_review`: Migration-only state. Unprivileged.
*(Legacy roles like `doctor` or `pharmacist` receive no unintended active authority unless retained strictly for backward compatibility.)*

## 2. Privileged RPC Security Inventory
All sensitive mutation logic is encapsulated in Postgres RPCs running as `SECURITY DEFINER`.

| RPC Name | Associated Phase | Security Pattern Verified? |
| :--- | :--- | :--- |
| `medwell_workflow_transition` | Phase 3 | Yes (`SECURITY DEFINER`, `GRANT EXECUTE TO service_role`) |
| `medwell_consume_course_session` | Phase 4 | Yes |
| `medwell_reverse_course_session` | Phase 4 | Yes |
| `medwell_purchase_course_enrollment` | Phase 4 | Yes |
| `medwell_record_payment` | Phase 5 | Yes |
| `medwell_issue_refund` | Phase 5 | Yes |
| `medwell_close_business_day` | Phase 5 | Yes |
| `medwell_issue_medical_certificate` | Phase 6 | Yes |
| `medwell_cancel_medical_certificate` | Phase 6 | Yes |
| `medwell_acquire_edit_lock` | Phase 7 | Yes |
| `medwell_force_release_edit_lock` | Phase 7 | Yes |

*All above functions explicitly `REVOKE EXECUTE FROM PUBLIC/anon/authenticated` to prevent direct REST/GraphQL invocation bypasses.*

## 3. RLS Enforcement
Row Level Security (RLS) is ENABLED on critical operational tables, meaning `anon` and `authenticated` roles cannot bypass the Edge API by calling Supabase PostgREST directly. The Edge API acts using the `service_role` (via `db.ts` utilizing `SUPABASE_SERVICE_ROLE_KEY` environment variable).

**Audited Tables (RLS ENABLED):**
- `profiles`
- `visits`
- `treatment_programs`
- `course_products` & `course_enrollments`
- `visit_treatments` & `course_usage_history`
- `invoices`, `payments`, `refunds`, `expenses`
- `medical_certificates` & `user_professional_profiles`
- `record_edit_locks`

## 4. Clinical Workflow Integrity
The canonical workflow: `Registration -> Screening -> H&P -> Treatment Program -> Next Appointment -> Summary & Billing -> Completed` is enforced by API state checks (`expectedVersion` and `workflow_stage` mutations).
- Mandatory Pharmacy Stage is NOT present.
- Workflow stage skipping via stale UI or API manipulation is blocked via strict server-side transition checks in `medwell_workflow_transition`.

## 5. Financial & Concurrency Integrity
- **Double Consumption**: `medwell_consume_course_session` employs deterministic deductions that reject double requests.
- **Payment Idempotency**: Edge logic verifies `idempotencyKey` explicitly mapped during payment creation.
- **Record Concurrency**: `expectedVersion` is required for visit updates. `medwell_increment_version` trigger handles increments without double-updating.
- **Locks**: Lock TTL is strictly 90s, force release is admin-only, and UI integration (via `recordLocks.js`) respects these statuses.

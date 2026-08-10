# Phase 3 Clinical Workflow Implementation Report

## Status
**PASS WITH CONDITIONS — FINAL CORRECTIONS APPLIED**

- Baseline Commit: `8651e76`
- Phase 2 status was `PASS WITH CONDITIONS`.
- This phase implements the foundation for the MEDWELL clinical workflow (Registration → Screening → History & Physical → Treatment Program → Next Appointment → Summary & Billing → Completed).
- Security and design corrections were applied to ensure workflow boundary integrity, strict schema-based gates, explicit authorship evidence, and correct endpoint isolation.

> [!WARNING]
> **No deployments or data mutations were performed.** The database migration was created locally under supabase/migrations and not applied.

---

## 1. Schema & Modeling

### Exact Schema Inspected
We thoroughly audited the `public.visits`, `public.screenings`, `public.queues`, `public.appointments`, `public.invoices`, `public.payments`, and `public.audit_logs` tables to ensure existing fields are reused where appropriate.

### Existing Fields Reused
- **Screening:** `screenings.chief_complaint`, `screenings.created_by`
- **Treatment:** `visits.treatment_plan`
- **Metadata:** `visits.created_by`, `visits.closed_at`, `visits.closed_by`
- **Billing:** `invoices.balance`, `invoices.status`

### New Fields Added
Additive changes were made to `public.visits` via `20260810090218_phase3_clinical_workflow_foundation.sql`:
- `workflow_stage` (text)
- `stage_started_at` (timestamptz)
- `stage_completed_at` (timestamptz)
- `completed_at` (timestamptz)
- `next_appointment_decision` (text)
- `next_appointment_id` (uuid)
- `next_appointment_recorded_by` (text)
- `next_appointment_recorded_at` (timestamptz)
- `hp_recorded_by` (text)
- `hp_recorded_at` (timestamptz)
- `visit_summary` (text)
- `visit_summary_recorded_by` (text)
- `visit_summary_recorded_at` (timestamptz)

> [!NOTE]
> **Implementation Error Corrected:** A previous version of the migration incorrectly attempted to add `closed_at` and `closed_by`, which already existed in the baseline schema. This implementation error was identified and the SQL migration has been corrected to remove the redundant column additions.

### Workflow Status Removed
Confirmation: **`workflow_status` was removed from the schema completely.**
The existing `visit_status` covers operational high-level states (`open`, `in_consultation`, `completed`, `cancelled`). `workflow_stage` strictly tracks the clinical progression. The duplicate undefined field was purged from the migration.

### Legacy and New Visit Initialization
- **Legacy Visits:** Remain `workflow_stage = NULL`. The API explicitly rejects state machine transitions for legacy visits.
- **New Visits:** `medwell_open_visit` securely initializes `workflow_stage = 'registration'`.

---

## 2. API Security Boundaries

### Generic Visit PUT Protected-Field Allowlist
The generic `PUT /visits/:id` API explicitly rejects client payloads containing protected workflow lifecycle fields (e.g., `workflow_stage`, `visit_status`, `hp_recorded_by`, `visit_summary_recorded_by`). Violations are rejected with `400 VALIDATION_ERROR`.

### Legacy `/complete` Bypass Fixed
The existing legacy endpoint `POST /visits/:id/complete` was updated to perform a DB check. Target-workflow visits (`workflow_stage IS NOT NULL`) are securely blocked with `409 WORKFLOW_COMPLETION_REQUIRED`.

### Dedicated Workflow Endpoints
Data that requires verified authorship and phase context are now strictly routed through dedicated endpoints:
- `POST /visits/:id/workflow/history-physical`
- `POST /visits/:id/workflow/next-appointment`
- `POST /visits/:id/workflow/summary`
These endpoints safely set internal authorship metrics (`hp_recorded_by`, `visit_summary_recorded_by`, etc.) using trusted Edge Auth context.

---

## 3. Workflow Gates & RBAC

### Registration Gate
Transition from `registration` to `screening` requires:
- `patient_id`
- Initial authorship evidence (`created_by`, `created_at`)

### Screening Evidence Gate
Transition from `screening` to `history_physical` requires:
- An actual `public.screenings` record must exist and be linked to the visit's queue.
- The `screenings` record must possess a populated `created_by` and `created_at`.
- Generic `visits.updated_by` is NO longer accepted as proof of screening execution.

### H&P Evidence Gate
Transition to `treatment_program` requires:
- `present_illness` or `physical_examination` content.
- Explicit H&P authorship via the dedicated fields: `hp_recorded_by` and `hp_recorded_at`.

### Treatment Program Gate
- Clinic Assistant restrictions: Transition into `next_appointment` is restricted to practitioner roles (`admin`, `physiotherapist`, `thai_traditional_practitioner`). `clinic_assistant` is explicitly rejected.
- Requires `treatment_plan` to be populated.

### Next Appointment Gate
Requires explicit `next_appointment_decision`. The dedicated backend endpoint strictly restricts writes to the `next_appointment` stage only, and validates that if `appointment_created` is chosen, a valid `appointmentId` that belongs to the same patient must be provided.

### Visit Summary Gate
Transition to `completed` explicitly checks for the presence of `visit_summary` and its dedicated authorship variables (`visit_summary_recorded_by`, `visit_summary_recorded_at`).

### Zero-Invoice Billing Behavior
Billing evaluation strictly counts `invoices`. If exactly `0` invoices exist, completion is safely blocked with `BILLING_GATE_COMPATIBILITY_DEBT` (forcing all target visits to be billed until explicit no-charge logic is developed). For >0 invoices, all active invoices must have `balance <= 0`.

---

## 4. Sub-system Integration

### Queue Relationship
Queue status (`queues.current_status`) remains operational. Target workflow completion securely routes the queue directly to `completed`, completely bypassing the legacy `waiting_pharmacy` logic.

### Audit Traceability
Transition events cleanly record `clinical_workflow_transition` into `public.audit_logs`, tracking the actor, role context, `visit_id`, and transition string using the backend RPC context.

---

## 5. Automated Tests & Quality

### Node.js Unit Tests
- `npm test` runs standard Node test files (`tests/unit/*.test.mjs`).
- **Result:** 20/20 PASSED.

### Deno Static Check
- `npx deno-bin@2.2.7 check supabase/functions/api/index.ts`
- **Result:** PASSED.

### PostgreSQL RPC Integration Tests (Deno)
- `workflow_test.ts` has been fully rewritten with truthful gate mocks, state protection isolation, and explicit testing of 15+ paths (Invalid Jumps, RBAC Denials, Missing Invoices, Full Valid Flows).
- **Result:** **SKIPPED**. PostgreSQL RPC integration tests skipped because local Docker/Supabase is unavailable.

### Playwright E2E Tests
- Scaffolded for gating and RBAC.
- **Result:** **SKIPPED**. Playwright E2E skipped because the Python webServer dependency is unavailable.

---

## 6. Known Compatibility Debt
- **Zero-Invoice Billing**: Target visits without any generated invoice cannot currently be closed. A dedicated no-charge flow needs to be implemented.
- **Multi-visit Packages**: Complex packaging billing evaluation is deferred to future financial iterations.

---

## 7. Execution Constraints Checklist
- [x] No git add
- [x] No commit
- [x] No push
- [x] No production migration
- [x] No deployment
- [x] No production data changes

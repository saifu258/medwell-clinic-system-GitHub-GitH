# Phase 4 Treatment & Course Implementation Notes

## 1. Actual Existing Schema Audit
Based on `20260801202355_medwell_initial_schema.sql` and `20260810090218_phase3_clinical_workflow_foundation.sql`:
- **Treatments**: There is no structured `treatments` table. Clinical treatment is recorded only as a free-text `treatment_plan` field in `public.visits`.
- **Courses/Packages**: There are absolutely no tables representing courses, packages, or enrollments.
- **Services**: The `public.services` table exists with `service_id`, `service_code`, `service_name`, `category`, `standard_price`. This models one-off billing items (e.g. 'ค่าตรวจแพทย์').
- **Billing**: `public.invoices` and `public.invoice_items` exist. `invoice_items` uses a flexible polymorphism model: `item_type`, `reference_id`, `item_code`, `item_name`. This allows us to link invoice items to either single treatments (`visit_treatment_id`) or course purchases (`course_enrollment_id`).
- **Phase 3 Workflow**: Uses `medwell_workflow_transition` which locks the visit table and updates `workflow_stage`. The `treatment_program` gate currently validates the free-text `treatment_plan`.

## 2. Existing Treatment Structures
- The only structured tracking of a visit's clinical resolution is `present_illness`, `physical_examination`, and `treatment_plan` strings in the `visits` table.

## 3. Existing Service Pricing Model
- Services are flat fee, based on `standard_price`. We can mirror this for Standard Treatment Programs, or link Treatment Programs to `services` implicitly via billing. However, creating a dedicated `treatment_programs` table (as requested) is cleaner to separate clinical definitions from generic clinic services.

## 4. Existing Invoice Linkage
- Invoices are linked to `visit_id` and `patient_id`.
- `invoice_items` links via `item_type` and `reference_id` text.
- To link a single treatment, we can set `item_type = 'treatment'`, `reference_id = <visit_treatment_id>`.
- To link a course purchase, we can set `item_type = 'course_purchase'`, `reference_id = <enrollment_id>`.

## 5. Reusable Components
- Backend endpoints for `visits` provide an RBAC foundation (`requirePermission`, `audit` functions).
- `medwell_workflow_transition` provides robust atomic transitions, but we will need to extend the `treatment_program` gate to look for structured treatments (or maintain compatibility with the free-text field).

## 6. Schema Gaps & Planned Additive Changes
We need 5 new core tables:
1. **`treatment_programs`**: Clinical definitions (e.g., Ultrasound, Thai Massage).
2. **`course_products`**: Commercial definitions (e.g., 5 Sessions PT).
3. **`course_enrollments`**: Patient's purchased package instances (tracks total/used/balance).
4. **`course_usage_history`**: Immutable ledger of session deduction (anti-double-deduction enforced here).
5. **`visit_treatments`**: Clinical event of what was performed at a visit.

## 7. Migration Risks
- **Phase 3 Gate Compatibility**: If we change the `treatment_program` -> `next_appointment` gate to require `visit_treatments`, legacy visits missing a structured treatment but having `treatment_plan` text will be blocked. **Mitigation**: Require either a `visit_treatments` record OR fallback to checking `treatment_plan` text for compatibility.
- **Zero Invoice Compatibility Debt**: Phase 3 blocked completion if `invoice_count = 0`. If a visit uses a course, it might legitimately have `0` invoices. **Mitigation**: We must extend the RPC logic to allow `invoice_count = 0` IF the visit has a structured `visit_treatment` that is covered by an active course, and NO additional un-billed treatments exist.

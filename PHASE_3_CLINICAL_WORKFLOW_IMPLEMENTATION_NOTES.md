# PHASE 3 CLINICAL WORKFLOW IMPLEMENTATION NOTES

## 1. Verified Actual Schema Before Implementation

### Visits (`public.visits`)
- **Primary Key**: `visit_id`
- **Linkages**: `patient_id`, `queue_id`, `appointment_id`, `doctor_uid`
- **Clinical Data Fields**: `chief_complaint`, `present_illness`, `past_history`, `family_history`, `social_history`, `physical_examination`, `assessment`, `diagnosis`, `diagnosis_code`, `treatment_plan`, `doctor_note`
- **Workflow / Status**: `follow_up_date`, `visit_status` (CHECK in 'open','in_consultation','completed','cancelled')
- **Metadata**: `closed_at`, `closed_by`, `cancellation_reason`, `created_at`, `created_by`, `updated_at`, `updated_by`

### Screenings (`public.screenings`)
- **Primary Key**: `screening_id`
- **Linkages**: `queue_id`, `patient_id`
- **Data Fields**: `weight`, `height`, `bmi`, `temperature`, `pulse`, `respiratory_rate`, `systolic`, `diastolic`, `spo2`, `pain_score`, `chief_complaint`, `initial_history`, `drug_allergies`, `pregnancy`, `nurse_notes`, `alerts`
- **Metadata**: `created_at`, `created_by`, `updated_at`, `updated_by`

### Queues (`public.queues`)
- **Primary Key**: `queue_id`
- **Linkages**: `patient_id`, `appointment_id`
- **Queue State**: `current_status` (CHECK in 'waiting','screening','waiting_doctor','in_consultation','waiting_pharmacy','waiting_payment','completed','cancelled'), `current_station`
- **Metadata**: `check_in_time`, `called_time`, `call_count`, `completed_time`, `created_by`, `updated_by`

### Appointments (`public.appointments`)
- **Primary Key**: `appointment_id`
- **Linkages**: `patient_id`, `doctor_uid`
- **Data Fields**: `appointment_date`, `start_time`, `end_time`, `appointment_type`, `reason`, `notes`
- **Status**: `status` (CHECK in 'scheduled','confirmed','checked_in','completed','cancelled','no_show')

### Invoices (`public.invoices`)
- **Primary Key**: `invoice_id`
- **Linkages**: `visit_id`, `patient_id`
- **Financial Fields**: `subtotal`, `discount`, `tax`, `grand_total`, `paid_amount`, `balance`
- **Status**: `status` (CHECK in 'draft','unpaid','partially_paid','paid','void')

### Payments (`public.payments`)
- **Primary Key**: `payment_id`
- **Linkages**: `invoice_id`
- **Fields**: `amount`, `payment_method`, `reference_number`, `idempotency_key`

### Audit Logs (`public.audit_logs`)
- **Fields**: `log_id`, `occurred_at`, `user_uid`, `user_name`, `roles`, `action`, `module`, `record_type`, `record_id`, `description`, `ip_address`, `user_agent`, `success`, `error_code`

## 2. Evidence for Workflow Gates (Actual Schema Mapping)

- **Registration Gate**:
  - Valid Patient Association: `visits.patient_id` must not be null.
  - Registration Actor Evidence: `visits.created_by` and `visits.created_at`.
- **Screening Gate**:
  - Required Field: `visits.chief_complaint` OR (`screenings.chief_complaint` where `screenings.queue_id = visits.queue_id`).
  - Recorder/Timestamp: `screenings.created_by` / `screenings.created_at` OR `visits.updated_by` if screening recorded directly into visit.
- **History & Physical (H&P) Gate**:
  - Required Field: `visits.present_illness` OR `visits.physical_examination`.
  - Authorship: `visits.updated_by`, `visits.updated_at` (since any allowed role can author it).
- **Treatment Program Gate**:
  - Required Field: `visits.treatment_plan`.
- **Next Appointment Gate**:
  - Existing DB lacks explicit "No follow-up required" decision linking to an actor.
  - Required New Fields in `public.visits`: `next_appointment_decision` (text: 'appointment_created', 'not_required'), `next_appointment_id` (uuid references appointments), `next_appointment_recorded_by` (text references users), `next_appointment_recorded_at` (timestamptz).
  - Check: If 'appointment_created', `next_appointment_id` must not be null.
- **Summary & Billing Gate**:
  - Check `invoices` table for `visit_id`.
  - Condition: All invoices linked to this visit must have `balance = 0` OR `status = 'paid'`.

## 3. Workflow State vs Visit Status
- The 7-stage workflow is purely clinical progression (`workflow_stage`).
- The `visit_status` covers the high-level lifecycle (`open`, `in_consultation`, `completed`, `cancelled`).
- We DO NOT need to add `workflow_status` because `visit_status` already covers it.
- **Cancelled Visits**: If `visit_status = 'cancelled'`, no workflow transitions are allowed. A cancelled visit is NOT completed.
- **Queue Status**: `queues.current_status` remains for operational tracking (waiting, screening, etc.) but is NOT the clinical workflow authority.
- **Pharmacy**: Pharmacy remains an independent module. It is NOT part of the 7-stage workflow.

## 4. Legacy and New Visit Initialization
- **Legacy Visits**: Additive schema change adds `workflow_stage` (nullable). Existing visits remain `workflow_stage = NULL`.
- **New Visits**: The trusted backend RPC `medwell_open_visit` will be modified to explicitly initialize `workflow_stage = 'registration'`.
- The transition API will distinguish target workflow visits (`workflow_stage IS NOT NULL`) from legacy visits (`workflow_stage IS NULL`).

## 5. Security & Trust Boundaries
- **Edge API Authority**: The API (`index.ts`) will extract `uid` and `roles` from the verified Firebase token.
- **RPC Transition**: The API will call a new RPC `medwell_workflow_transition(p_visit_id, p_expected_stage, p_target_stage, p_actor, p_actor_roles)`.
- Client-supplied roles or UIDs are rejected.
- Concurrency control uses `expectedCurrentStage` and `SELECT ... FOR UPDATE` inside the RPC.

## 6. Clinic Assistant Treatment Restrictions
- Clinic assistants can record H&P.
- They CANNOT transition from `history_physical` -> `treatment_program` or author treatment plans unless specifically authorized (Phase 3 defines they cannot perform practitioner treatment functions).

## 7. Migration Approach
- Add columns: `workflow_stage`, `stage_started_at`, `stage_completed_at`, `next_appointment_decision`, `next_appointment_id`, `next_appointment_recorded_by`, `next_appointment_recorded_at`.
- Add CHECK constraint on `workflow_stage` allowing 'registration', 'screening', 'history_physical', 'treatment_program', 'next_appointment', 'summary_billing', 'completed'.
- `workflow_stage` remains nullable for backward compatibility with legacy visits.

# Workflow Transition Matrix

The `transition_entity_status` server-side function handles all state changes using optimistic concurrency (`version` field) and row locks.

## Core Patient Journey Statuses
`registered` → `waiting_screening` → `screening_in_progress` → `waiting_clinical_assessment` → `clinical_assessment_in_progress` → `waiting_treatment` → `treatment_in_progress` → `waiting_summary` → `waiting_next_appointment` → `waiting_billing` → `partially_paid` / `completed`

| Current Status | Action | Next Status | Allowed Roles | Conditions |
| :--- | :--- | :--- | :--- | :--- |
| `registered` | Check-in | `waiting_screening` | Assistant, Admin | Appointment valid for today. |
| `waiting_screening` | Start Screening | `screening_in_progress` | Assistant, PT, Thai Med, Admin | None. |
| `screening_in_progress` | Finalize Screening | `waiting_clinical_assessment` | Assistant, PT, Thai Med, Admin | Vitals and required screening fields filled. |
| `waiting_clinical_assessment`| Start Assessment | `clinical_assessment_in_progress`| PT, Thai Med, Admin | Only clinical roles. |
| `clinical_assessment_in_progress`| Finalize Assessment| `waiting_treatment` | PT, Thai Med, Admin | Assessment signed and saved. |
| `waiting_treatment` | Start Treatment | `treatment_in_progress` | PT, Thai Med, Admin | Treatment program selected. |
| `treatment_in_progress` | Complete Treatment | `waiting_summary` | PT, Thai Med, Admin | Treatment notes saved. |
| `waiting_summary` | Sign Summary | `waiting_next_appointment` | PT, Thai Med, Admin | Summary signed. |
| `waiting_next_appointment`| Skip/Set Appt | `waiting_billing` | Assistant, PT, Thai Med, Admin | Appointment form submitted or explicitly bypassed. |
| `waiting_billing` | Full Payment | `completed` | Assistant, Admin | Paid amount >= Invoice total. |
| `waiting_billing` | Partial Payment | `partially_paid` | Assistant, Admin | Paid amount < Invoice total, with outstanding balance logic applied. |
| `partially_paid` | Full Payment | `completed` | Assistant, Admin | Paid amount >= Invoice total. |

*Note: Cancelled states (`cancelled`) can be reached from any pre-billing state.*

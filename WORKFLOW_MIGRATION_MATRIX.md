# WORKFLOW MIGRATION MATRIX

## 1. Core Principles
- All active legacy queues must be reviewed and transitioned to `completed`, `cancelled`, or explicitly held before cutover.
- No active record may be silently remapped to a clinically incorrect target status.
- All historical queue and visit statuses must be preserved.
- Legacy status values will NOT be deleted in the first migration (Additive-first constraint).

## 2. Target Workflow Sequence
1. `waiting_screening` (Registration)
2. `waiting_history_physical` (Screening)
3. `waiting_treatment_program` (History and Physical Examination)
4. `waiting_next_appointment` (Treatment Program)
5. `waiting_summary_payment` (Next Appointment)
6. `outstanding_payment` (Summary and Billing)
7. `completed` (Completion)
*(State: `cancelled` is available globally)*

## 3. Transition Matrix

| Legacy Status | Auto-Mapping Allowed | Target Status | Required Precondition | Manual Review Required | Risk | Reconciliation Query |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `waiting` | NO | `waiting_screening` | Cutover approval. All active records must be cleared. | YES | Assigning patients to new flow without screening data. | `SELECT count(*) FROM queues WHERE current_status = 'waiting'` |
| `screening` | NO | `waiting_history_physical` | Cutover approval. | YES | Partial screening data could be lost in new H&P form. | `SELECT count(*) FROM queues WHERE current_status = 'screening'` |
| `waiting_doctor` | NO | `waiting_treatment_program` | Cutover approval. | YES | Misalignment between legacy doctor role and new practitioner roles. | `SELECT count(*) FROM queues WHERE current_status = 'waiting_doctor'` |
| `in_consultation` | NO | `waiting_treatment_program` | Cutover approval. | YES | Active consultation data lost if forcefully migrated. | `SELECT count(*) FROM queues WHERE current_status = 'in_consultation'` |
| `waiting_pharmacy` | NO | `waiting_summary_payment` | Manual review confirms no outstanding dispensing action remains. | YES | Incorrect conversion could bypass unfinished dispensing. | See Section 4 |
| `waiting_payment` | YES | `outstanding_payment` | Invoice generated. | NO | Invoice format mismatch. | `SELECT count(*) FROM queues WHERE current_status = 'waiting_payment'` |
| `completed` | YES | `completed` | None. | NO | None (Terminal state). | `SELECT count(*) FROM queues WHERE current_status = 'completed'` |
| `cancelled` | YES | `cancelled` | None. | NO | None (Terminal state). | `SELECT count(*) FROM queues WHERE current_status = 'cancelled'` |

## 4. Special Handling: `waiting_pharmacy`
- **Automatic mapping allowed**: NO
- **Default target candidate**: `waiting_summary_payment`
- **Required precondition**: Manual review confirms no outstanding dispensing action remains.
- **Manual review required**: YES
- **If dispensing is still incomplete**: Complete or close the legacy dispensing process before cutover.
- **Historical record behavior**: Preserve original `waiting_pharmacy` status in historical/audit data. Do not rewrite historical meaning.
- **Risk**: Incorrect conversion could bypass an unfinished medicine-dispensing operation.
- **Reconciliation**: Provide PRE-MIGRATION and POST-MIGRATION query specifications to identify all `waiting_pharmacy` records and confirm every active case received an explicit disposition.

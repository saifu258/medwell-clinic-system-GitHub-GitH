# Action-Level Permission Matrix

| Domain / Action | Admin | Physiotherapist | Thai Med | Clinic Assistant | Deprecated Roles |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User & Role** | | | | | |
| user.view | ALLOW | DENY | DENY | DENY | DENY |
| user.create/edit/disable | ALLOW | DENY | DENY | DENY | DENY |
| role.assign/approve_migration | ALLOW | DENY | DENY | DENY | DENY |
| **Patient** | | | | | |
| patient.view/create | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| patient.edit_demographics | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| patient.view_sensitive_data | ALLOW | ALLOW | ALLOW | DENY | DENY |
| patient.export/merge/archive | ALLOW | DENY | DENY | DENY | DENY |
| **Appointment & Queue** | | | | | |
| appointment.view/create/edit | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| queue.view/check_in/call | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| queue.resolve_migration | ALLOW | DENY | DENY | DENY | DENY |
| **Screening & Assessment** | | | | | |
| screening.create/edit_draft/finalize | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| assessment.create/edit_draft | ALLOW | ALLOW | ALLOW | DENY | DENY |
| assessment.finalize/sign | ALLOW | ALLOW | ALLOW | DENY | DENY |
| assessment.view | ALLOW | ALLOW | ALLOW | ALLOW (Read-Only) | DENY |
| **Treatment & Courses** | | | | | |
| treatment.start/record/complete | ALLOW | ALLOW | ALLOW | DENY | DENY |
| course.sell/reserve/confirm | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| course.adjust_balance | ALLOW | REQUIRES_APPROVAL | REQUIRES_APPROVAL | DENY | DENY |
| **Billing & Payments** | | | | | |
| billing.create/edit_quantity | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| billing.override_price | ALLOW | DENY | DENY | DENY | DENY |
| payment.receive/split/partial | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| refund.approve/execute | ALLOW | DENY | DENY | DENY | DENY |
| invoice.void/replace | ALLOW | DENY | DENY | DENY | DENY |
| **Medical Certificates** | | | | | |
| certificate.create_draft | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| certificate.submit_review | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| certificate.review/approve/sign | ALLOW | ALLOW | ALLOW | DENY | DENY |
| certificate.issue/print/download | ALLOW | ALLOW | ALLOW | REQUIRES_APPROVAL | DENY |
| certificate.void/reissue | ALLOW | ALLOW | ALLOW | DENY | DENY |
| **ICD-10 & Translation** | | | | | |
| icd10.import/validate/approve | ALLOW | DENY | DENY | DENY | DENY |
| translation.request/review/approve | ALLOW | ALLOW | ALLOW | DENY | DENY |
| **Settings & Security** | | | | | |
| settings.view/edit | ALLOW | DENY | DENY | DENY | DENY |
| audit.view/export | ALLOW | DENY | DENY | DENY | DENY |

*Notes:* 
- `REQUIRES_APPROVAL` means the Clinic Assistant can view or trigger the print action, but it will error unless the certificate is in the `approved` state signed by a practitioner.
- Deprecated roles (Nurse, Receptionist, Cashier, Pharmacist, Doctor) are strictly `DENY` on all active actions.

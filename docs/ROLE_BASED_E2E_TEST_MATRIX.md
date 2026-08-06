# ROLE-BASED E2E TEST MATRIX

| Capability | Admin | Receptionist | Nurse | Doctor | Pharmacist | Cashier |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patients read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patients write | ✓ | ✓ | – | – | – | – |
| Appointments read/write | ✓ | ✓ | – | – | – | – |
| Queue read | ✓ | ✓ | ✓ | ✓ | – | – |
| Queue call/status | ✓ | ✓ | – | – | – | – |
| Screening read | ✓ | – | ✓ | ✓ | – | – |
| Screening write | ✓ | – | ✓ | – | – | – |
| Visit/medical record | ✓ | – | – | ✓ | – | – |
| Prescription create | ✓ | – | – | ✓ | – | – |
| Prescription read/dispense | ✓ | – | – | read | ✓ | – |
| Medicine read | ✓ | – | – | ✓ | ✓ | – |
| Medicine/service master write | ✓ | – | – | – | – | – |
| Inventory read/receive | ✓ | – | – | – | ✓ | – |
| Billing/payment | ✓ | – | – | – | – | ✓ |
| Users/settings/audit/backup | ✓ | – | – | – | – | – |

## Automated files

- `tests/e2e/admin.spec.js`
- `tests/e2e/receptionist.spec.js`
- `tests/e2e/nurse.spec.js`
- `tests/e2e/doctor.spec.js`
- `tests/e2e/pharmacist.spec.js`
- `tests/e2e/cashier.spec.js`
- `tests/e2e/full-clinic-flow.spec.js`
- `tests/e2e/permissions.spec.js`
- `tests/e2e/refresh-stability.spec.js`
- `tests/e2e/responsive.spec.js`
- `tests/e2e/role-evidence.spec.js`

Positive UI/API และ negative direct-route/API ถูกทดสอบแยกกัน Backend เป็น source of truth; การซ่อนเมนูหรือปุ่มใน UI ไม่ถูกใช้แทน permission check

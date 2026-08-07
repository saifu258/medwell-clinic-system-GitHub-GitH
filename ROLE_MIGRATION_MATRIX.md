# ROLE MIGRATION MATRIX

## 1. Role Migration Decision

Based on the Phase 1B approved role-migration decision, the following legacy roles will be mapped to their target roles:

| Legacy Role | Target Role |
| :--- | :--- |
| `admin` | `admin` |
| `receptionist` | `clinic_assistant` |
| `nurse` | `clinic_assistant` |
| `cashier` | `clinic_assistant` |
| `doctor` | `pending_role_review` |
| `pharmacist` | `pending_role_review` |

## 2. Rules for `pending_role_review`

The mapping of `doctor` and `pharmacist` to `pending_role_review` must strictly adhere to the following rules:

1. **Preserve the account**: The user account must remain in the database.
2. **Preserve historical references**: All historical ownership and references to this user must be preserved.
3. **Block normal application access**: The user must not be able to access any normal application features.
4. **Display Thai message**: Upon logging in, the user must see a Thai message explaining that an Admin must assign them a new role.
5. **Admin assignment only**: Only an Admin may assign a valid target role (`physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`, or `admin` if applicable).
6. **No automatic inference**: The system must not infer a clinical profession automatically based on historical data.
7. **Audit Record**: Every role change must record:
   - User ID
   - Previous role
   - New role
   - Admin who approved it
   - Approval date and time
8. **Irreversibility**: The role change must be auditable and irreversible only through another explicit Admin change.

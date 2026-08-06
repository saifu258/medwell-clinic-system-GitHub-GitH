# Financial Permission Thresholds

These thresholds govern automatic approval limits for financial actions. Limits are configurable by the Admin in Settings.

| Action | Clinic Assistant | Physiotherapist / Thai Med | Admin |
| :--- | :--- | :--- | :--- |
| **Max Discount (Percentage)** | `< PENDING_ADMIN_APPROVAL` (e.g. 5%) | N/A | 100% |
| **Max Discount (Fixed Value)** | `< PENDING_ADMIN_APPROVAL` (e.g. 500 THB) | N/A | Unlimited |
| **Partial Payment Approval** | Allowed without override | N/A | Allowed |
| **Refund Approval** | `DENY` | `DENY` | Allowed |
| **Invoice Voiding** | `DENY` | `DENY` | Allowed |
| **Course Adjustment** | `DENY` | `DENY` | Allowed |

*Note: PENDING_ADMIN_APPROVAL values must be defined in the DB `settings` table before launch.*

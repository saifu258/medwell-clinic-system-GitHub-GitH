# Financial State Machine

## Invoice Statuses
- `draft`: Editable by Clinic Assistant (adjusting quantities, applying discounts).
- `ready_for_payment`: Locked for editing, awaiting payment collection.
- `partially_paid`: One or more payments collected, but balance > 0.
- `paid`: Balance is 0.
- `voided`: Invoice cancelled entirely.
- `partially_refunded`: Some payments were refunded.
- `refunded`: All payments refunded.
- `replaced`: Invoice was voided and superseded by a new one.

## Payment Statuses
- `pending`: Payment initiated (e.g., QR generated).
- `processing`: Awaiting bank webhook or manual confirmation.
- `confirmed`: Funds received.
- `failed`: Payment declined or timeout.
- `cancelled`: User cancelled payment attempt.
- `refunded`: Funds returned to patient.

## Refund Statuses
- `draft`: Refund requested.
- `approved`: Admin approved refund.
- `executed`: Funds returned and receipt voided/adjusted.
- `rejected`: Admin denied refund.

## Allowed Transitions (Invoice)
- `draft` → `ready_for_payment`
- `ready_for_payment` → `partially_paid` (Payment received < Total)
- `ready_for_payment` → `paid` (Payment received = Total)
- `partially_paid` → `paid` (Subsequent payments clear balance)
- `draft` / `ready_for_payment` → `voided`
- `paid` / `partially_paid` → `voided` (Triggers refund workflow)

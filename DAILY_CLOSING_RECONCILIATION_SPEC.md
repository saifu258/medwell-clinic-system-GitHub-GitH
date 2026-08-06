# Daily Closing & Reconciliation Specification

The Daily Closing report provides a financial snapshot of actual cash and transfer movements for a specific operational day.

## Metrics Calculated
1. **Total Cash Received**: Sum of all `confirmed` payments where method = 'cash'.
2. **Total Bank Transfers Received**: Sum of all `confirmed` payments where method = 'transfer'.
3. **Total QR Received**: Sum of all `confirmed` payments where method = 'qr'.
4. **Total Cash Refunded**: Sum of all `executed` refunds where method = 'cash'.
5. **Total Transfers Refunded**: Sum of all `executed` refunds where method = 'transfer'.
6. **Net Cash in Drawer**: (Total Cash Received) - (Total Cash Refunded).
7. **Total Outstanding Balance Created Today**: Sum of unpaid balances for all invoices transitioned to `partially_paid` or `ready_for_payment` today.

## Process
- Closing is executed manually by the Clinic Assistant or Admin at the end of the shift.
- The system snapshots the totals and locks the daily record.
- Any payments or refunds processed *after* the closing timestamp automatically roll over to the next operational day's closing report.

## Auditing
- The closing record stores the `internal_user_id` of the actor.
- Discrepancies (e.g., actual cash in drawer doesn't match Net Cash) must be recorded in the `closing_notes` field and require Admin acknowledgment.

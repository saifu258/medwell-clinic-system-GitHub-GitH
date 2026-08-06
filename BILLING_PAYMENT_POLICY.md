# Billing & Payment Policy

## 1. Invoice Immutability
Once a payment is confirmed against an invoice, the invoice becomes immutable. No line items can be added, removed, or altered. Any correction requires voiding the invoice (which reverses course usages and payments) and creating a replacement invoice.

## 2. Partial Payments & Balances
- Partial payments are explicitly allowed. 
- Minimum accepted amount: > 0.
- When an invoice is partially paid, its status becomes `partially_paid`.
- **Visit Closing Rule**: A visit can be clinically completed (`clinical_completion_status = clinically_completed`) while the billing status remains `partially_paid`. 
- The overall case status will reflect `outstanding_balance`.
- Outstanding balances remain visible on the Dashboard and patient history until fully paid, voided, or adjusted.

## 3. Split Payments
- Multiple payment methods (Cash, Transfer, QR) are allowed for a single invoice.
- Each payment attempt is logged individually.

## 4. Receipt Issuance
- One receipt is issued for **each confirmed payment transaction**, NOT one consolidated receipt per invoice.
- A replacement receipt references the voided receipt.

## 5. Daily Closing
- Daily closing calculations are based purely on **actual confirmed payment movements** (cash received, transfers received, refunds paid out), NOT on total invoice amounts.
- Unpaid outstanding balances do not count towards the daily closing cash drawer.

## 6. Discounts & Refunds
- All discounts require an approval workflow. If the discount exceeds the configured role threshold, an Admin must approve it before payment can be collected.
- Refunds must reverse the specific payment method (e.g., Cash return or Transfer return) and deduct from that day's Daily Closing totals.

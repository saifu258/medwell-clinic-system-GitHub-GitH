# Phase 5 Financial Implementation Notes

## 1. Actual Current Schema
- **invoices**: `invoice_id`, `invoice_number`, `visit_id`, `patient_id`, `invoice_date`, `subtotal`, `discount`, `tax`, `grand_total`, `paid_amount`, `balance`, `status` (`draft`, `unpaid`, `partially_paid`, `paid`, `void`), `notes`, `void_reason`, `voided_at`, `voided_by`.
- **invoice_items**: `invoice_item_id`, `invoice_id`, `item_type`, `reference_id`, `item_code`, `item_name`, `quantity`, `unit_price`, `discount`, `total`.
- **payments**: `payment_id`, `invoice_id`, `payment_date`, `amount`, `payment_method`, `reference_number`, `received_by`, `notes`, `idempotency_key`.
- **refunds**: None.
- **receipts**: None.
- **daily_closing**: None.
- **visit_financial_disposition**: None.

## 2. Current Invoice and Payment Statuses
- Canonical Invoice Statuses: `'draft'`, `'unpaid'`, `'partially_paid'`, `'paid'`, `'void'`.
- Payment Methods Constraint: The `payments` table has `payment_method text not null` with NO check constraint in the initial schema. The Edge API explicitly defaults to `"cash"`. We will introduce a check constraint: `check (payment_method in ('cash', 'transfer', 'card', 'qr'))` to match standard Thai clinic operations, while allowing expansion.
- Expense Audit: `MIGRATION_OBJECT_CATALOG.md` and `CURRENT_SYSTEM_AUDIT.md` confirm there is NO existing `expenses` table in the initial schema. We will create an additive `expenses` table to satisfy the daily closing requirements.

## 2b. Owner Decisions
- **Receipt Numbering**: GLOBAL HIGH-WATER, NO RESET. The number format is `RC-{YYYYMM}-{00000X}` but the sequence is a single global counter that never resets.
- **Partial Refund**: IMMUTABLE REFUND LEDGER, ORIGINAL RECEIPT/PAYMENT PRESERVED. Refunds are recorded in a separate `refunds` table, leaving original payments intact.
- **Daily Closing**: INCLUDES EXPENSES. Must compute expected cash by including cash payments, subtracting cash refunds and cash expenses.
- **No-Charge Approval**: ADMIN ONLY. Recorded securely via `visit_financial_dispositions` with an explicitly audited reason.
- **Refunds & Voids**:
  - `POST /invoices/:id/void` merely updates `status = "void"` without deep reconciliation (no checks for existing usage, etc).
  - No refund logic exists.
- **Workflow Completion**: `medwell_workflow_transition` checks for zero-invoices and existing courses, but it lacks a centralized authoritative financial evaluator.
- **Receipts**: Completely missing from schema. No atomic sequence.

## 4. Planned Additive Changes
- **Tables**: `receipts`, `refunds`, `daily_closings`, `visit_financial_disposition`.
- **RPCs**:
  - `medwell_create_invoice_v2` (Atomic and mathematically authoritative, looking up prices).
  - `medwell_issue_refund` (Atomic partial/full refund).
  - `medwell_evaluate_visit_financial_status` (Centralized completion logic).
  - `medwell_void_invoice_v2` (Controlled voiding).
  - `medwell_close_business_day` (Daily closing).
- **Constraints**: Add unique index on `invoice_items` for duplicate billing protection (`invoice_id`, `item_type`, `reference_id`).

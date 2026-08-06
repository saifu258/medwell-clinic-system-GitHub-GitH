# Source Backup Baseline

**Capture Date**: 2026-08-06

## Record Baselines
- User count: `BLOCKED` (Cannot execute query)
- Patient count: `BLOCKED`
- Appointment count: `BLOCKED`
- Queue count: `BLOCKED`
- Visit count: `BLOCKED`
- Treatment count: `BLOCKED`
- Treatment course count: `BLOCKED`
- Invoice count: `BLOCKED`
- Payment count: `BLOCKED`
- Refund count: `BLOCKED`
- Receipt count: `BLOCKED`
- Medical certificate count: `BLOCKED`
- Audit log count: `BLOCKED`
- Maximum HN: `BLOCKED`
- Maximum receipt number: `BLOCKED`
- Maximum certificate number: `BLOCKED`
- Storage object count: `BLOCKED`

## Financial Baselines
- Invoice gross total: `BLOCKED`
- Discount total: `BLOCKED`
- Invoice net total: `BLOCKED`
- Confirmed payment total: `BLOCKED`
- Cash total: `BLOCKED`
- QR total: `BLOCKED`
- Bank transfer total: `BLOCKED`
- Refund total: `BLOCKED`
- Outstanding balance total: `BLOCKED`

## Validation Query (Redacted Example)
```sql
-- Blocked: No connection to run the following query
SELECT count(*) FROM patients;
SELECT sum(paid_amount) FROM invoices WHERE status = 'paid';
```

**Status**: BASELINE CAPTURE FAILED — SOURCE ENVIRONMENT NOT VERIFIED

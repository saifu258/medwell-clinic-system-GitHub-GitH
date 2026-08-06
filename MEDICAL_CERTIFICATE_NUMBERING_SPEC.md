# Medical Certificate Numbering Specification

## Format
Format: `MC[YY][6-digit sequence]` (e.g., `MC26000001`).
If branch-specific numbering is required later, it will be `[BRANCH]-MC26000001`.

## Sequence Reset Policy
*(Pending Admin Approval)*
The default proposed behavior is: **Infinite Sequence with YY Prefix**.
The 6-digit sequence does NOT reset to `000001` every year. It increments indefinitely to prevent accidental collisions if a year boundary is crossed during timezone discrepancies. The `YY` prefix updates based on the issuance date.

## Atomic Generation
Number generation MUST ONLY occur during the `approved` → `issued` transition. 
It must NOT occur when opening the draft form.

**Database Mechanism:**
Use PostgreSQL Sequences (`CREATE SEQUENCE mc_seq;`) or an atomic counter table with `SELECT ... FOR UPDATE` to guarantee no duplicate numbers even with 100 concurrent requests.

```sql
CREATE OR REPLACE FUNCTION generate_mc_number() RETURNS VARCHAR AS $$
DECLARE
  next_val INT;
  year_prefix VARCHAR;
BEGIN
  -- Lock the counter row
  SELECT current_value INTO next_val FROM document_counters WHERE document_type = 'MC' FOR UPDATE;
  
  -- Increment
  UPDATE document_counters SET current_value = current_value + 1 WHERE document_type = 'MC';
  
  -- Format
  year_prefix := to_char(CURRENT_DATE, 'YY');
  RETURN 'MC' || year_prefix || lpad((next_val + 1)::text, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

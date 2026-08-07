# MIGRATION RECONCILIATION PLAN

## Overview
These executable, non-destructive SQL queries will validate data integrity before, during, and after migration.

### User totals by old and new role (BOTH)
```sql
SELECT unnest(roles) as role, count(*) 
FROM users 
GROUP BY role 
ORDER BY count DESC;
```

### Unmapped users (POST-MIGRATION)
```sql
SELECT count(*) 
FROM users 
WHERE NOT (roles && ARRAY['admin', 'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant', 'pending_role_review']);
```

### Pending-role users (POST-MIGRATION)
```sql
SELECT count(*) 
FROM users 
WHERE 'pending_role_review' = ANY(roles);
```

### Orphan foreign keys (BOTH)
```sql
SELECT count(*) FROM visits WHERE patient_id NOT IN (SELECT patient_id FROM patients);
SELECT count(*) FROM queues WHERE patient_id NOT IN (SELECT patient_id FROM patients);
```

### Queue counts by status (BOTH)
```sql
SELECT current_status, count(*) 
FROM queues 
GROUP BY current_status 
ORDER BY count DESC;
```

### Active waiting_pharmacy queues (BOTH)
```sql
-- Identifies any legacy queues still stuck in waiting_pharmacy
-- Must return 0 before cutover proceeds.
SELECT queue_id, patient_id, current_status, date 
FROM queues 
WHERE current_status = 'waiting_pharmacy' 
  AND date >= CURRENT_DATE - INTERVAL '1 day';
```

### Visit counts by status (BOTH)
```sql
SELECT status, count(*) 
FROM visits 
GROUP BY status 
ORDER BY count DESC;
```

### Invoice totals (BOTH)
```sql
SELECT count(*), sum(grand_total) 
FROM invoices;
```

### Payment totals (BOTH)
```sql
SELECT count(*), sum(amount) 
FROM payments;
```

### Outstanding balances (BOTH)
```sql
SELECT sum(i.grand_total - COALESCE((SELECT sum(amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0)) 
FROM invoices i;
```

### Receipt Number Validation (PRE-MIGRATION)
```sql
-- 1. Total existing receipt numbers
SELECT count(receipt_number) FROM invoices;

-- 2. Duplicate receipt numbers
SELECT receipt_number, count(*) FROM invoices GROUP BY receipt_number HAVING count(*) > 1;

-- 3. Invalid formats (not YY + 6 digits)
SELECT count(*) FROM invoices WHERE receipt_number !~ '^[0-9]{2}[0-9]{6}$';

-- 4. Maximum existing 6-digit sequence
SELECT max(substring(receipt_number from 3 for 6)::int) FROM invoices;

-- 5. Receipt-date / year-prefix mismatches (assuming invoice_date exists)
SELECT count(*) FROM invoices WHERE substring(receipt_number from 1 for 2) != to_char(created_at + interval '543 years', 'YY');

-- 6. Existing skipped gaps (conceptual query, requires window functions)
```

### Receipt Number Validation (POST-MIGRATION)
```sql
-- 1. Count total receipt numbers
SELECT count(receipt_number) FROM invoices;

-- 2. Count DISTINCT receipt numbers
SELECT count(DISTINCT receipt_number) FROM invoices;

-- 3. Confirm no duplicates
SELECT receipt_number, count(*) FROM invoices GROUP BY receipt_number HAVING count(*) > 1;

-- 4. Confirm global high-water >= maximum automatically generated sequence
SELECT c.last_value, max(substring(i.receipt_number from 3 for 6)::int) FROM receipt_counters c CROSS JOIN invoices i GROUP BY c.last_value;

-- 5. Confirm manually used lower numbers did not reduce high-water (logic check)
-- 6. Confirm next automatic number is high_water + 1 (logic check)
-- 7. Confirm year rollover does not reset the 6-digit sequence (logic check)
```

### HN Validation (PRE-MIGRATION)
```sql
-- 1. Count all patients with HN
SELECT count(*) FROM patients WHERE hn IS NOT NULL;

-- 2. Count patients missing HN
SELECT count(*) FROM patients WHERE hn IS NULL OR trim(hn) = '';

-- 3. Identify duplicate HNs
SELECT hn, count(*) FROM patients GROUP BY hn HAVING count(*) > 1;

-- 4. Identify malformed HNs (not matching HNYY/NNNNN)
SELECT count(*) FROM patients WHERE hn !~ '^HN[0-9]{2}/[0-9]{5}$';

-- 5. Group HNs by Buddhist-year prefix
SELECT substring(hn from 3 for 2) as year_prefix, count(*) 
FROM patients 
GROUP BY substring(hn from 3 for 2);

-- 6. Determine maximum 5-digit numeric sequence per year
SELECT substring(hn from 3 for 2) as year_prefix, max(substring(hn from 6 for 5)::int) as max_sequence 
FROM patients 
GROUP BY substring(hn from 3 for 2);
```

### HN Validation (POST-MIGRATION)
```sql
-- 1. Verify COUNT(hn) = COUNT(DISTINCT hn) for non-null HNs
SELECT count(hn), count(DISTINCT hn) FROM patients WHERE hn IS NOT NULL;

-- 2. Verify no duplicate HNs
SELECT hn, count(*) FROM patients GROUP BY hn HAVING count(*) > 1;

-- 3. Verify each hn_counters.last_value is >= the maximum relevant HN sequence for that year
SELECT c.buddhist_year, c.last_value, max(substring(p.hn from 6 for 5)::int) 
FROM hn_counters c 
LEFT JOIN patients p ON substring(p.hn from 3 for 2)::int = (c.buddhist_year % 100)
GROUP BY c.buddhist_year, c.last_value;

-- 4. Verify newly created HNs follow HNYY/NNNNN
SELECT count(*) FROM patients WHERE created_at > (SELECT max(updated_at) FROM hn_counters) AND hn !~ '^HN[0-9]{2}/[0-9]{5}$';

-- 5. Verify every manual edit has an audit record
-- Note: Conceptual query checking audit_logs
SELECT count(*) FROM audit_logs WHERE action = 'edit_hn';

-- 6. Verify no non-Admin role performed an HN edit
-- Note: Conceptual query checking audit_logs
SELECT count(*) FROM audit_logs WHERE action = 'edit_hn' AND changed_by_role != 'admin';
```

### Course balances (POST-MIGRATION)
```sql
SELECT count(*) 
FROM treatment_courses 
WHERE remaining_sessions < 0 OR remaining_sessions > total_sessions;
```

### ICD-10 Source Data Validation (PRE-MIGRATION)
```sql
-- 1. Count rows in legacy diagnosis_master
SELECT count(*) FROM diagnosis_master;

-- 2. Identify duplicate legacy diagnosis codes
SELECT code, count(*) FROM diagnosis_master GROUP BY code HAVING count(*) > 1;

-- 3. Identify null/blank codes
SELECT count(*) FROM diagnosis_master WHERE code IS NULL OR trim(code) = '';

-- 4. Identify malformed or non-standard codes (e.g. not matching A00.0)
SELECT count(*) FROM diagnosis_master WHERE code !~ '^[A-Z][0-9]{2}(\.[0-9]{1,4})?$';

-- 5. Identify rows missing Thai or English names
SELECT count(*) FROM diagnosis_master WHERE name_th IS NULL OR name_en IS NULL;
```

### ICD-10 Post-Import Validation (POST-MIGRATION)
```sql
-- 1. Count imported rows in icd10_codes
SELECT count(*) FROM icd10_codes;

-- 2. Count new, updated, skipped/invalid rows (from imports log)
SELECT status, count(*) FROM icd10_imports GROUP BY status;

-- 3. Count unmapped legacy diagnosis rows (in diagnosis_master but not in icd10_codes)
SELECT count(*) FROM diagnosis_master dm LEFT JOIN icd10_codes ic ON dm.code = ic.code WHERE ic.code IS NULL;

-- 4. Verify historical diagnosis references still resolve
SELECT count(*) FROM visits v LEFT JOIN diagnosis_master dm ON v.diagnosis_id = dm.id WHERE dm.id IS NULL;

-- 5. Confirm disabled ICD-10 rows remain available for historical viewing
SELECT count(*) FROM icd10_codes WHERE is_active = false;
```

### Certificate Number Validation (PRE-MIGRATION)
```sql
-- 1. Existing medical certificate numbers if any
SELECT count(certificate_number) FROM medical_certificates;

-- 2. Duplicate numbers
SELECT certificate_number, count(*) FROM medical_certificates GROUP BY certificate_number HAVING count(*) > 1;

-- 3. Invalid formats
SELECT count(*) FROM medical_certificates WHERE certificate_number !~ '^[0-9]{2}[0-9]{6}$';

-- 4. Maximum numeric 6-digit sequence
SELECT max(substring(certificate_number from 3 for 6)::int) FROM medical_certificates;

-- 5. Year-prefix/date mismatches
SELECT count(*) FROM medical_certificates mc JOIN visits v ON mc.visit_id = v.visit_id WHERE substring(mc.certificate_number from 1 for 2) != to_char(v.created_at + interval '543 years', 'YY');
```

### Certificate Number Validation (POST-MIGRATION)
```sql
-- 1. Count certificates
SELECT count(*) FROM medical_certificates;

-- 2. Count DISTINCT certificate numbers
SELECT count(DISTINCT certificate_number) FROM medical_certificates;

-- 3. Confirm no duplicates
SELECT certificate_number, count(*) FROM medical_certificates GROUP BY certificate_number HAVING count(*) > 1;

-- 4. Count reservation rows by state
SELECT status, count(*) FROM medical_certificate_number_reservations GROUP BY status;

-- 5. Verify no permanently_blocked number appears in released/reservable state
SELECT count(*) FROM medical_certificate_number_reservations WHERE status = 'released' AND certificate_number IN (SELECT certificate_number FROM medical_certificate_number_reservations WHERE status = 'permanently_blocked'); -- Conceptual: relies on audit history or state constraints

-- 6. Verify high-water >= all high-water-generated sequences
SELECT c.last_value, max(r.numeric_sequence) FROM medical_certificate_counters c CROSS JOIN medical_certificate_number_reservations r GROUP BY c.last_value;

-- 7. Verify released lower numbers do not change the high-water value (logic check)
-- 8. Verify the allocator chooses eligible lower gaps before high_water + 1 (logic check)

-- 9. Verify orphan reservations do not exist
SELECT count(*) FROM medical_certificate_number_reservations WHERE status IN ('assigned_draft', 'issued') AND assigned_certificate_id NOT IN (SELECT certificate_id FROM medical_certificates);

-- 10. Verify assigned_draft/issued rows reference valid certificate records
SELECT count(*) FROM medical_certificate_number_reservations r LEFT JOIN medical_certificates mc ON r.assigned_certificate_id = mc.certificate_id WHERE r.status IN ('assigned_draft', 'issued') AND mc.certificate_id IS NULL;
```

### Disabled ICD-10 usage (POST-MIGRATION)
```sql
SELECT count(*) 
FROM medical_certificates mc
JOIN icd10_codes i ON mc.diagnosis_code = i.code
WHERE i.is_active = false;
```

### Realtime and Locks Validation (POST-MIGRATION)
```sql
-- 1. Identify duplicate active edit locks for the same resource
SELECT resource_type, resource_id, count(*) 
FROM edit_locks 
GROUP BY resource_type, resource_id 
HAVING count(*) > 1;

-- 2. Identify expired orphan locks
SELECT count(*) 
FROM edit_locks 
WHERE expires_at < now();

-- 3. Identify locks held by deleted/non-existent users
SELECT count(*) 
FROM edit_locks e 
LEFT JOIN users u ON e.locked_by_user_id = u.user_id 
WHERE u.user_id IS NULL;

-- 4. Notification action-required consistency (cannot be resolved if resolved_at is null)
SELECT count(*) 
FROM notifications 
WHERE is_action_required = true AND resolution_state = 'resolved' AND resolved_at IS NULL;

-- 5. Notification source references (ensure action-required have valid source links)
SELECT count(*) 
FROM notifications 
WHERE is_action_required = true AND (source_type IS NULL OR source_id IS NULL);

-- 6. Export-job state consistency
SELECT count(*) 
FROM export_jobs 
WHERE status = 'completed' AND file_url IS NULL;

-- Note: Presence is ephemeral and not reconciled in durable DB queries.
-- Note: Realtime publication inventory requires checking pg_publication_tables.
```

### Offline Draft Retention Validation (POST-MIGRATION)
```sql
-- Server-side Draft Validations (`automatic_drafts` table)

-- 1. Drafts older than five years that still exist (should be 0 if expiry runs properly)
SELECT count(*) 
FROM automatic_drafts 
WHERE expires_at <= CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok' 
  AND deleted_at IS NULL;

-- 2. Drafts entering the 30-day warning window
SELECT count(*) 
FROM automatic_drafts 
WHERE expires_at > CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok' 
  AND expires_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok') + interval '30 days' 
  AND deleted_at IS NULL;

-- 3. Invalid expires_at values (should match retention_started_at + 5 years)
SELECT count(*) 
FROM automatic_drafts 
WHERE expires_at != retention_started_at + interval '5 years';

-- 4. Missing original-owner metadata
SELECT count(*) 
FROM automatic_drafts 
WHERE original_owner_user_id IS NULL;

-- 5. Expired drafts with payload still present
SELECT count(*) 
FROM automatic_drafts 
WHERE deleted_at IS NOT NULL 
  AND payload IS NOT NULL;

-- 6. Retention-expiry deletion events waiting for server notification synchronization
-- (If tracked via a local outbox or offline sync metadata before pushing to notifications)
-- Conceptual check on client-sync queue vs notifications.
```

**Local IndexedDB Diagnostics (Client-Side Only)**
For local device validation, these are diagnostic procedures rather than PostgreSQL queries:
1. **Orphan Local Indexes**: Run an IndexedDB cursor to scan `drafts_metadata` where the associated `encrypted_payload` is missing or `deleted_at` is populated. (Expectation: 0 rows).
2. **Expired Drafts still on device**: Query local IndexedDB for `expires_at <= current_time` (Asia/Bangkok). (Expectation: 0 rows on next application startup).
3. **Missing Original Owner**: Scan local `drafts_metadata` for records missing `original_owner_user_id`. (Expectation: 0 rows).

### Post-Rollback Reconciliation (POST-ROLLBACK)
```sql
-- 1. Users: account count, roles, pending_role_review users
SELECT unnest(roles) as role, count(*) FROM users GROUP BY role;

-- 2. Patients: patient count, duplicate HNs, HN counter state
SELECT count(*) FROM patients;
SELECT hn, count(*) FROM patients GROUP BY hn HAVING count(*) > 1;
SELECT buddist_year, last_value FROM hn_counters;

-- 3. Queues/Visits: counts by status, orphan visits, active queue consistency
SELECT current_status, count(*) FROM queues GROUP BY current_status;
SELECT count(*) FROM visits WHERE patient_id NOT IN (SELECT patient_id FROM patients);

-- 4. Finance: invoice totals, payment totals, outstanding balances, receipt high-water state
SELECT count(*), sum(grand_total) FROM invoices;
SELECT count(*), sum(amount) FROM payments;
SELECT last_value FROM receipt_counters;

-- 5. Certificates: number uniqueness, reservation states, permanently blocked numbers, high-water state
SELECT certificate_number, count(*) FROM medical_certificates GROUP BY certificate_number HAVING count(*) > 1;
SELECT status, count(*) FROM medical_certificate_number_reservations GROUP BY status;
SELECT last_value FROM medical_certificate_counters;

-- 6. Inventory: stock balances, stock movements
SELECT count(*) FROM stock_movements;
-- (Add specific inventory check logic as needed)

-- 7. ICD-10: historical diagnosis integrity
SELECT count(*) FROM visits v LEFT JOIN diagnosis_master dm ON v.diagnosis_id = dm.id WHERE dm.id IS NULL;

-- 8. Audit: recovery events and required logs
SELECT action, count(*) FROM audit_logs WHERE created_at >= (CURRENT_TIMESTAMP - interval '1 day') GROUP BY action;
```

# MIGRATION ROLLBACK PLAN

## 1. Approved Rollback Strategy (D-013)
MEDWELL must use a layered rollback strategy. DO NOT rely on PITR as the primary rollback mechanism.

Approved rollback layers:
1. Application rollback
2. Supabase Edge Function rollback
3. Additive-schema compatibility rollback
4. Forward-fix migration
5. Controlled backfill correction
6. Full database restore using the verified Phase 0 backup
7. PITR only if D-014 is later independently verified as available

## 2. Application Rollback
Frontend rollback must support reverting to the last known-good application release. The rollback must not assume that reverting frontend code also reverts database schema or data.
- **Previous Git commit / release identifier**: (To be recorded at cutover)
- **Firebase Hosting release/version**: (To be recorded at cutover)
- **Rollback command/process**: Revert via Firebase Console or `firebase hosting:clone`
- **Validation after rollback**: Verify UI loads and authenticates successfully.
- **Required owner approval**: Yes

## 3. Edge Function Rollback
Supabase Edge Function rollback must support restoring the previously validated API version. Rollback must not expose or overwrite secrets.
- **Previous known-good Edge Function source revision**: (To be recorded at cutover)
- **Deployment identifier where available**: (To be recorded at cutover)
- **Required environment/secrets compatibility**: Must use existing production secrets.
- **Post-rollback health validation**: Verify API heartbeat/status endpoint.
- **API compatibility with additive database changes**: Verified compatible with Phase 1B schema.

## 4. Additive-Schema Compatibility
The approved migration philosophy is ADDITIVE FIRST.
- Do not drop legacy tables in early migration phases.
- Do not drop legacy columns in early migration phases.
- Do not remove legacy status values during initial cutover.
- New columns must be nullable or safely defaulted where required.
- New structures must coexist with the previous application long enough to permit application rollback.

Before each migration package is approved, document whether the previous application version can still operate safely after that schema package is applied.
**Compatibility Classifications**:
- BACKWARD COMPATIBLE
- PARTIALLY BACKWARD COMPATIBLE
- NOT BACKWARD COMPATIBLE (Requires a separate rollback gate before execution)

## 5. Forward-Fix Migration
If an additive migration contains an error after deployment, prefer a new corrective migration rather than destructive rollback.
Do NOT routinely use destructive down migrations that:
- DROP new tables containing live data
- DROP new columns containing live data
- delete migrated records
- revert role mappings by deleting history
- remove financial transactions

Forward-fix migrations must preserve existing data, be idempotent where practical, include reconciliation checks, and include rollback/abort criteria.

## 6. Backfill Correction
If role mapping, workflow status mapping, ICD-10 migration, numbering initialization, or another backfill produces incorrect data, use a controlled correction process. Do not perform untracked ad-hoc production edits.
Required steps:
1. Stop the affected migration step.
2. Preserve the incorrect data for comparison.
3. Generate an exception/reconciliation report.
4. Identify affected record IDs.
5. Create a reviewed correction script.
6. Test against restored/local/staging data first.
7. Execute only after approval.
8. Re-run reconciliation afterward.

## 7. Full Database Restore
Full database restore is the verified last-resort recovery method. Use the encrypted, checksum-verified Phase 0 backup procedure as the baseline full-restore mechanism.
Verified evidence from Phase 0 includes:
- Backup Creation: PASS
- Encryption: PASS
- Checksum Verification: PASS
- Archive Integrity Test: PASS
- Schema Restore: PASS
- Data Restore: PASS
- Database Structure Validation: PASS
- Restore Rehearsal: PASS
- Temporary Database Cleanup: PASS

Because full restore may overwrite transactions created after the backup point, it must be classified as LAST RESORT.

## 8. Preserving Transactions During Failed Release
Before initiating a full database restore after a failed production release, capture and preserve all recoverable transactions created after the restore point.
Consider at minimum: newly registered patients, queue activity, visits, screenings, treatment records, invoices, payments, receipt numbers, HNs, course usage, appointments, medical certificates, inventory movements, audit events.

Design a recovery-delta capture procedure:
- If readable: export the affected post-backup rows before restore (e.g. `pg_dump -a -t ...`).
- If partially unavailable: capture whatever evidence is safely retrievable, preserve logs, payment evidence, and receipt/counter evidence.

After restore, reconcile and selectively reapply legitimate post-backup transactions through controlled recovery procedures. Do not blindly replay data without validation.

## 9. Rollback Triggers
Explicit rollback triggers classified by severity:

**STOP / IMMEDIATE ROLLBACK**
- Major data loss.
- Database migration failure.
- Widespread authorization failure.

**PAUSE AND ASSESS**
- Authentication failure affecting clinic operation.
- Queue/workflow transition corruption.
- Edge API unavailable beyond the approved cutover tolerance.
- Severe security regression.
- Critical browser workflow failure preventing clinic operation.

**FORWARD FIX ALLOWED**
- Incorrect target role assignment.
- Duplicate HN generation.
- Duplicate receipt generation.
- Duplicate certificate number generation.
- Payment inconsistency.
- Invoice/payment reconciliation failure.

## 10. Rollback Decision Ownership
- **System Owner** has final GO/NO-GO authority.
- **Technical Lead** may recommend rollback based on technical evidence.
- Database recovery must not begin without authorized approval except where immediate containment is required to prevent further damage.

The rollback decision record must include: decision timestamp, trigger, evidence, decision maker, chosen rollback layer, and result.

## 11. Post-Rollback Reconciliation
After any rollback, run reconciliation appropriate to the failure. Verify at minimum:
- **USERS**: account count, roles, `pending_role_review` users.
- **PATIENTS**: patient count, duplicate HNs, HN counter state.
- **QUEUES / VISITS**: counts by status, orphan visits, active queue consistency.
- **FINANCE**: invoice totals, payment totals, outstanding balances, receipt uniqueness, receipt high-water state.
- **CERTIFICATES**: number uniqueness, reservation states, permanently blocked numbers, certificate high-water state.
- **INVENTORY**: stock balances, stock movements, medicine/lot references.
- **ICD-10**: historical diagnosis integrity, migrated data consistency.
- **AUDIT**: recovery events and required logs.

Do not declare rollback complete until reconciliation passes or exceptions are formally accepted.

## 12. Local Offline Data After Rollback
Database rollback does NOT automatically rollback IndexedDB/offline drafts on clinic devices. After a backend rollback:
- Revalidate offline drafts before synchronization.
- Re-authorize the current user.
- Detect records referencing backend objects that no longer exist.
- Use the approved conflict-resolution design.
- Do not silently overwrite restored server data with stale offline drafts.

Expired offline drafts must remain deleted and must not be restored by rollback. A database rollback or server-side failure does NOT extend the strict 5-year retention limit for local drafts.

## 13. Rollback Evidence
The rollback design requires recording evidence such as: pre-cutover backup verification, checksum verification, current commit SHA, deployed frontend version, deployed Edge Function version, migration identifiers, reconciliation outputs, failure screenshots/logs where relevant, rollback decision record, and post-rollback validation results.

## 14. PITR Relationship
D-014 has been recorded as **NOT VERIFIED — APPROVED AS CURRENT BASELINE**.
- The currently inspected project metadata does not prove that PITR is enabled.
- PITR availability remains NOT VERIFIED.
- Do not infer PITR availability from project health, PostgreSQL version, region, or the existence of backups.
- PITR must not be listed as a verified rollback method.
- PITR must not be required for migration approval, cutover, or rollback readiness.
- Until verified, Layer 7 must be treated as unavailable for planning purposes.
- Full verified backup restore remains the baseline disaster-recovery option until then.

## 15. Future PITR Verification Procedure
PITR may be upgraded from NOT VERIFIED only after checking the actual Supabase project/account and recording evidence such as:
- Supabase plan/tier
- PITR feature availability
- PITR enabled status
- retention window
- recovery granularity
- restore workflow
- evidence screenshot or exported configuration where appropriate
- verification date
- verifier

If available later:
Status may become **VERIFIED AVAILABLE**.

If confirmed unavailable:
Status may become **VERIFIED NOT AVAILABLE**.

Do not change the status without evidence.

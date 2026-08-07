# MIGRATION CUTOVER CHECKLIST

## 1. Preparation Phase (T-24h)
- [ ] **Change freeze**: No new features deployed to main branch.
- [ ] **Execution approval**: The actual production cutover date and time requires a separate execution approval from the System Owner.
- [ ] **Intake freeze**: Clinic defines and initiates a temporary queue intake freeze window.
- [ ] **Staging validation**: All M01-M15 migrations run on staging successfully.
- [ ] **Smoke tests**: E2E tests pass on staging.

## 2. Pre-Cutover Phase (T-1h)
- [ ] **Active queue review**: Every legacy queue must be manually reviewed and placed into `completed`, `cancelled`, or explicitly held in a reviewed migration hold list. No uncontrolled active legacy queues can exist. No automatic remapping of actively processed queues is permitted.
- [ ] **Pending pharmacy review**: Any record still in `waiting_pharmacy` must be explicitly reviewed and handled according to D-004 rules.
- [ ] **Pending payment review**: All invoices for the day are paid or voided.
- [ ] **Role-mapping review**: Identify list of `doctor` and `pharmacist` accounts needing `pending_role_review` mapping.

## 3. Execution Phase (T-0)
- [ ] **GO / NO-GO Decision**: Pre-migration approval by System Owner to begin cutover.
- [ ] **Backup creation**: Run `pg_dump` on production.
- [ ] **Backup verification**: Confirm `.sql` file size is non-zero.
- [ ] **Checksum verification**: Compute SHA256 of backup file.
- [ ] **Migration execution order**:
  - Run M01 (Roles)
  - Run M02-M14 (Schemas & Targets)
  - Run M15 (Backfill and Reconciliation)
- [ ] **Validation Checkpoint**: After schema migration, run POST-MIGRATION queries. Confirm zero data loss.
- [ ] **Edge API deployment order**: Deploy `api/index.ts` to Supabase.
- [ ] **Validation Checkpoint**: After API deployment, verify API heartbeat and endpoints.
- [ ] **Frontend deployment order**: Run `firebase deploy --only hosting`.
- [ ] **Validation Checkpoint**: After frontend deployment, run basic UI walk-through on Production.

## 4. Rollback Decision Window
- [ ] **Rollback Decision Window**: Begins immediately after initial deployment. The System Owner and Technical Lead monitor for explicit rollback triggers.
- [ ] **Rollback decision point**: If critical failures exist within the decision window, trigger Rollback Plan within 30 minutes.

## 5. Resumption Phase
- [ ] **Final GO / NO-GO Decision**: System Owner formally approves reopening.
- [ ] **Clinic reopening approval**: System Owner signals clinic staff that the new system is live.

## 6. Exact GO/NO-GO Criteria
- **GO**: All POST-MIGRATION reconciliation queries return expected values AND Smoke Tests pass AND Admin Approves.
- **NO-GO**: Any reconciliation query reveals data loss OR Smoke Test fails on critical path (Login, Registration, Billing) OR Admin rejects.

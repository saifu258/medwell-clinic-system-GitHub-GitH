# PHASE 1B APPROVAL REGISTER

## Decision Table

| Decision ID | Topic | Proposed Decision | Risk | Owner | Status | Approval Date | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| D-001 | Role mapping | Map explicit roles as designed. | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | Execution remains unapproved. |
| D-002 | Pending-role behavior | Use `pending_role_review` with strict UI blocks. | Medium | System Owner | APPROVED FOR DESIGN | 2026-08-07 | Execution remains unapproved. |
| D-003 | Queue Cutover | All active legacy queues must be cleared before cutover. | High | System Owner | PENDING OWNER APPROVAL | - | Requires clinic coordination. |
| D-004 | Legacy pharmacy data | Bypass pharmacy flow; preserve historical states. | Medium | System Owner | PENDING OWNER APPROVAL | - | |
| D-005 | ICD-10 Source Data Validation | Treat `diagnosis_master` as staging; import new dataset. | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | Preserve snapshots; no early deletion. |
| D-006 | Receipt Numbering Logic | Global YY+6 sequence; YY from receipt date. | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | No year reset; atomic locking; warn on YY mismatch. |
| D-007 | Certificate Numbering Logic | Global YY+6 sequence; separate from receipts. | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | No year reset; uses reservation pool. |
| D-008 | HN Numbering Logic | Atomic year-based sequence counters (HNYY/NNNNN). | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | Reset per year; strict admin edit audit. |
| D-009 | Realtime Architecture and Edit Locks | Global notifications, persistent edit locks, Postgres changes. | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | Explicit server-authoritative locks and broadcast coordination. |
| D-010 | Offline cross-account access | Encrypted device-level vault with strict auth. | Medium | System Owner | APPROVED FOR DESIGN | 2026-08-07 | Updated per new design constraints. |
| D-011 | Five-Year Offline Draft Retention Policy | Auto-purge offline drafts after exactly 5 years. | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | Updated per new design constraints. |
| D-012 | Translation provider deferral | Defer to Phase 6; production disabled until configured. | Low | System Owner | APPROVED FOR EXECUTION | 2026-08-07 | |
| D-013 | Rollback Method | Layered strategy (App, Edge, Additive-Schema, Forward-fix, Backfill, Full Restore). | Low | System Owner | APPROVED FOR DESIGN | 2026-08-07 | PITR remains NOT VERIFIED. |
| D-014 | PITR Availability | Assume PITR is NOT VERIFIED. | High | System Owner | NOT VERIFIED — APPROVED AS CURRENT BASELINE | 2026-08-07 | Do not rely on PITR for rollback. |

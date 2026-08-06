# Phase 0 Backup Blocker Diagnosis

**Date**: 2026-08-06

| Requirement | Current status | Evidence found | Missing item | Root cause | Required action | Can continue automatically |
| ----------- | -------------- | -------------- | ------------ | ---------- | --------------- | -------------------------- |
| PostgreSQL client version compatible | BLOCKED | `PHASE_0_TECHNICAL_DEPENDENCY_REPORT.md` | `pg_dump` and `psql` | Tools not installed in PATH | Install PostgreSQL Client tools | NO |
| Source environment verified | BLOCKED | `PHASE_0_TECHNICAL_DEPENDENCY_REPORT.md` | Database Connection String | No secure string provided | Provide connection string via env vars | NO |
| Encryption completed | BLOCKED | `PHASE_0_TECHNICAL_DEPENDENCY_REPORT.md` | `gpg`, `age`, `openssl`, or `7z` | No tools installed | Install encryption tool & approve method | NO |
| Schema dump exists | BLOCKED | None | `medwell_schema_*.sql` | Missing tools & credentials | Human action required | NO |
| Data dump exists | BLOCKED | None | `medwell_data_*.dump` | Missing tools & credentials | Human action required | NO |

## Blocker Classifications
- `POSTGRESQL_CLIENT_MISSING`: pg_dump and psql are missing from the system path and standard installation directories.
- `DATABASE_CONNECTION_REQUIRED`: The `$env:MEDWELL_SOURCE_DB_URL` variable is empty.
- `ENCRYPTION_TOOL_MISSING`: No standard encryption tools are available.
- `ENCRYPTION_APPROVAL_REQUIRED`: No encryption key/method has been approved.

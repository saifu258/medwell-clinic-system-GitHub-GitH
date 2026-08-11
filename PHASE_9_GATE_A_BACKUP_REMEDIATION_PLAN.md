# Phase 9 Gate A Remediation — Backup Remediation Plan

## Status

**ACTION_REQUIRED**

No database dump, archive, copy, restore, or integrity operation was performed.

## Current Windows Tooling

| Capability | Result | Remediation |
| --- | --- | --- |
| Docker Desktop | Installed; client/server `29.5.3`, daemon responsive | READY for later local rehearsal |
| Supabase local PostgreSQL | PostgreSQL 17 local containers are running | Use only for disposable localhost tests |
| Host `pg_dump` | Not in PATH and not found under standard `C:\Program Files\PostgreSQL\*\bin` locations | Install PostgreSQL 17 command-line tools or validate the official Supabase CLI dump path |
| Host `psql` | Not in PATH and not found in standard locations | Install PostgreSQL 17 command-line tools |
| 7-Zip | Installed at `C:\Program Files\7-Zip\7z.exe`, version 26.02; not in PATH | Use explicit path or add it to PATH after owner approval |
| SHA-256 | PowerShell `Get-FileHash` available | READY |
| Secure destination | Not identified/approved | Owner action required |
| Restore target | Local Docker is available, but no completed restore rehearsal exists | Evidence required |

## Windows Installation/Readiness Steps

1. Install PostgreSQL 17 command-line tools from the official Windows PostgreSQL installer. The client major version must be equal to or newer than the Supabase PostgreSQL server major version used for the dump.
2. Select command-line tools; a local database server is not required solely for client binaries.
3. Add the installed `bin` directory, typically `C:\Program Files\PostgreSQL\17\bin`, to PATH or invoke tools by absolute path.
4. Open a new terminal and verify:

```powershell
pg_dump --version
psql --version
pg_restore --version
& 'C:\Program Files\7-Zip\7z.exe' i
Get-Command Get-FileHash
```

5. Alternatively validate the official `supabase db dump` workflow in a disposable environment. Do not treat it as ready until both dump and restore are proven. Do not embed the connection string in scripts or logs.

No software was installed or PATH modified during remediation.

## Staging Backup Destination Policy

The approved pattern remains encrypted archive + SHA-256 + separate restricted storage.

Required destination properties:

- Dedicated `MEDWELL/STAGING/BACKUPS` location outside the repository, OneDrive Desktop workspace, and application host.
- Encryption at rest plus a 7-Zip AES-256 encrypted archive with encrypted filenames/headers.
- Archive password stored in an owner-approved password manager, separate from the archive.
- Access restricted to named backup/restore operators.
- At least one independent second copy in separate secure storage.
- Retention, expiry, and secure deletion periods approved by the clinic owner/PDPA policy.
- Immutable timestamped manifest containing environment identity, dump timestamp, PostgreSQL version, archive hash, and operator; no patient names or credentials.

No existing approved secure destination was found in the repository, so reuse cannot yet be authorized.

## Future Staging Backup Workflow

Only after the Staging project ref and hostname pass the environment preflight:

```powershell
# Connection is process-scoped and never printed.
pg_dump --dbname="$env:MEDWELL_STAGING_DB_URL" --format=custom --no-owner --no-privileges --file="MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump"

Get-FileHash -Algorithm SHA256 .\MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump

# Use interactive password entry; never place the password in the command/report.
& 'C:\Program Files\7-Zip\7z.exe' a -t7z -mhe=on -p .\MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.7z .\MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump .\MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump.sha256
```

Before execution, verify that the connection hostname contains the approved Staging ref and does not contain a protected Production ref. Prefer the Supabase session pooler when required by network connectivity, following current Supabase backup guidance.

## Mandatory Restore Rehearsal Gate

Backup readiness becomes `READY` only when all evidence exists:

1. Staging-only dump created successfully.
2. SHA-256 manifest generated and stored separately.
3. AES-256 encrypted archive created with encrypted headers.
4. Archive integrity test passes.
5. Encrypted copy reaches the approved secure destination.
6. Archive is extracted into a restricted disposable location.
7. SHA-256 recomputation matches the manifest.
8. Dump restores into a new disposable local database, never over source Staging.
9. Schema, constraints, functions, RLS, migration history, and reference-data assertions pass.
10. Operator, timestamps, tool versions, and results are recorded without secrets or PII.

Until all ten pass, classification remains `ACTION_REQUIRED`.

## Docker Action

Docker daemon is now available and local Supabase containers are running. No privileged service change is required. Before rehearsal:

1. Keep Docker Desktop running.
2. Verify `docker version` reports both Client and Server.
3. Verify the selected disposable Supabase workdir uses unique local project/container names.
4. Investigate the currently restarting `supabase_vector_*` containers or document why Vector is irrelevant to the migration/restore assertions.
5. Never point local commands at remote refs or database URLs.

## References

- [Supabase backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [PostgreSQL Windows downloads](https://www.postgresql.org/download/windows/)

## Exact Remaining Actions

1. Install/verify PostgreSQL 17 client tools.
2. Approve secure primary and secondary backup destinations.
3. Approve credential-handling and retention policy.
4. Identify verified Staging before taking any dump.
5. Complete encrypted dump and disposable restore rehearsal.

No Production backup was taken or proposed for execution in this phase.

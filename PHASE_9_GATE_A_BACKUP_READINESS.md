# Phase 9 Gate A — Backup Readiness

## Classification

**NOT_READY**

Gate B requires `READY`; therefore remote migration execution is blocked.

## Tooling Evidence

| Capability | Status | Evidence |
| --- | --- | --- |
| PostgreSQL logical dump | NOT READY | `pg_dump` is not found in PATH |
| PostgreSQL restore client | NOT READY | `psql` is not found in PATH |
| Encrypted archive | NOT READY | `7z` is not found in PATH; no equivalent encrypted archive tool was verified |
| SHA-256 | READY | PowerShell `Get-FileHash` is available |
| Secure destination | NOT READY | No approved encrypted/off-device Staging backup destination was identified |
| Disposable restore target | NOT READY | Docker CLI exists but daemon is unavailable; no separate verified restore database exists |

No Production or Staging backup was taken in Gate A.

## Required Staging Backup Plan

This plan is a command pattern only. It must not be executed until the owner identifies and verifies the Staging target, installs the required tools, and approves Gate B.

### 1. Connection method

- Obtain the Staging-only PostgreSQL connection URI from the verified Supabase Staging project.
- Store it temporarily in a process-scoped environment variable such as `MEDWELL_STAGING_DB_URL`.
- Never place the password in source, command history, report files, or the archive filename.
- Confirm the hostname/project ref matches the approved Staging protection register before running any dump.

### 2. Dump command pattern

```powershell
pg_dump --dbname="$env:MEDWELL_STAGING_DB_URL" --format=custom --no-owner --no-privileges --file="MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump"
```

The command must be run only against the verified Staging hostname. It must not be reused for Production.

### 3. Filename convention

```text
MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump
MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump.sha256
MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.7z
```

Do not include patient names, project passwords, or connection strings in filenames.

### 4. Checksum process

```powershell
Get-FileHash -Algorithm SHA256 .\MEDWELL_STAGING_pre_gate_b_YYYYMMDD_HHMMSS.dump |
  Format-List Algorithm,Hash,Path
```

Store the checksum manifest inside the encrypted archive and separately in the approved integrity register.

### 5. Encrypted archive process

After installing and verifying 7-Zip or an approved equivalent, create an AES-256 encrypted archive with encrypted headers. Supply the password interactively or through an approved secret manager; never put the password in this report or a checked-in script.

```text
7z a -t7z -mhe=on -p <archive.7z> <dump> <checksum-manifest>
```

The placeholder represents interactive secret entry, not a literal command-line password.

### 6. Secure destination

- Copy the encrypted archive to an owner-approved restricted backup location separate from the working tree and application host.
- Restrict access to named backup/restore operators.
- Store the archive password separately from the archive.
- Apply the clinic's retention and deletion policy.

No secure destination is currently verified.

### 7. Integrity test

1. Run the archive tool's integrity test against the encrypted archive.
2. Extract into a disposable restricted directory.
3. Recompute SHA-256 and compare with the recorded manifest.
4. Restore into a new disposable Staging/test database, never over the source database.
5. Verify schema object counts, constraints, functions, and migration metadata without examining patient-level content.

### 8. Restore strategy

- Provision a separate empty restore-validation target.
- Use `pg_restore --clean --if-exists` only against that verified disposable target.
- Run metadata-only validation and synthetic smoke tests.
- If Gate B migration fails, stop writes and follow an owner-approved restore runbook; do not attempt ad-hoc reverse migrations.

## Exact Blockers

1. `pg_dump` unavailable.
2. `psql`/restore client unavailable.
3. AES-256 encrypted archive tooling unavailable.
4. Secure backup destination not approved/verified.
5. Disposable restore-validation target unavailable.
6. Staging database identity is not verified.

Backup readiness cannot be raised to `READY` until all six conditions are closed and a test restore succeeds.

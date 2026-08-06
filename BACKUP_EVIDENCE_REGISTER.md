# Backup Evidence Register

**Register Date**: 2026-08-06  
**System**: MEDWELL CLINIC SYSTEM  
**Source Environment**: Supabase Cloud — MEDWELL  
**Evidence Directory**: `./phase0-evidence`  
**Register Status**: TECHNICALLY COMPLETE — SECONDARY COPY AND REVIEW PENDING

---

## 1. Roles Dump

- **Backup ID**: MEDWELL-PHASE0-20260806-001
- **Backup type**: PostgreSQL roles-only logical dump
- **Source environment**: VERIFIED — Supabase Cloud
- **File name**: `roles.sql`
- **File size**: 370 bytes
- **Created at**: 2026-08-06 14:22:15 Asia/Bangkok
- **Created by**: Saifu Yusoh
- **SHA-256 evidence**: `phase0-evidence/checksums/SHA256SUMS.csv`
- **Checksum status**: PASS
- **Validation status**: PASS
- **Notes**: Roles dump created successfully through Supabase CLI.

---

## 2. Schema Dump

- **Backup ID**: MEDWELL-PHASE0-20260806-002
- **Backup type**: Schema-only logical dump
- **Source environment**: VERIFIED — Supabase Cloud
- **File name**: `schema.sql`
- **File size**: 77,333 bytes
- **Created at**: 2026-08-06 14:24:17 Asia/Bangkok
- **Created by**: Saifu Yusoh
- **SHA-256 evidence**: `phase0-evidence/checksums/SHA256SUMS.csv`
- **Checksum status**: PASS
- **Validation status**: PASS
- **Notes**: Database schema dump created successfully through Supabase CLI.

---

## 3. Data Dump

- **Backup ID**: MEDWELL-PHASE0-20260806-003
- **Backup type**: Data-only logical dump
- **Source environment**: VERIFIED — Supabase Cloud
- **File name**: `data.sql`
- **File size**: 86,516 bytes
- **Created at**: 2026-08-06 14:25:24 Asia/Bangkok
- **Created by**: Saifu Yusoh
- **SHA-256 evidence**: `phase0-evidence/checksums/SHA256SUMS.csv`
- **Checksum status**: PASS
- **Validation status**: PASS
- **Notes**: Database table data dump created successfully through Supabase CLI.

---

## 4. Encrypted Backup Archive

- **Backup ID**: MEDWELL-PHASE0-ENC-20260806-001
- **Archive file**: `medwell_phase0_backup_20260806_145743.7z`
- **Archive size**: 23,936 bytes
- **Archive format**: 7z
- **Compression method**: LZMA2
- **Encryption method**: 7z AES-256
- **Filename encryption**: ENABLED
- **Archive contents**:
  - `roles.sql`
  - `schema.sql`
  - `data.sql`
  - `SHA256SUMS.csv`
- **Created at**: 2026-08-06 14:58:01 Asia/Bangkok
- **Archive test result**: PASS
- **7-Zip result**: `Everything is Ok`
- **Files verified**: 4
- **Uncompressed size**: 164,593 bytes
- **Encrypted archive checksum evidence**: `phase0-evidence/checksums/VERIFIED_ENCRYPTED_BACKUP_SHA256.csv`
- **Encrypted checksum status**: PASS
- **Password storage**: Stored separately from the backup archive
- **Password recorded in this register**: NO

---

## 5. Separate Secure Storage Copy

- **Destination storage type**: Trusted secondary Windows computer
- **Destination directory**: `C:\MEDWELL_SECURE_BACKUPS\2026-08-06`
- **Archive copied**: PASS
- **Checksum record copied**: PASS
- **Destination file exists**: PASS
- **Destination archive size**: 23,936 bytes
- **Source and destination SHA-256 matched**: PASS
- **Destination archive test**: PASS
- **7-Zip result**: `Everything is Ok`
- **Secondary backup copy**: PASS
- **Destination SHA-256 verification**: PASS
- **Archive integrity test**: PASS
- **Verification evidence**:
  - `SECONDARY_BACKUP_HASH_VERIFICATION.csv`
  - `SECONDARY_BACKUP_ARCHIVE_TEST.csv`
  - `SECONDARY_BACKUP_VERIFICATION.txt`
- **Verified computer**: `[กามี ละง]`
- **Verified user**: `[Saifu Yusoh]`
- **Verified at**: `[06082026 19:18]`
- **Password stored with backup**: NO
- **Notes**: The encrypted MEDWELL backup archive was copied to a separate trusted computer. The destination SHA-256 checksum matched the approved source checksum, and the 7-Zip integrity test returned `Everything is Ok`.

---

## 6. Storage Data Scope

- Database schema and table data were included in the PostgreSQL logical dump.
- Supabase Storage object files were not independently downloaded or verified by this backup procedure.
- Authentication secrets, service-role keys, environment variables, and encryption passwords are not included.
- A separate review is required if MEDWELL currently stores uploaded documents or images in Supabase Storage.

---

## 7. Verification Summary

| Verification item | Result | Evidence |
|---|---|---|
| Source environment verified | PASS | Supabase project linked successfully |
| Roles dump created | PASS | `phase0-evidence/backups/roles.sql` |
| Schema dump created | PASS | `phase0-evidence/backups/schema.sql` |
| Data dump created | PASS | `phase0-evidence/backups/data.sql` |
| Source SHA-256 generated | PASS | `phase0-evidence/checksums/SHA256SUMS.csv` |
| AES-256 encryption | PASS | Verified encrypted 7z archive |
| Archive integrity test on source computer | PASS | 7-Zip returned `Everything is Ok` |
| Encrypted archive SHA-256 | PASS | `VERIFIED_ENCRYPTED_BACKUP_SHA256.csv` |
| Separate storage copy | PASS | Encrypted backup stored on a trusted secondary computer |
| Destination SHA-256 verification | PASS | `SECONDARY_BACKUP_HASH_VERIFICATION.csv` |
| Destination archive test | PASS | `SECONDARY_BACKUP_ARCHIVE_TEST.csv` |
| Secondary verification summary | PASS | `SECONDARY_BACKUP_VERIFICATION.txt` |
| Staging restore rehearsal | PASS | `STAGING_RESTORE_REPORT.md` |
| Independent review | PENDING | Reviewer signature required |

## Current Decision

`BACKUP AND STAGING RESTORE REHEARSAL: COMPLETE`

---

## 8. Execution Sign-off

- **Executed by**: Saifu Yusoh
- **Execution role**: Technical Lead / Database Owner / Security Owner
- **Execution date**: 2026-08-06
- **Execution result**: PASS
- **Comments**: Logical backup files were generated, checksummed, encrypted using AES-256, and successfully tested for archive integrity.

**Executor signature**: Saifu Yusoh  
**Signed date**: 2026-08-06

---

## 9. Independent Review

- **Reviewed by**: PENDING
- **Reviewer role**: PENDING
- **Reviewed at**: PENDING
- **Review status**: PENDING_REVIEW
- **Reviewer comments**: PENDING
- **Reviewer signature**: PENDING


The reviewer must verify:

1. The encrypted archive exists.
2. The archive can be tested using the correct password.
3. The source and destination SHA-256 values match.
4. The secondary copy is stored separately from the development computer.
5. The backup password is not stored with the archive.
6. Backup files are excluded from Git.

---

## 10. Current Decision

`BACKUP AND STAGING RESTORE REHEARSAL: COMPLETE`

The backup must not be marked fully verified until the secondary copy, destination checksum verification, and independent review have been completed.
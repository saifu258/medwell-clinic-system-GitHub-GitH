# Phase 9 — Gate B Pre-Execution Safety Report

## 1. Status

**PASS — GATE B EXECUTION MAY BE REQUESTED**

All technical identity, baseline, destination, tooling, Edge configuration, and test gates passed. The owner has confirmed that Firebase CLI credential renewal is complete and Firebase Staging remains verified. No Critical/High blocker remains. Gate B was not executed.

## 2. Git Baseline

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `49f0c41889bfe866ca500e7645837210baecd0f8` |
| Commit | `49f0c41 feat: prepare phase 9 staging isolation and gate a readiness` |
| `main == origin/main` | YES |
| Initial working tree | CLEAN |
| Initial staged files | 0 |

This report is the only file created by the pre-execution check, so the final tree is intentionally no longer clean.

## 3. Firebase Staging Identity

`FIREBASE_STAGING_REMOTE_IDENTITY = VERIFIED`

| Field | Result |
| --- | --- |
| Project ID | `medwell-clinic-staging` |
| Project number | `667966448562` |
| Display name | `MEDWELL Clinic Staging` |
| State | `ACTIVE` |

## 4. Firebase Hosting

`FIREBASE_STAGING_HOSTING = VERIFIED`

- Site: `medwell-clinic-staging`
- Default URL: `https://medwell-clinic-staging.web.app`
- Type: `DEFAULT_SITE`

No Firebase deployment occurred.

## 5. Supabase Staging Identity

`SUPABASE_STAGING_REMOTE_IDENTITY = VERIFIED`

| Field | Result |
| --- | --- |
| Project | `MEDWELL Clinic Staging` |
| Ref | `mrgjpgcppvikyrtaspuf` |
| Region | `ap-southeast-1` |
| Status | `ACTIVE_HEALTHY` |

The prior Gate A metadata evidence remains authoritative:

- Database: `BLANK_STAGING`.
- MEDWELL tables: 0/21.
- MEDWELL RPCs: 0/12.
- Migration history: `EMPTY`.

No remote database inspection was repeated.

## 6. Production Separation and Guard

- Firebase Staging `medwell-clinic-staging` differs from Production `medwell-clinic-system`.
- Supabase Staging `mrgjpgcppvikyrtaspuf` differs from protected Production ref `rubqdcvwrwatxdrtfxkg`.
- Staging preflight: PASS.
- Active `.firebaserc` default remains Production; future Firebase commands must always include `--project medwell-clinic-staging`.
- Active repository Supabase link remains `rubqdcvwrwatxdrtfxkg`; future Gate B database commands must not use it.
- Proposed database commands use an explicitly validated Staging database URL and an isolated workdir.

`PRODUCTION_REMOTE_MUTATION = NONE`

## 7. Canonical Baseline and Seed

| Artifact | Actual SHA-256 | Result |
| --- | --- | --- |
| `phase9-baseline-candidate/baseline.sql` | `430B276DCF9783AF715AC7EF0B6FCD4F1C4036AAEF936F6BFC55E63A0FD979E1` | MATCH |
| `phase9-baseline-candidate/seed.sql` | `257F9ECF662700FC4B75672C4F8FAF6ACB23B961F5DF344013E76A7F4FA66406` | MATCH |

The candidate remains local review-only and excluded through `.git/info/exclude`. It was not moved into active migrations.

## 8. Migration Path

```text
OLD HISTORICAL MIGRATIONS = AUDIT HISTORY
CANONICAL BASELINE = ONLY ZERO-TO-ONE STAGING PATH
```

The six tracked Phase 2–7 files under `supabase/migrations/` remain a broken filename-ordered chain and must not be pushed or replayed. Gate B must create a new isolated Supabase workdir containing exactly one newly generated canonical baseline migration plus the approved reference seed.

No migration, push, repair, reset, or remote SQL operation was performed.

## 9. Backup Destinations

| Destination | Exists | Writable | Probe removed | Result |
| --- | --- | --- | --- | --- |
| `C:\MEDWELL_SECURE_BACKUPS\STAGING\` | Yes | Yes | Yes | `PRIMARY_BACKUP_DESTINATION = READY` |
| `D:\MEDWELL_SECURE_BACKUPS\STAGING\` | Yes | Yes | Yes | `SECONDARY_BACKUP_DESTINATION = READY` |

Each test used one randomized temporary file and deleted it in `finally`. No backup was taken.

## 10. Backup Tooling

| Tool/path | Result |
| --- | --- |
| Docker client/server | `29.5.3` / `29.5.3` |
| PostgreSQL-compatible container images | Supabase PostgreSQL 17.6 images present |
| Supabase CLI | `2.113.0`; `db dump` available |
| 7-Zip | `C:\Program Files\7-Zip\7z.exe`, version `26.02` |
| SHA-256 | PowerShell `Get-FileHash` available |
| Prior PostgreSQL 17 dump/restore rehearsal | PASS |

`BACKUP_EXECUTION_PATH = READY`

## 11. Edge Secret Names

Read-only `supabase secrets list --project-ref mrgjpgcppvikyrtaspuf` returned exactly these user-configured names:

- `MEDWELL_ENV`
- `FIREBASE_PROJECT_ID`
- `ALLOWED_ORIGINS`

No secret values or digests were printed. `SUPABASE_URL`, `SUPABASE_SECRET_KEYS`, and legacy `SUPABASE_SERVICE_ROLE_KEY` are platform-managed and must not be set manually.

## 12. Edge Static Readiness

- `SUPABASE_SECRET_KEYS.default` is preferred.
- `SUPABASE_SERVICE_ROLE_KEY` is a legacy fallback only when the new key map is absent.
- Missing URL/admin key fails closed.
- Malformed key-map JSON fails closed without legacy downgrade.
- Publishable/anon keys are never admin fallbacks.
- Staging rejects both protected Production identities and Production origins.

## 13. Test Results

- `npm test`: PASS — 27/27.
- `npx deno-bin@2.2.7 test supabase/functions/api/environment_test.ts`: PASS — 10/10.
- `npx deno-bin@2.2.7 check supabase/functions/api/index.ts`: PASS.

## 14. Tracked-Source Secret Scan

No tracked source contains a detected private key, Supabase secret-key value, OAuth access/refresh token, JWT value, service-account private key, or literal database password.

Two documented PostgreSQL URI templates matched the database-credential shape; both password segments were verified as placeholders, not literals:

- `docs/evidence/backup_script.ps1`
- `docs/evidence/restore_script.ps1`

`TRACKED_SOURCE_SECRET_SCAN = PASS`

## 15. Closed Credential Condition

Owner confirmation received:

1. Firebase CLI credential renewal: DONE.
2. Firebase Staging verification after renewal: VERIFIED.

No database, backup, Edge, Hosting, credential, or migration readiness blocker remains.

## 16. Proposed Gate B Execution Commands — NOT EXECUTED

These commands are a proposal for separate owner authorization. They must not be run from the active repository's Production-associated Supabase link.

### A. Mandatory target guard and backup

```powershell
$GateBStagingFirebase = 'medwell-clinic-staging'
$GateBStagingSupabase = 'mrgjpgcppvikyrtaspuf'
$GateBProtectedFirebase = 'medwell-clinic-system'
$GateBProtectedSupabase = 'rubqdcvwrwatxdrtfxkg'
$GateBWorkdir = 'C:\MEDWELL_GATE_B_STAGING_WORKDIR'
$GateBPrimary = 'C:\MEDWELL_SECURE_BACKUPS\STAGING'
$GateBSecondary = 'D:\MEDWELL_SECURE_BACKUPS\STAGING'
$GateBStamp = Get-Date -Format 'yyyyMMdd_HHmmss'

if ($GateBStagingFirebase -eq $GateBProtectedFirebase) { throw 'FIREBASE_TARGET_COLLISION' }
if ($GateBStagingSupabase -eq $GateBProtectedSupabase) { throw 'SUPABASE_TARGET_COLLISION' }
if ([string]::IsNullOrWhiteSpace($env:MEDWELL_STAGING_DB_URL)) { throw 'STAGING_DB_URL_REQUIRED' }
if (-not $env:MEDWELL_STAGING_DB_URL.Contains($GateBStagingSupabase)) { throw 'STAGING_DB_URL_REF_MISMATCH' }
if ($env:MEDWELL_STAGING_DB_URL.Contains($GateBProtectedSupabase)) { throw 'PRODUCTION_DB_URL_BLOCKED' }

npx supabase db dump --db-url "$env:MEDWELL_STAGING_DB_URL" --file "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.roles.sql" --role-only
npx supabase db dump --db-url "$env:MEDWELL_STAGING_DB_URL" --file "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.schema.sql"
npx supabase db dump --db-url "$env:MEDWELL_STAGING_DB_URL" --file "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.data.sql" --data-only --use-copy --exclude 'storage.buckets_vectors' --exclude 'storage.vector_indexes'

Get-FileHash -Algorithm SHA256 "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.*.sql" |
  Export-Csv -NoTypeInformation "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.sha256.csv"

& 'C:\Program Files\7-Zip\7z.exe' a -t7z -mhe=on -p "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.7z" "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.*.sql" "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.sha256.csv"
& 'C:\Program Files\7-Zip\7z.exe' t -p "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.7z"
Copy-Item -LiteralPath "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.7z" -Destination "$GateBSecondary\MEDWELL_STAGING_$GateBStamp.7z"
Copy-Item -LiteralPath "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.sha256.csv" -Destination "$GateBSecondary\MEDWELL_STAGING_$GateBStamp.sha256.csv"
Get-FileHash -Algorithm SHA256 "$GateBPrimary\MEDWELL_STAGING_$GateBStamp.7z", "$GateBSecondary\MEDWELL_STAGING_$GateBStamp.7z"
```

The archive password must be entered interactively and stored separately in the owner-approved password manager. The database URL must remain process-scoped and must never be echoed or written to the report.

### B. Isolated canonical epoch preparation and dry run

```powershell
if (Test-Path -LiteralPath $GateBWorkdir) { throw 'GATE_B_WORKDIR_MUST_NOT_EXIST' }
[System.IO.Directory]::CreateDirectory($GateBWorkdir) | Out-Null
npx supabase init --workdir "$GateBWorkdir"
Copy-Item -LiteralPath '.\supabase\config.toml' -Destination "$GateBWorkdir\supabase\config.toml" -Force
npx supabase migration new phase9_canonical_baseline --workdir "$GateBWorkdir"

$GateBMigrations = @(Get-ChildItem -LiteralPath "$GateBWorkdir\supabase\migrations" -Filter '*.sql')
if ($GateBMigrations.Count -ne 1) { throw 'CANONICAL_EPOCH_NOT_ISOLATED' }
$GateBMigration = $GateBMigrations[0]
Copy-Item -LiteralPath '.\phase9-baseline-candidate\baseline.sql' -Destination $GateBMigration.FullName -Force
Copy-Item -LiteralPath '.\phase9-baseline-candidate\seed.sql' -Destination "$GateBWorkdir\supabase\seed.sql" -Force

if ((Get-FileHash -Algorithm SHA256 $GateBMigration.FullName).Hash -ne '430B276DCF9783AF715AC7EF0B6FCD4F1C4036AAEF936F6BFC55E63A0FD979E1') { throw 'BASELINE_HASH_MISMATCH' }
if ((Get-FileHash -Algorithm SHA256 "$GateBWorkdir\supabase\seed.sql").Hash -ne '257F9ECF662700FC4B75672C4F8FAF6ACB23B961F5DF344013E76A7F4FA66406') { throw 'SEED_HASH_MISMATCH' }
npx supabase db push --db-url "$env:MEDWELL_STAGING_DB_URL" --workdir "$GateBWorkdir" --dry-run --include-all --include-seed
```

Stop after the dry run and obtain a second owner confirmation before applying anything.

### C. Separately authorized execution sequence

```powershell
npx supabase db push --db-url "$env:MEDWELL_STAGING_DB_URL" --workdir "$GateBWorkdir" --include-all --include-seed
npx supabase db query --db-url "$env:MEDWELL_STAGING_DB_URL" --file '.\phase9-baseline-candidate\validation.sql'
npx supabase functions deploy api --project-ref mrgjpgcppvikyrtaspuf

$env:STAGING_FIREBASE_PROJECT_ID = 'medwell-clinic-staging'
$env:STAGING_SUPABASE_PROJECT_REF = 'mrgjpgcppvikyrtaspuf'
$env:MEDWELL_ENV = 'staging'
$env:FIREBASE_PROJECT_ID = 'medwell-clinic-staging'
$env:SUPABASE_URL = 'https://mrgjpgcppvikyrtaspuf.supabase.co'
$env:ALLOWED_ORIGINS = '["https://medwell-clinic-staging.web.app","https://medwell-clinic-staging.firebaseapp.com"]'
try {
  npm run build:config -- --environment staging
  npm run preflight:staging -- --manifest config/environments/staging.json --runtime-config public/assets/js/runtime-config.js --expected-firebase-project medwell-clinic-staging --expected-supabase-ref mrgjpgcppvikyrtaspuf --firebase-target medwell-clinic-staging
  firebase deploy --only hosting --project medwell-clinic-staging
} finally {
  Remove-Item Env:STAGING_FIREBASE_PROJECT_ID,Env:STAGING_SUPABASE_PROJECT_REF,Env:MEDWELL_ENV,Env:FIREBASE_PROJECT_ID,Env:SUPABASE_URL,Env:ALLOWED_ORIGINS -ErrorAction SilentlyContinue
  npm run build:config -- --environment production
}
```

Do not use `supabase migration repair`, remote reset, the active migration folder, implicit `supabase db push`, implicit `firebase deploy`, Production identifiers, or `--no-verify-jwt`.

## 17. Authorization Recommendation

`GATE_B_EXECUTION_ELIGIBILITY = MAY BE REQUESTED`

This pre-execution pass is not itself authorization to execute. The owner may now issue a separate Gate B execution request that names or adopts the exact sequence and targets above.

## 18. No Deployment or Mutation Confirmation

- Database backup: NOT EXECUTED.
- Migration apply/push/repair/reset: NOT EXECUTED.
- Remote SQL/schema/data mutation: NONE.
- Supabase Edge deployment/invocation: NONE.
- Firebase deployment: NONE.
- Remote secret changes: NONE.
- Production operation: NONE.
- Git add/commit/push: NONE.

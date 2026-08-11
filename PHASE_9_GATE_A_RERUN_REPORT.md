# Phase 9 — Gate A Rerun Report

## 1. Status

**PASS — GATE B MAY BE PROPOSED**

Supabase Staging remains verified, healthy, and classified `BLANK_STAGING`. The canonical baseline remains valid. The Firebase verification rerun also verified the Staging project, Hosting site, Google provider, and authorized domains through authenticated read-only CLI/API calls.

No Critical/High Gate A blocker remains. Gate B may be proposed, but it has not been started or authorized.

## 2. Local Baseline and Git Safety

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `e21a85a49271d3abb6fda05bed2f63b2e223f229` |
| `main` | Same as HEAD |
| `origin/main` | Same as HEAD |
| Staged files | 0 |
| Commits/push after baseline | None |
| Tracked modifications | Approved Phase 9 environment integration only |

The active repository Supabase link remains the protected Production-associated ref `rubqdcvwrwatxdrtfxkg` and was not used for remote inspection. All Supabase Staging reads either specified `mrgjpgcppvikyrtaspuf` directly or used an ignored temporary workdir linked explicitly to that ref.

## 3. Staging Identity Preflight

The existing local preflight passed using:

- Firebase: `medwell-clinic-staging`
- Supabase: `mrgjpgcppvikyrtaspuf`
- Supabase URL: `https://mrgjpgcppvikyrtaspuf.supabase.co`
- Staging origins only

The Staging identifiers do not equal either protected Production identifier. Production runtime output was restored after the preflight.

## 4. Firebase Staging Remote Identity

`FIREBASE_STAGING_REMOTE_IDENTITY = VERIFIED`

Read-only evidence:

- `firebase projects:list --json` returned `medwell-clinic-staging`.
- Project number: `667966448562`.
- Display name: `MEDWELL Clinic Staging`.
- Project state: `ACTIVE`.
- Default Hosting resource: `medwell-clinic-staging`.
- `firebase hosting:sites:list --project medwell-clinic-staging --json` succeeded and returned the expected default site.

The authenticated Firebase CLI now has read access to the exact Staging project. No Firebase Production project was targeted.

## 5. Supabase Staging Remote Identity

`SUPABASE_STAGING_REMOTE_IDENTITY = VERIFIED`

| Field | Verified value |
| --- | --- |
| Name | `MEDWELL Clinic Staging` |
| Project ref | `mrgjpgcppvikyrtaspuf` |
| Region | `ap-southeast-1` |
| Status | `ACTIVE_HEALTHY` |

The Supabase connector account lacked permission, so it returned no metadata. The authenticated Supabase CLI independently verified the exact Staging project. No implicit linked target was used.

## 6. Production Separation

- Firebase Staging ID differs from `medwell-clinic-system`.
- Supabase Staging ref differs from `rubqdcvwrwatxdrtfxkg`.
- No command targeted the Production Firebase project.
- No Supabase database command used the active Production-associated link.
- No Production schema, data, functions, secrets, Hosting, or Auth settings were read or mutated.

`PRODUCTION_REMOTE_MUTATION = NONE`

## 7. Remote Database Classification

`STAGING_DATABASE_CLASSIFICATION = BLANK_STAGING`

Evidence:

- `supabase gen types --project-id mrgjpgcppvikyrtaspuf --schema public` succeeded.
- Public tables: 0.
- Public views: 0.
- Public functions/RPCs: 0.
- Public enums: 0.
- Required MEDWELL tables present: 0/21.
- Required MEDWELL RPCs present: 0/12.
- Remote migration history: empty.

Supabase-managed schemas do not change this classification.

## 8. MEDWELL Table Inventory

| Table | Status |
| --- | --- |
| users | MISSING |
| patients | MISSING |
| appointments | MISSING |
| queues | MISSING |
| visits | MISSING |
| audit_logs | MISSING |
| counters | MISSING |
| treatment_programs | MISSING |
| course_products | MISSING |
| course_product_programs | MISSING |
| course_enrollments | MISSING |
| visit_treatments | MISSING |
| course_usage_history | MISSING |
| invoices | MISSING |
| invoice_items | MISSING |
| payments | MISSING |
| refunds | MISSING |
| expenses | MISSING |
| user_professional_profiles | MISSING |
| medical_certificates | MISSING |
| record_edit_locks | MISSING |

## 9. Remote Migration History

`REMOTE_MIGRATION_HISTORY = EMPTY`

An ignored temporary Supabase workdir was initialized and linked explicitly to `mrgjpgcppvikyrtaspuf`. `supabase migration list --linked` returned:

```json
{"migrations":[],"message":"Migrations listed"}
```

No repair, push, up, fetch, or history mutation command was run.

## 10. Remote Function, RLS, Policy, and Grant Metadata

- MEDWELL/public RPC count: 0.
- MEDWELL/public table count: 0.
- RLS/policies: `NOT_APPLICABLE_PRE_BASELINE`.
- Table/function grants: `NOT_APPLICABLE_PRE_BASELINE`.

No RLS or grant pass was fabricated for objects that do not exist.

## 11. PII Safety

Only project, schema, type, migration, and secret-name metadata was inspected. No patient, user, clinical, certificate, payment, or other application row was queried. No PII or credential value was printed.

`UNEXPECTED_DATA_PRESENT = NO EVIDENCE IN PUBLIC/MEDWELL SCHEMA`

Auth-user row data was intentionally not inspected.

## 12. Canonical Baseline Verification

| Evidence | Result |
| --- | --- |
| Baseline SHA-256 | `430B276DCF9783AF715AC7EF0B6FCD4F1C4036AAEF936F6BFC55E63A0FD979E1` — MATCH |
| Determinism | `CANONICAL_BASELINE_DETERMINISTIC = YES` |
| RLS evidence | 21/21 |
| Privileged RPC evidence | 12/12 |
| Firebase actor type | `text` compatible |
| Seed users/patients/clinical/financial rows | 0 |

The candidate remains under `phase9-baseline-candidate/` and was not moved into active migrations.

## 13. Migration Epoch Readiness

Confirmed:

```text
OLD HISTORICAL MIGRATIONS = AUDIT HISTORY
CANONICAL BASELINE = NEW ZERO-TO-ONE STAGING PATH
```

The filename-ordered historical chain remains non-replayable. Gate B must never apply the old Phase 2–7 chain directly to blank Staging.

## 14. Backup Readiness

`STAGING_BACKUP_EXECUTION_READY`

- Exact Staging temporary link succeeded without changing the active repository link.
- Authenticated remote database connection succeeded for migration metadata.
- Supabase CLI supports `db dump --linked` from the isolated workdir.
- Docker server `29.5.3` is available.
- PostgreSQL 17 container dump/restore path was proven locally.
- 7-Zip `26.02` is available.
- SHA-256 tooling is available.
- Encrypted local restore rehearsal previously passed.

No remote backup was taken in Gate A.

`BACKUP_DESTINATION_PENDING_OWNER_APPROVAL`

No approved primary restricted destination or independent secondary encrypted destination was found in owner configuration/documentation.

## 15. Edge Secret-Name Readiness

`STAGING_EDGE_SECRETS_NOT_CONFIGURED`

Read-only `supabase secrets list --project-ref mrgjpgcppvikyrtaspuf` returned zero user-configured secret names.

| Required name | Status |
| --- | --- |
| `MEDWELL_ENV` | MISSING |
| `FIREBASE_PROJECT_ID` | MISSING |
| `ALLOWED_ORIGINS` | MISSING |
| `SUPABASE_URL` | MISSING |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS` | MISSING |

No secret values were requested, read, printed, or changed.

## 16. Firebase Auth, Hosting, and Origin Readiness

| Item | Result |
| --- | --- |
| Firebase Auth project identity | `REMOTE_API_VERIFIED` — project `667966448562` |
| Authentication provider configuration | `REMOTE_API_VERIFIED` — `google.com` enabled |
| Firebase Hosting site identity | `REMOTE_CLI_VERIFIED` — `medwell-clinic-staging` |
| Default Hosting URL | `https://medwell-clinic-staging.web.app` |
| Authorized domains | `localhost`, `medwell-clinic-staging.firebaseapp.com`, `medwell-clinic-staging.web.app` |
| Production origins in Staging manifest | None |

The owner-console evidence is now corroborated by authenticated read-only Firebase CLI and Identity Toolkit Admin API GET requests.

## 17. Gate B Prerequisite Matrix

| Requirement | Status | Blocking? |
| --- | --- | --- |
| Firebase Staging remote identity | VERIFIED / ACTIVE | No |
| Supabase Staging remote identity | VERIFIED / ACTIVE_HEALTHY | No |
| Production separation | PASS | No |
| Blank Staging classification | BLANK_STAGING | No |
| Canonical baseline checksum | MATCH | No |
| Migration epoch strategy | READY | No |
| Backup execution path | READY | No |
| Backup destination | PENDING OWNER APPROVAL | Gate B condition |
| Restore evidence | PASS — local rehearsal | No |
| Edge secret names/config | NOT CONFIGURED | Gate B condition |
| Firebase Auth readiness | VERIFIED — Google enabled and domains present | No |
| Staging Hosting origins | VERIFIED | No |
| Local baseline evidence | PASS | No |

## 18. Blocking Conditions and Gate B Eligibility

Critical/High blockers: none.

Conditions before any Gate B execution:

1. Approve primary and secondary secure backup destinations.
2. Configure required Edge secrets through an approved secret channel.
3. Preserve the canonical epoch path; never replay the broken historical chain.
4. Revoke and renew the Firebase CLI login before Gate B: a read-only account-inspection command emitted OAuth credential material to the private tool transcript. No credential was written to the workspace, and the workspace secret scan found zero matches.

`GATE_B_ELIGIBILITY = YES — MAY BE PROPOSED ONLY`

## 19. Verification Commands

- Local Staging preflight: PASS.
- `npm test`: PASS — 27/27.
- `npx deno-bin@2.2.7 check supabase/functions/api/index.ts`: PASS.
- Static credential scan: PASS.
- `git diff --check`: PASS (exit code 0; line-ending conversion warnings only).
- `deno.lock`: restored after the Deno tooling check.
- Staged files: 0.

## 20. No Remote Mutation Confirmation

No remote SQL mutation, schema DDL, migration apply/repair/push, row write, Edge deployment, Firebase deployment, secret update, Hosting/Auth configuration change, or Production operation occurred.

The permitted temporary Supabase link was created only in `.temp/phase9-gatea-readonly`; the CLI logged login-role initialization as connection plumbing, then performed read-only migration metadata access. The active repository link stayed unchanged. No MEDWELL schema/data/history was altered.

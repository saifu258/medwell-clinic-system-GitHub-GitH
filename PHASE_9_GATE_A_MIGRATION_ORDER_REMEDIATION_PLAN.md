# Phase 9 Gate A Remediation — Migration Order Remediation Plan

## Status

**REMEDIATION_STRATEGY_PROPOSED**

No historical migration was renamed, edited, moved, unignored, committed, or executed remotely.

## 1. Current Conflict

Supabase applies migrations by filename/timestamp order. The repository order is:

1. `20260810032648_phase4_treatment_course_foundation.sql`
2. `20260810090218_phase3_clinical_workflow_foundation.sql`

Phase 4 therefore executes before Phase 3 even though its workflow RPC depends on Phase 3 schema.

## 2. Root Cause

Conceptual phase numbering and timestamp ordering diverged. Phase 4 received an earlier timestamp than Phase 3, while Phase 4 copied and extended the workflow function that assumes Phase 3's visit columns already exist.

## 3. Phase 4 Dependencies on Phase 3

Phase 4 reads or updates these Phase 3-only `public.visits` columns:

- `workflow_stage`
- `stage_started_at`
- `stage_completed_at`
- `completed_at`
- `hp_recorded_by`
- `hp_recorded_at`
- `next_appointment_decision`
- `next_appointment_id`
- `visit_summary`
- `visit_summary_recorded_by`
- `visit_summary_recorded_at`

A later Phase 9 migration cannot make a blank replay reach itself if Phase 4 fails first. A prerequisite migration that adds the columns early also does not solve the chain because the unchanged Phase 3 migration later uses non-idempotent `ADD COLUMN` statements and would then fail on duplicates.

## 4. Additional Fresh-Bootstrap Defect Found

The legacy baseline defines `public.users.uid` as `text`. Phase 7 defines:

- `record_edit_locks.locked_by uuid REFERENCES public.users(uid)`
- `medwell_acquire_edit_lock(... p_actor uuid ...)`
- `medwell_force_release_edit_lock(... p_admin_uid uuid)`

PostgreSQL cannot create that foreign key between `uuid` and `text`, and Firebase UIDs are opaque strings rather than guaranteed UUIDs. The Edge API passes the Firebase UID directly. A canonical baseline must use `text` consistently for these actor identifiers. This is another HIGH fresh-bootstrap blocker and must be tested with synthetic non-UUID Firebase-like IDs.

## 5. Why Rename/Edit Is Unsafe

- The six Phase 2–7 files are committed release history.
- Renaming changes migration version identity and can make already-applied databases appear missing or divergent.
- Editing changes the meaning of an existing migration version without changing its identifier.
- Manually running Phase 3 before Phase 4 would not match the filename-ordered history used by future `db push`.
- `migration repair` changes history records only; it does not apply or validate SQL.

Historical files must remain immutable until the owner approves a one-time migration-epoch transition.

## 6. Candidate Remediation Options

| Option | Fresh database | Existing database | History / `db push` impact | Rollback | Risk | Old files immutable? |
| --- | --- | --- | --- | --- | --- | --- |
| A. New Phase 9 prerequisite/reconciliation migration | **Does not work alone** because it executes after the failing order. An artificially earlier prerequisite would make unchanged Phase 3 duplicate columns. | Could forward-fix an already-upgraded schema only after exact metadata review | Does not repair fresh replay; can create misleading green history | Forward-fix only | HIGH; reject as sole strategy | YES |
| B. New canonical baseline/squashed migration epoch | One reviewed baseline constructs the final schema deterministically, followed by explicit safe seed/reference data | Existing DB must be reconciled to the new epoch without replaying baseline | Requires owner-approved active migration-set transition and verified history mapping; future `db push` becomes simple after epoch alignment | Restore backup or forward correction; never drop live ledgers ad hoc | MEDIUM with full local rehearsal; **recommended** | YES; archived history retained unchanged |
| C. Managed migration-history baseline on verified Staging | Suitable only if Staging schema is already complete; not a blank bootstrap | Marking a baseline applied is possible only after actual schema equivalence is proven | `migration repair` changes tracking only and must not be used as schema creation | Restore history snapshot/backup under runbook | HIGH if schema evidence is incomplete; conditional tool, not primary strategy | YES |
| D. Deterministic bootstrap runner applying files in conceptual order | Can apply legacy → Phase 2 → Phase 3 → Phase 4 → Phases 5–7, with explicit correction overlay | Separate upgrade lane still required | Creates a custom history problem unless it ends by establishing an approved migration epoch | Disposable rebuild for new DB; complex for existing DB | MEDIUM-HIGH; useful to generate/test baseline, not as permanent deployment mechanism | YES |
| E. Supabase branch cloned from an existing project | May provide a schema copy without real production rows depending on branch behavior, but does not prove zero-to-one reproducibility | Inherits source state/history | Does not correct the repository's broken fresh replay | Delete disposable branch if owner-authorized | MEDIUM; optional validation environment only | YES |

## 7. Recommended Strategy

Adopt **Option B: a new canonical baseline migration epoch**, generated and proven locally through Option D's deterministic build harness.

The baseline must not be a blind `supabase migration squash` output. Current Supabase CLI documentation states that migration squashing produces a schema-only result and omits data manipulation such as inserts/updates/deletes. MEDWELL legacy migrations include clinic settings, service/medicine/diagnosis seed data, a bootstrap user, and later data corrections. These must be reviewed and separated into an explicit idempotent reference-data seed; real users and patient/transaction data must not be included.

### Proposed repository shape after owner approval

```text
supabase/migrations/                 # active epoch: one canonical baseline + future forward migrations
supabase/migrations_history/legacy/  # immutable historical SQL, preserved for audit only
supabase/seed.sql                    # synthetic/local-only or approved reference data; no real users
docs/migration-epoch-v1.json         # versions, schema hash, source order, approval record
```

Moving files or changing ignore rules is a future owner-approved operation, not part of this remediation.

## 8. Fresh Staging Bootstrap Strategy

1. Owner provisions/identifies an isolated empty Supabase Staging project.
2. Create a disposable local workdir with no remote link and confirm all URLs are localhost.
3. Apply the nine legacy migrations in their timestamp order.
4. Apply canonical logic in dependency order: Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → corrected Phase 7 intent.
5. Correct the Phase 7 lock actor type to `text` only in the generated canonical baseline source, leaving historical Phase 7 unchanged.
6. Run schema/RLS/function/grant/advisor checks and synthetic functional tests.
7. Generate one reviewed schema baseline migration. Generate a separate idempotent reference-data seed; exclude bootstrap real users and all clinical/financial rows.
8. Reset a second blank disposable local stack using only the candidate active baseline and seed.
9. Compare schema metadata, function definitions/signatures, grants, constraints, and required reference data against the source build.
10. Repeat the reset at least twice to prove deterministic construction.
11. Only after owner approval and backup readiness may a later Gate B apply the baseline to the verified empty Staging project.

No human should manually guess migration order during deployment; the approved baseline is the only active zero-to-one path.

## 9. Existing Staging Upgrade Strategy

1. Verify the project is isolated Staging and take a tested encrypted backup.
2. Read migration history and actual schema metadata; do not inspect patient rows.
3. Classify the DB as blank, baseline-equivalent, or partially upgraded.
4. If blank: use the fresh baseline path.
5. If baseline-equivalent: compare a documented schema hash/object matrix, then propose an owner-approved history-epoch mapping. Do not replay baseline SQL.
6. If partially upgraded: stop. Create forward-only reconciliation migrations from exact metadata differences; never blind-run legacy migrations.
7. Correct the Phase 7 actor type through a forward migration only if the object already exists; account for active locks and API compatibility.

## 10. Migration-History Strategy

- Record the new baseline version and exact schema checksum in a migration epoch manifest.
- Preserve old migration content unchanged for audit.
- For new databases, history starts with the canonical baseline version.
- For an existing equivalent database, any `migration repair --status applied` action requires separate owner approval, verified schema equivalence, backup/restore evidence, and a dry-run plan. It changes tracking only.
- Do not remove old remote history records or mark them reverted merely to silence CLI divergence without a documented one-time epoch transition.
- After alignment, `supabase migration list` and a blank local `db reset --local` must both be clean before any `db push` is proposed.

## 11. Local Disposable Rehearsal Commands (Future Execution)

Use separate temporary workdirs and `--local`; never include a project ref, remote URL, or credentials.

```powershell
# A: legacy-only construction
npx supabase start --workdir <LOCAL_LEGACY_WORKDIR>
npx supabase db reset --local --no-seed --workdir <LOCAL_LEGACY_WORKDIR>

# B: current filename-order reproduction; expected to expose the blocker
npx supabase start --workdir <LOCAL_CURRENT_CHAIN_WORKDIR>
npx supabase db reset --local --no-seed --workdir <LOCAL_CURRENT_CHAIN_WORKDIR>

# C: candidate canonical baseline
npx supabase start --workdir <LOCAL_BASELINE_V1_WORKDIR>
npx supabase db reset --local --workdir <LOCAL_BASELINE_V1_WORKDIR>
npx supabase db lint --local --workdir <LOCAL_BASELINE_V1_WORKDIR>
```

Expected assertions include all required tables/functions, RLS enabled, no unintended `PUBLIC` execution on privileged RPCs, actor IDs accepting synthetic non-UUID Firebase UIDs, reference data present exactly once, no real data, and two consecutive blank resets producing equivalent schema metadata.

Docker is now operational, but the rehearsal was not executed in this design-only remediation. Existing local Supabase containers include a restarting Vector container, which must be diagnosed or shown irrelevant before formal evidence is accepted.

## 12. Required Owner Decisions

1. Approve a new canonical migration epoch and archival location for immutable historical migrations.
2. Approve separating reference seed data from schema and excluding bootstrap real-user rows.
3. Approve correcting Phase 7 actor identifiers to `text` in the new baseline/future forward migration.
4. Decide whether any existing Staging database will be rebuilt from empty or reconciled in place.
5. Approve any later migration-history repair only after schema equivalence and backup evidence.
6. Approve local disposable rehearsal and subsequent Gate A rerun.

## References

- [Supabase database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase migration squash CLI](https://supabase.com/docs/reference/cli/supabase-migration-squash)
- [Supabase migration repair CLI](https://supabase.com/docs/reference/cli/supabase-migration-repair)

## No Remote Execution Confirmation

No remote migration, SQL, history repair, `db push`, function deployment, relink, or data mutation was performed.

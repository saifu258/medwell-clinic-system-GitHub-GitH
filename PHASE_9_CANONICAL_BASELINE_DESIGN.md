# Phase 9 — Canonical Baseline Design

## Candidate Status

**LOCAL PROOF COMPLETE — NOT ACTIVE**

The candidate is intentionally outside `supabase/migrations/`. Historical migrations remain immutable and retain their existing Git tracking state.

## Review Location

```text
phase9-baseline-candidate/
  baseline.sql
  seed.sql
  manifest.json
  validation.sql
  synthetic-smoke.sql
  validation.md
  validate-environment-config.mjs
  config/environments/
```

## Baseline Scope

`baseline.sql` includes:

- `pgcrypto` requirement
- all MEDWELL public tables, columns, constraints, indexes, and triggers
- final RPC/function definitions and signatures
- RLS enablement and Google-approval deny policy
- object-specific grants/revokes
- explicit fail-closed browser-role privilege revocation
- migration-owner default-privilege hardening

It contains no table rows, users, patients, clinical/financial records, certificates, or secrets.

## Historical Source and Dependency Resolution

The intended final schema was built locally from the nine legacy migrations, Phase 2, Phase 3 before Phase 4, then Phases 5–7. Two function identity signatures required explicit local-only drops because historical phases change return types:

- `medwell_workflow_transition`: `public.visits` → `jsonb`
- `medwell_record_payment`: `public.payments` → `jsonb`

These drops are baseline-generation mechanics, not edits to historical files and not future remote commands.

## Candidate Corrections

1. Phase 7 actor/Firebase UID fields and parameters use `text`.
2. Medical certificate issuance uses `patients.passport_no`.
3. Financial blocking-reasons initialization is explicitly `text[]`.
4. Supabase platform browser-role default grants are explicitly revoked.
5. Platform-owned `supabase_admin` default ACL dump statements are excluded from the application baseline.

## Reference Seed Design

`seed.sql` contains only:

- four clinic settings
- service `SV001`
- medicine `MED001`
- diagnosis reference `J00`

All statements use deterministic keys and `ON CONFLICT DO UPDATE`. Actor FKs are null rather than referencing the excluded historical bootstrap user. Two consecutive runs do not create duplicates.

Excluded:

- historical bootstrap UID/email
- real or synthetic users
- patients, appointments, queues, visits
- clinical notes and certificates
- invoices, payments, refunds, expenses
- secrets and credentials

## Activation Requirements

The candidate must not be moved into the active migration directory until a later owner-approved epoch activation phase:

1. Review every candidate correction and manifest hash.
2. Confirm isolated empty Staging identities.
3. Repeat Gate A identity and remote metadata checks.
4. Take and restore-test an approved Staging backup if Staging is not empty.
5. Choose a new migration timestamp using `supabase migration new` at activation time.
6. Establish how existing environments map to the new epoch without replaying the baseline.
7. Run local reset/lint/security/smoke again from the exact activation artifact.
8. Approve migration history handling separately; never infer or repair it automatically.

## Deterministic Proof

Two fresh PostgreSQL 17 databases applied only the candidate baseline and seed. Required metadata, function signatures, RLS, grants, and ordered reference data matched. Normalized schema and reference hashes were equal.

Result: `CANONICAL_BASELINE_DETERMINISTIC = YES`.

## Canonical Identity Table

`public.users` is the canonical MEDWELL identity/profile table. `public.profiles` is intentionally not created.

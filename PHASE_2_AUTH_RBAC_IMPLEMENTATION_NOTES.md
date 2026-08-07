# Phase 2 Auth/RBAC Implementation Notes

## Verified Files
- `public/assets/js/auth.js`
- `public/assets/js/permissions.js`
- `public/assets/js/pages/selectRolePage.js`
- `supabase/functions/api/auth.ts`
- `supabase/functions/api/helpers.ts`
- `supabase/functions/api/index.ts`
- `supabase/migrations/20260801202355_medwell_initial_schema.sql`
- `supabase/migrations/20260802041155_google_role_approvals.sql`

## Exact Current Role Logic
**Frontend:**
- `permissions.js`: Defines `rolePermissions` for `admin`, `receptionist`, `nurse`, `doctor`, `pharmacist`, `cashier`.
- `selectRolePage.js`: Displays 5 roles for Google users to select (`receptionist`, `nurse`, `doctor`, `pharmacist`, `cashier`).

**Backend (`helpers.ts`):**
- `permissions`: Maps legacy roles to specific permissions.
- `GOOGLE_SELF_SELECT_ROLES`: `["receptionist", "nurse", "doctor", "pharmacist", "cashier"]`.

## Exact DB Constraints (Verified from Schema)
**`users` table:**
- Primary key: `uid`
- Role column: `roles text[] not null default '{}'` (No CHECK constraint on `roles` column natively).

**`google_role_approvals` table:**
- Columns: `approval_id`, `email`, `approved_role`, `active`, `used_by`, `used_at`, `created_by`, `created_at`, `updated_at`
- Foreign keys: `used_by` references `public.users(uid)`, `created_by` references `public.users(uid)`
- Constraints: Unnamed CHECK constraints:
  - `check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')`
  - `check (approved_role in ('receptionist','nurse','doctor','pharmacist','cashier'))` (Implied name: `google_role_approvals_approved_role_check`)
  - `check ((used_by is null and used_at is null) or (used_by is not null and used_at is not null))`

**`audit_logs` table:**
- Columns: `log_id`, `occurred_at`, `user_uid`, `user_name`, `roles`, `action`, `module`, `record_type`, `record_id`, `description`, `ip_address`, `user_agent`, `success`, `error_code`

**RPC/Functions:**
- Signature: `public.medwell_claim_google_role(p_uid text, p_email text, p_display_name text, p_photo_url text, p_role text, p_provider text) returns public.users`
- `approved_role` check constraint: `check (approved_role in ('receptionist','nurse','doctor','pharmacist','cashier'))`.

**`medwell_claim_google_role` function:**
- Hardcoded checks for the 5 legacy roles.

## Planned Modifications
1. **Frontend**:
   - Update `permissions.js` to map `admin`, `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`. (Implement temporary runtime aliases for `receptionist`, `nurse`, `cashier` -> `clinic_assistant` marked explicitly as TEMPORARY MIGRATION COMPATIBILITY ONLY).
   - Update `selectRolePage.js` to show only the 3 new clinical roles (`physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`).
   - Add blocking logic and a dedicated Thai blocking screen for `pending_role_review`.
   - Update Admin `usersPage.js` to distinguish resolving `pending_role_review` (only allows selecting the 3 clinical target roles) from assigning Admin (which remains in its protected flow).

2. **Backend (`helpers.ts`)**:
   - Update `permissions` map with the new roles. Add temporary, marked runtime aliases for legacy roles.
   - Explicitly deny `doctor` and `pharmacist` from accessing any clinical or backend modules.
   - Update `GOOGLE_SELF_SELECT_ROLES` to strictly `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`.

3. **Backend API (`index.ts`)**:
   - Return normalized profile state in `/auth/profile`.
   - Update Admin APIs (`/users`, `/google-role-approvals`). `google_role_approvals` will block NEW approvals for legacy roles via API validation.
   - Add a role resolution endpoint for Admins to resolve `pending_role_review`, ensuring audit logs capture `user_id`, `old_role`, `new_role`, `changed_by`, `changed_at`, `request_id`, and `source="phase2_role_resolution"`.

4. **Database (New Migration)**:
   - Additive update to `google_role_approvals` CHECK constraint to include both legacy and target roles, preserving historical rows.
   - Update `medwell_claim_google_role` to ONLY accept the three target roles (non-admin).
   - Ensure the schema allows storing `pending_role_review` explicitly as a valid string in the `users.roles` array (if a CHECK constraint exists, update it additively).

5. **Tests**:
   - Update E2E and backend tests to assert target roles, `pending_role_review` explicit blocking (API and UI), and ensure legacy aliases still function but are marked temporary.
   - Verify Admin resolution audit trail generation.

## Migration Compatibility Risks
- Modifying the CHECK constraint on `google_role_approvals` must be strictly additive. Old legacy values must remain in the constraint to avoid breaking existing rows. NEW-WRITE restrictions will be enforced in the backend logic, representing temporary compatibility debt.
- The runtime permission aliasing (e.g., `nurse` -> `clinic_assistant`) is TEMPORARY MIGRATION COMPATIBILITY ONLY. It will be removed after a future backfill explicitly updates the database rows.
- Original legacy roles must not be dropped from `users.roles` until the formal backfill. `doctor` and `pharmacist` will act as `pending_role_review` until explicitly resolved or backfilled into the explicit `pending_role_review` state.

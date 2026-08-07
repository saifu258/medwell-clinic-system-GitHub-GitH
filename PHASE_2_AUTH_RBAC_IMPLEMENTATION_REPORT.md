# Phase 2: Authentication & Target RBAC Implementation Report

**Status:** PASS WITH CONDITIONS
(Conditions: Playwright E2E tests are skipped due to local environment missing Python dependency for the webServer).

## 1. Phase 2 Status
Phase 2 Authentication and Target RBAC Implementation has been successfully completed in the local/staging environment.

## 2. Baseline Commit
de973b1

## 3. Exact Files Changed
- `PHASE_2_AUTH_RBAC_IMPLEMENTATION_NOTES.md` (Created baseline notes)
- `supabase/functions/api/helpers.ts`
- `supabase/functions/api/index.ts`
- `supabase/functions/api/helpers_test.ts`
- `public/assets/js/permissions.js`
- `public/assets/js/pages/selectRolePage.js`
- `public/assets/js/pages/usersPage.js`
- `public/assets/js/router.js`
- `public/assets/js/pages/roleReviewPage.js` (NEW)
- `supabase/migrations/20260807063300_phase2_target_rbac_foundation.sql` (NEW)

## 4. Migration Created
- **File:** `supabase/migrations/20260807063300_phase2_target_rbac_foundation.sql`
- **Purpose:**
  - Additive modification to `google_role_approvals` CHECK constraint to include both legacy and target roles.
  - Updates the `medwell_claim_google_role` function to securely enforce that only the 3 new target clinical roles can be claimed by normal Google authentication.

## 5. Actual Database Role Column/Constraint Names Verified
- The `users` table uses the column `users.roles text[]`.
- There is **no native CHECK constraint** on `users.roles` in the initial schema. Therefore, the state `pending_role_review` can be stored directly in `users.roles` without needing a new constraint. The backend API handles the normalization and authorization to ensure it's treated as non-operational.
- The `google_role_approvals` table uses an unnamed CHECK constraint internally named `google_role_approvals_approved_role_check` for validating `approved_role`.

## 6. Target Roles Implemented
- `admin`
- `physiotherapist`
- `thai_traditional_practitioner`
- `clinic_assistant`

## 7. pending_role_review Safe Endpoints
- The `pending_role_review` state explicitly blocks access to `/audit-events` and all other protected clinical/business routes.
- The only safe, minimally required endpoints accessible are:
  - `GET /auth/profile`
  - `GET /me` (Required by the frontend session manager)
  - `POST /auth/google-login-audit`
- It triggers a secure UI route guard rendering the dedicated Thai blocking screen (`บัญชีของคุณต้องได้รับการตรวจสอบบทบาท`), allowing the user only to see their basic profile and logout.

## 8. Temporary Compatibility Aliases Remaining
- **`receptionist` -> `clinic_assistant`**
- **`nurse` -> `clinic_assistant`**
- **`cashier` -> `clinic_assistant`**
- Explicitly marked in `supabase/functions/api/helpers.ts` and `public/assets/js/permissions.js` as **TEMPORARY MIGRATION COMPATIBILITY ONLY**.
- Why they exist: To allow users currently having these roles to continue operating during the migration phase.
- Explicit removal criterion: Once a direct database backfill securely updates the legacy roles to `clinic_assistant` in the `users` table, these aliases will be permanently removed from the source code.
- `doctor` and `pharmacist` receive ZERO operational permissions. They are forced into the blocked `pending_role_review` experience.

## 9. Google Role-Selection Restrictions
- The SQL migration `medwell_claim_google_role` and the API firmly restrict claims to exactly: `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`.
- `admin`, `pending_role_review`, arbitrary roles, and all legacy roles (`receptionist`, `nurse`, `doctor`, `pharmacist`, `cashier`) are firmly rejected.

## 10. Admin Role-Resolution Security
- `POST /users/:uid/resolve-role` logic securely enforces:
  - Caller MUST be Admin.
  - Target account MUST be in `pending_role_review` or hold legacy `doctor`/`pharmacist`.
  - Allowed new roles are strictly `physiotherapist`, `thai_traditional_practitioner`, and `clinic_assistant`.
  - `admin`, `pending_role_review`, and legacy roles are categorically rejected.
  - A secure audit log is written ONLY upon successful resolution (preserving `user_id`, `old_role`, `new_role`, `changed_by`, `changed_at`, `request_id`, and `source = phase2_role_resolution`). Failed resolutions do not write misleading success logs.

## 11. Test Results
- **Node Unit Tests (`npm test`):**
  - Passed: 20
  - Failed: 0
  - Skipped: 0
- **Deno Tests (`npx deno-bin@2.2.7 test` and `check`):**
  - Passed: 9 (Helpers test file completely passed)
  - Failed: 0
  - Skipped: 0
- **Playwright E2E:**
  - Skipped: 1 (Process from `config.webServer` was not able to start. Exit code: 9009. The repository uses `python -m http.server`, but Python is not available in the local environment).

## 12. Security Test Classification
- Automated Passed: Node unit tests (testing backend permissions, input validation, role blocking), Deno unit tests (testing role enforcement).
- Automated Failed: 0.
- Manually Inspected: DB schema alignment, Role Aliasing, Admin `resolve-role` constraints, `pending_role_review` minimum surface block, `medwell_claim_google_role` isolation.

## 13. Secret Scan Result
- Verified via `findstr` that no `service_role`, `private_key`, `secret`, `password`, or unexpected keys were introduced into the repository.

## 14. Duplicate Implementation Plan
- The IDE-generated `implementation_plan.md` artifact stored outside the repository has been disregarded from the Phase 2 changes.

## 15. Confirmation: Migration NOT Applied
- The SQL migration `20260807063300_phase2_target_rbac_foundation.sql` was created but NOT executed against production.

## 16. Confirmation: No Deployment Occurred
- No artifacts, edge functions, or static assets were deployed to production.

## 17. Confirmation: No Production Data Changed
- Production data was entirely untouched.

## 18. Confirmation: No Commit/Push
- No git commits or remote pushes have been executed.

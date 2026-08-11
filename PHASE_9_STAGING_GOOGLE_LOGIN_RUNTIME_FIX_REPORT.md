# Phase 9 — Staging Google Login Runtime Fix Report

## Status

**PASS — READY FOR STAGING REDEPLOY TEST**

The frontend-only fix is implemented and covered by synthetic tests. It has not been deployed. Real Google popup behavior still requires the owner-authorized manual Staging test after redeployment.

## Root Cause

The failure had two cooperating causes:

1. Staging was deployed with a Production-only Firebase Auth `frame-src` CSP. The runtime selected `medwell-clinic-staging`, but Hosting allowed the hidden Firebase Auth iframe only from `medwell-clinic-system.firebaseapp.com`. This can interrupt popup result communication after Google account consent and surface as a popup lifecycle error.
2. The frontend treated `auth/popup-closed-by-user` and `auth/cancelled-popup-request` as final failures even when Firebase had already populated `auth.currentUser`. At the same time, `onAuthStateChanged` and the button handler could both start post-login session processing.

Additional timing issues:

- The first authenticated Edge request did not explicitly force a fresh ID token.
- The popup handler called the login-audit endpoint before `/auth/profile`.
- The popup-blocked branch mixed popup and redirect strategies.
- ACTIVE_USER routing ignored the API-provided `redirectRoute`.
- A stale visible error was not explicitly cleared after recovered authentication.

## Files Changed

- `public/assets/js/googleLoginFlow.js` — new testable single-flight popup controller, recovery rules, messages, and route resolver.
- `public/assets/js/auth.js` — popup-only integration and exported in-progress state.
- `public/assets/js/app.js` — auth-state callback defers while the owned Google flow is in progress.
- `public/assets/js/pages/loginPage.js` — token-ready profile flow, stale-error clearing, API route handling, and corrected error behavior.
- `firebase.staging.json` — Staging-only Hosting/CSP configuration.
- `tests/unit/google-login-flow.test.mjs` — ten focused synthetic tests.
- `tests/e2e/google-login.spec.js` — popup strategy and environment-specific CSP assertions.
- `PHASE_9_STAGING_GOOGLE_LOGIN_RUNTIME_FIX_REPORT.md` — this report.

Pre-existing changes preserved and not authored by this fix:

- `public/assets/js/runtime-config.js` already contains the live Staging runtime identity.
- `PHASE_9_GATE_B_PRE_EXECUTION_REPORT.md` was already untracked.

## Before and After

### Before

- Hosting CSP referenced the Production Firebase Auth domain during a Staging deploy.
- Popup close/cancel errors were always rendered.
- The auth listener and click handler could race into session loading.
- Popup blocked automatically switched to redirect.
- Token refresh before `/auth/profile` was not guaranteed.
- ACTIVE_USER always routed to Dashboard from the click handler.

### After

- Staging deploy uses `firebase.staging.json`, whose CSP permits only the Staging Firebase Auth domain plus Google Accounts.
- Popup close/cancel recovers when `auth.currentUser` exists.
- Popup close/cancel remains a real cancellation when no authenticated user exists.
- One shared promise covers persistence, popup, forced token, profile processing, audit, and route resolution.
- `onAuthStateChanged` does not duplicate processing during that owned flow.
- Popup blocked displays a distinct allow-popups message; no redirect strategy is mixed in.
- The visible error is cleared before login, after user recovery, and before navigation.
- ACTIVE_USER honors `#/dashboard` or `#/role-review`; NEEDS_ROLE_SELECTION opens `#/select-role`.

## Token and API Timing

The successful/recovered sequence is now:

```text
setPersistence(browserLocalPersistence)
→ signInWithPopup
→ resolve credential.user or authenticated auth.currentUser
→ await user.getIdToken(true)
→ GET /auth/profile
→ handle ACTIVE_USER or NEEDS_ROLE_SELECTION
→ POST /auth/google-login-audit
→ navigate once
```

The ID token remains in memory and is supplied through the existing API client. It is not written to localStorage or sessionStorage.

## Popup Error Handling

| Firebase code | No `currentUser` | Authenticated `currentUser` |
| --- | --- | --- |
| `auth/popup-closed-by-user` | Show cancellation message | Continue post-login; no false error |
| `auth/cancelled-popup-request` | Show cancellation message | Continue post-login; no false error |
| `auth/popup-blocked` | Tell user to allow popups | Same distinct error; no redirect fallback |

Other Firebase/application error mappings remain unchanged. ACCOUNT_DISABLED, ACCESS_DENIED, and PROFILE_NOT_FOUND continue through the existing secure logout/error path.

## Single-Flight Behavior

- Repeated calls return the same in-flight Promise.
- Only one popup opens.
- Only one post-login callback runs.
- The UI button remains disabled for the entire operation.
- The guard is reset in `finally` after success or failure.
- The global auth-state callback yields while the owned Google flow is active.

## Automated Tests

`npm test`: PASS — 37/37 total.

- Functions tests: 18/18.
- Existing root tests: 9/9.
- New Google login flow tests: 10/10.

Focused Playwright static checks: PASS — 3/3.

- Production CSP remains Production-only.
- Staging CSP is Staging-only and runtime points to the Staging Firebase/Supabase projects.
- Google auth uses one listener, single-flight popup flow, forced token, cancellation recovery, and no redirect mix.

`npx deno-bin@2.2.7 check supabase/functions/api/index.ts`: PASS.

No real Google credentials are used by automated tests.

## Manual Staging Verification Required

After an owner-authorized Hosting redeploy:

1. Open a new private/incognito browser window.
2. Open `https://medwell-clinic-staging.web.app/#/login`.
3. Open DevTools → Network and enable Preserve log.
4. Do not copy, export, screenshot, or disclose the `Authorization` request header or Firebase token.
5. Click “เข้าสู่ระบบด้วย Google” exactly once.
6. Select the intended Staging Google account and finish Google authentication.
7. Allow the popup to close naturally.
8. Confirm the cancellation message “ปิดหน้าต่าง Google...” is not displayed.
9. In Network, filter for `auth/profile`. Verify one request reaches `https://mrgjpgcppvikyrtaspuf.supabase.co/functions/v1/api/auth/profile` and inspect only URL, method, status, timing, and sanitized response state.
10. Confirm one of the expected outcomes:
    - `ACTIVE_USER` routes to `#/dashboard` or `#/role-review` as returned by the API.
    - `NEEDS_ROLE_SELECTION` routes to `#/select-role`.
    - An intentional application denial shows the application message, not a popup cancellation.
11. Repeat once with popups blocked and confirm the dedicated allow-popups message appears.
12. Rapidly double-click once in a fresh session and confirm only one Google popup opens.

## Proposed Staging Hosting Redeploy

Run only after owner authorization, from the repository root while `public/assets/js/runtime-config.js` is verified as Staging:

```powershell
firebase --config firebase.staging.json --project medwell-clinic-staging deploy --only hosting
```

The explicit config and project prevent use of the Production default target.

## Scope Confirmation

- Database schema/data changes: NONE.
- Migration operations: NONE.
- Supabase secret changes: NONE.
- Edge deployment/invocation: NONE.
- Firebase deployment: NONE.
- Production changes: NONE.
- Git add/commit/push: NONE.

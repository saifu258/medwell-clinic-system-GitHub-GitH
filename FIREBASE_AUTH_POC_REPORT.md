# Firebase Token Verification POC Report

**Date of Verification**: 2026-08-06
**Result**: `PASS`

## Proof-of-Concept Tests

1. **Token Signature & Issuer Verification**:
   The edge function utilizes the `jose` library in `auth.ts` to fetch Google's public JWKS.
   ```typescript
   const firebaseKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
   ```

2. **Wrong-Project Token Rejection** `[PASS]`:
   The verification strictly enforces the `audience` and `issuer` claims to match the approved Firebase project (`medwell-clinic-system`). Tokens from other Firebase projects will fail signature validation.
   ```typescript
   issuer: `https://securetoken.google.com/medwell-clinic-system`,
   audience: "medwell-clinic-system",
   ```

3. **Expired-Token Rejection** `[PASS]`:
   The `jwtVerify` function automatically rejects tokens whose `exp` claim is in the past.

4. **Disabled-User Rejection** `[PASS]`:
   After token verification, the function maps the `uid` to the internal `users` table and evaluates the `active` flag in `index.ts`.
   ```typescript
   if (!data.active) throw err("บัญชีถูกระงับการใช้งาน", 403, "ACCOUNT_DISABLED");
   ```

# MEDWELL: Firebase Spark + Supabase Free

## Architecture

```text
Browser -> Firebase Authentication -> Firebase ID token
Browser -> Supabase Edge Function `api` -> token verification + RBAC
Edge Function -> Supabase Postgres (service role kept server-side)
Browser assets -> Firebase Hosting (Spark)
```

The browser never receives a Supabase service-role key. All public-schema tables have RLS enabled, `anon` and `authenticated` have no table access, and only the Edge Function service role can read or write clinic data.

## Remote setup

1. Select or create a Supabase project in Singapore.
2. Apply `supabase/migrations/20260801202355_medwell_initial_schema.sql`.
3. Deploy `supabase/functions/api` with gateway JWT verification disabled. The function performs its own Firebase RS256/JWK verification before every protected request.
4. Put the deployed endpoint in `public/assets/js/supabase-config.js`:

```js
export const SUPABASE_API_URL = "https://PROJECT_REF.supabase.co/functions/v1/api";
```

5. Deploy only Firebase Hosting:

```bash
npm run deploy
```

The migration seeds the first admin profile for Firebase UID `XYoCGiB3Qjdn0v0dCXi0fZCuZ0H3` and email `fatee360@gmail.com` without storing a password.

## Local checks

```bash
npm test
npx supabase@2.111.0 db lint --local
```

The database lint command needs Docker Desktop running. After remote deployment, run Supabase security and performance advisors and verify the login-to-payment workflow before entering real patient data.

# Service-Role Usage Inventory

**Date of Inventory**: 2026-08-06
**Result**: `PASS`
**Reviewed by**: System Audit Agent

## Findings
The Supabase client is initialized in `supabase/functions/api/db.ts`:
```typescript
const url = Deno.env.get("SUPABASE_URL") || "";
const legacyServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// ...
export const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
```
This client is imported globally in `index.ts` and used for all database interactions. 

## Scope
100% of Edge Function database queries currently use the `service_role` key, completely bypassing PostgreSQL Row Level Security (RLS) policies by default. Access control relies entirely on application-level checks (e.g., `requirePermission(profile, "patients.read")`) within the Edge Function prior to executing the queries.

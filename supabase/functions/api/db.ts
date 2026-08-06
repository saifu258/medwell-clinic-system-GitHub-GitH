import { createClient } from "@supabase/supabase-js";

const url = Deno.env.get("SUPABASE_URL") || "";
const legacyServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const secretKeys = (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); } catch { return {}; } })();
const serviceKey = legacyServiceKey || secretKeys.default || "";
if (!url || !serviceKey) throw new Error("Supabase service credentials are unavailable");

export const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

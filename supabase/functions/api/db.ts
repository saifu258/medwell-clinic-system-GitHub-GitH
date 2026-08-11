import { createClient } from "@supabase/supabase-js";
import { getEdgeConfig } from "./environment.ts";

const { supabaseUrl: url, serviceKey } = getEdgeConfig();

export const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

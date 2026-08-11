import { MEDWELL_RUNTIME_CONFIG } from "./runtime-config.js";

const apiUrl = new URL(MEDWELL_RUNTIME_CONFIG.supabaseApiUrl);
if (MEDWELL_RUNTIME_CONFIG.environment !== "development" && apiUrl.hostname !== `${MEDWELL_RUNTIME_CONFIG.supabaseProjectRef}.supabase.co`) {
  throw new Error("Supabase runtime configuration identity mismatch");
}

export const SUPABASE_API_URL = apiUrl.toString();

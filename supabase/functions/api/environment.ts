export type MedwellEnvironment = "development" | "staging" | "production";

export type EdgeConfig = Readonly<{
  environment: MedwellEnvironment;
  firebaseProjectId: string;
  allowedOrigins: ReadonlySet<string>;
  supabaseUrl: string;
  supabaseProjectRef: string;
  serviceKey: string;
}>;

export const PROTECTED_PRODUCTION_FIREBASE_PROJECT = "medwell-clinic-system";
export const PROTECTED_PRODUCTION_SUPABASE_REF = "rubqdcvwrwatxdrtfxkg";
const PROTECTED_PRODUCTION_ORIGINS = new Set([
  "https://medwell-clinic-system.web.app",
  "https://medwell-clinic-system.firebaseapp.com"
]);

const required = (env: Record<string, string | undefined>, name: string) => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`EDGE_CONFIG_MISSING: ${name}`);
  return value;
};

const parseServiceKey = (env: Record<string, string | undefined>) => {
  const raw = env.SUPABASE_SECRET_KEYS?.trim();
  if (raw) {
    let values: Record<string, unknown>;
    try { values = JSON.parse(raw); } catch { throw new Error("EDGE_CONFIG_INVALID: SUPABASE_SECRET_KEYS"); }
    if (typeof values.default !== "string" || !values.default.trim()) throw new Error("EDGE_CONFIG_INVALID: SUPABASE_SECRET_KEYS.default");
    return values.default.trim();
  }
  const legacy = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (legacy) return legacy;
  throw new Error("EDGE_CONFIG_MISSING: SUPABASE_SECRET_KEYS_OR_SUPABASE_SERVICE_ROLE_KEY");
};

const parseOrigins = (raw: string, environment: MedwellEnvironment) => {
  let values: unknown;
  try { values = JSON.parse(raw); } catch { values = raw.split(",").map((value) => value.trim()).filter(Boolean); }
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string" || !value)) {
    throw new Error("EDGE_CONFIG_INVALID: ALLOWED_ORIGINS");
  }
  const origins = new Set<string>();
  for (const value of values as string[]) {
    if (value === "*") throw new Error("EDGE_CONFIG_INVALID: ALLOWED_ORIGINS_WILDCARD");
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("EDGE_CONFIG_INVALID: ALLOWED_ORIGIN"); }
    if (url.origin !== value || url.username || url.password) throw new Error("EDGE_CONFIG_INVALID: ALLOWED_ORIGIN");
    if (environment !== "development" && url.protocol !== "https:") throw new Error("EDGE_CONFIG_INVALID: ALLOWED_ORIGIN_HTTPS");
    if (environment === "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error("EDGE_CONFIG_INVALID: PRODUCTION_LOCAL_ORIGIN");
    }
    origins.add(value);
  }
  if (origins.size !== values.length) throw new Error("EDGE_CONFIG_INVALID: ALLOWED_ORIGIN_DUPLICATE");
  return origins;
};

export function readEdgeConfig(env: Record<string, string | undefined>): EdgeConfig {
  const environment = required(env, "MEDWELL_ENV") as MedwellEnvironment;
  if (!["development", "staging", "production"].includes(environment)) throw new Error("EDGE_CONFIG_INVALID: MEDWELL_ENV");
  const firebaseProjectId = required(env, "FIREBASE_PROJECT_ID");
  const supabaseUrl = required(env, "SUPABASE_URL");
  const allowedOrigins = parseOrigins(required(env, "ALLOWED_ORIGINS"), environment);
  const serviceKey = parseServiceKey(env);
  let supabase: URL;
  try { supabase = new URL(supabaseUrl); } catch { throw new Error("EDGE_CONFIG_INVALID: SUPABASE_URL"); }
  const hostedMatch = supabase.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  const supabaseProjectRef = hostedMatch?.[1] || "LOCAL_ONLY";

  if (environment === "staging") {
    if (firebaseProjectId === PROTECTED_PRODUCTION_FIREBASE_PROJECT) throw new Error("STAGING_PRODUCTION_IDENTITY_COLLISION: FIREBASE");
    if (supabaseProjectRef === PROTECTED_PRODUCTION_SUPABASE_REF) throw new Error("STAGING_PRODUCTION_IDENTITY_COLLISION: SUPABASE");
    if (!hostedMatch || supabase.protocol !== "https:") throw new Error("EDGE_CONFIG_INVALID: STAGING_SUPABASE_URL");
    const approvedStagingHosts = new Set([`${firebaseProjectId}.web.app`, `${firebaseProjectId}.firebaseapp.com`]);
    if ([...allowedOrigins].some((origin) => !approvedStagingHosts.has(new URL(origin).hostname))) {
      throw new Error("EDGE_CONFIG_INVALID: STAGING_ORIGIN_PROJECT_MISMATCH");
    }
    if ([...allowedOrigins].some((origin) => PROTECTED_PRODUCTION_ORIGINS.has(origin))) {
      throw new Error("STAGING_PRODUCTION_IDENTITY_COLLISION: ORIGIN");
    }
  }
  if (environment === "production") {
    if (firebaseProjectId !== PROTECTED_PRODUCTION_FIREBASE_PROJECT) throw new Error("EDGE_CONFIG_INVALID: PRODUCTION_FIREBASE_PROJECT");
    if (supabaseProjectRef !== PROTECTED_PRODUCTION_SUPABASE_REF) throw new Error("EDGE_CONFIG_INVALID: PRODUCTION_SUPABASE_REF");
  }
  if (environment === "development" && !["localhost", "127.0.0.1"].includes(supabase.hostname)) {
    throw new Error("EDGE_CONFIG_INVALID: DEVELOPMENT_SUPABASE_URL");
  }

  return Object.freeze({ environment, firebaseProjectId, allowedOrigins, supabaseUrl, supabaseProjectRef, serviceKey });
}

let cachedConfig: EdgeConfig | undefined;
export function getEdgeConfig() {
  if (!cachedConfig) cachedConfig = readEdgeConfig(Deno.env.toObject());
  return cachedConfig;
}

export const PROTECTED_PRODUCTION = Object.freeze({
  firebaseProjectId: "medwell-clinic-system",
  supabaseProjectRef: "rubqdcvwrwatxdrtfxkg",
  origins: Object.freeze([
    "https://medwell-clinic-system.web.app",
    "https://medwell-clinic-system.firebaseapp.com"
  ])
});

export const REQUIRED_PUBLIC_FIELDS = Object.freeze([
  "environment",
  "firebaseProjectId",
  "firebaseApiKey",
  "firebaseAuthDomain",
  "firebaseStorageBucket",
  "firebaseMessagingSenderId",
  "firebaseAppId",
  "firebaseHostingProjectId",
  "supabaseProjectRef",
  "supabaseApiUrl"
]);

const unavailable = (value) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return !normalized || normalized === "UNASSIGNED" || normalized === "NOT_VERIFIED" || normalized.startsWith("<PUT_REAL_");
};

const assertProjectDomain = (domain, projectId, field) => {
  const approved = new Set([`${projectId}.firebaseapp.com`, `${projectId}.web.app`]);
  if (!approved.has(domain)) throw new Error(`${field.toUpperCase()}_PROJECT_MISMATCH`);
};

const parseOrigin = (raw, environment) => {
  let url;
  try { url = new URL(raw); } catch { throw new Error("ALLOWED_ORIGIN_INVALID"); }
  if (url.origin !== raw || url.username || url.password) throw new Error("ALLOWED_ORIGIN_INVALID");
  if (environment !== "development" && url.protocol !== "https:") throw new Error("ALLOWED_ORIGIN_HTTPS_REQUIRED");
  if (environment === "development" && url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("DEVELOPMENT_HTTP_ORIGIN_NOT_LOCAL");
  }
  return url;
};

export function validateEnvironmentManifest(input, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("CONFIG_INVALID");
  const config = structuredClone(input);
  if (!["development", "staging", "production"].includes(config.environment)) throw new Error("ENVIRONMENT_INVALID");
  if (options.environment && config.environment !== options.environment) throw new Error("ENVIRONMENT_SELECTION_MISMATCH");

  for (const field of REQUIRED_PUBLIC_FIELDS) {
    if (unavailable(config[field])) throw new Error(`CONFIG_INCOMPLETE: ${field}`);
  }
  if (!Array.isArray(config.allowedOrigins) || config.allowedOrigins.length === 0) throw new Error("CONFIG_INCOMPLETE: allowedOrigins");
  if (!/^[a-z0-9-]{6,30}$/.test(config.firebaseProjectId)) throw new Error("FIREBASE_PROJECT_ID_INVALID");
  if (config.firebaseHostingProjectId !== config.firebaseProjectId) throw new Error("FIREBASE_HOSTING_PROJECT_MISMATCH");
  assertProjectDomain(config.firebaseAuthDomain, config.firebaseProjectId, "firebase_auth_domain");

  let apiUrl;
  try { apiUrl = new URL(config.supabaseApiUrl); } catch { throw new Error("SUPABASE_API_URL_INVALID"); }
  if (config.environment === "development") {
    if (!(["localhost", "127.0.0.1"].includes(apiUrl.hostname) && config.supabaseProjectRef === "LOCAL_ONLY")) {
      throw new Error("DEVELOPMENT_SUPABASE_NOT_LOCAL");
    }
  } else {
    if (!/^[a-z0-9]{20}$/.test(config.supabaseProjectRef)) throw new Error("SUPABASE_PROJECT_REF_INVALID");
    if (apiUrl.protocol !== "https:" || apiUrl.hostname !== `${config.supabaseProjectRef}.supabase.co`) {
      throw new Error("SUPABASE_API_HOST_REF_MISMATCH");
    }
  }
  if (apiUrl.pathname !== "/functions/v1/api") throw new Error("SUPABASE_API_PATH_INVALID");

  const origins = config.allowedOrigins.map((origin) => parseOrigin(origin, config.environment));
  if (new Set(config.allowedOrigins).size !== config.allowedOrigins.length) throw new Error("ALLOWED_ORIGIN_DUPLICATE");
  if (config.allowedOrigins.includes("*")) throw new Error("ALLOWED_ORIGIN_WILDCARD");

  if (config.environment === "staging") {
    if (!options.expectedFirebaseProjectId || !options.expectedSupabaseProjectRef) throw new Error("STAGING_EXPECTED_IDENTITIES_REQUIRED");
    if (config.firebaseProjectId === PROTECTED_PRODUCTION.firebaseProjectId) throw new Error("STAGING_PRODUCTION_FIREBASE_COLLISION");
    if (config.supabaseProjectRef === PROTECTED_PRODUCTION.supabaseProjectRef) throw new Error("STAGING_PRODUCTION_SUPABASE_COLLISION");
    if (config.firebaseProjectId !== options.expectedFirebaseProjectId) throw new Error("STAGING_FIREBASE_EXPECTATION_MISMATCH");
    if (config.supabaseProjectRef !== options.expectedSupabaseProjectRef) throw new Error("STAGING_SUPABASE_EXPECTATION_MISMATCH");
    const approvedHosts = new Set([`${config.firebaseProjectId}.web.app`, `${config.firebaseProjectId}.firebaseapp.com`]);
    if (origins.some((origin) => !approvedHosts.has(origin.hostname))) throw new Error("STAGING_ORIGIN_NOT_APPROVED_PROJECT");
    if (config.allowedOrigins.some((origin) => PROTECTED_PRODUCTION.origins.includes(origin))) throw new Error("STAGING_PRODUCTION_ORIGIN_COLLISION");
  }

  if (config.environment === "production") {
    if (config.firebaseProjectId !== PROTECTED_PRODUCTION.firebaseProjectId) throw new Error("PRODUCTION_FIREBASE_ID_MISMATCH");
    if (config.supabaseProjectRef !== PROTECTED_PRODUCTION.supabaseProjectRef) throw new Error("PRODUCTION_SUPABASE_REF_MISMATCH");
    if (origins.some((origin) => ["localhost", "127.0.0.1"].includes(origin.hostname))) throw new Error("PRODUCTION_LOCAL_ORIGIN_FORBIDDEN");
  }

  return Object.freeze(config);
}

export function renderRuntimeConfig(config) {
  const publicConfig = {
    environment: config.environment,
    firebase: {
      apiKey: config.firebaseApiKey,
      authDomain: config.firebaseAuthDomain,
      projectId: config.firebaseProjectId,
      storageBucket: config.firebaseStorageBucket,
      messagingSenderId: config.firebaseMessagingSenderId,
      appId: config.firebaseAppId,
      ...(config.firebaseMeasurementId ? { measurementId: config.firebaseMeasurementId } : {})
    },
    firebaseHostingProjectId: config.firebaseHostingProjectId,
    supabaseProjectRef: config.supabaseProjectRef,
    supabaseApiUrl: config.supabaseApiUrl,
    allowedOrigins: config.allowedOrigins
  };
  return `// Generated by scripts/build-config.mjs. Do not edit by hand.\nexport const MEDWELL_RUNTIME_CONFIG = Object.freeze(${JSON.stringify(publicConfig, null, 2)});\n`;
}

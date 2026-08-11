import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PROTECTED_PRODUCTION, validateEnvironmentManifest } from "./environment-config.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const requiredArgument = (name) => {
  const value = args.get(name);
  if (!value) throw new Error(`PREFLIGHT_ARGUMENT_REQUIRED: ${name}`);
  return value;
};

const manifestPath = resolve(requiredArgument("--manifest"));
const runtimePath = resolve(requiredArgument("--runtime-config"));
const expectedFirebaseProjectId = requiredArgument("--expected-firebase-project");
const expectedSupabaseProjectRef = requiredArgument("--expected-supabase-ref");
const firebaseTarget = requiredArgument("--firebase-target");
const manifest = validateEnvironmentManifest(JSON.parse(await readFile(manifestPath, "utf8")), {
  environment: "staging",
  expectedFirebaseProjectId,
  expectedSupabaseProjectRef
});

if (firebaseTarget !== expectedFirebaseProjectId) throw new Error("PREFLIGHT_FIREBASE_TARGET_MISMATCH");
if (expectedFirebaseProjectId === PROTECTED_PRODUCTION.firebaseProjectId) throw new Error("PREFLIGHT_PRODUCTION_FIREBASE_COLLISION");
if (expectedSupabaseProjectRef === PROTECTED_PRODUCTION.supabaseProjectRef) throw new Error("PREFLIGHT_PRODUCTION_SUPABASE_COLLISION");

const runtimeUrl = `${pathToFileURL(runtimePath).href}?preflight=${Date.now()}`;
const { MEDWELL_RUNTIME_CONFIG: runtime } = await import(runtimeUrl);
if (runtime.environment !== "staging") throw new Error("PREFLIGHT_RUNTIME_ENVIRONMENT_MISMATCH");
if (runtime.firebase?.projectId !== expectedFirebaseProjectId) throw new Error("PREFLIGHT_RUNTIME_FIREBASE_MISMATCH");
if (runtime.supabaseProjectRef !== expectedSupabaseProjectRef) throw new Error("PREFLIGHT_RUNTIME_SUPABASE_MISMATCH");
if (runtime.supabaseApiUrl !== manifest.supabaseApiUrl) throw new Error("PREFLIGHT_RUNTIME_API_MISMATCH");
if (JSON.stringify(runtime.allowedOrigins) !== JSON.stringify(manifest.allowedOrigins)) throw new Error("PREFLIGHT_RUNTIME_ORIGINS_MISMATCH");

const edgeEnvironment = process.env.MEDWELL_ENV;
const edgeFirebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const edgeSupabaseUrl = process.env.SUPABASE_URL;
const edgeAllowedOrigins = process.env.ALLOWED_ORIGINS;
if (edgeEnvironment !== "staging") throw new Error("PREFLIGHT_EDGE_ENVIRONMENT_MISMATCH");
if (edgeFirebaseProjectId !== expectedFirebaseProjectId) throw new Error("PREFLIGHT_EDGE_FIREBASE_MISMATCH");
const edgeSupabaseHost = new URL(edgeSupabaseUrl || "invalid://missing").hostname;
if (edgeSupabaseHost !== `${expectedSupabaseProjectRef}.supabase.co`) throw new Error("PREFLIGHT_EDGE_SUPABASE_MISMATCH");
const parsedOrigins = JSON.parse(edgeAllowedOrigins || "null");
if (JSON.stringify(parsedOrigins) !== JSON.stringify(manifest.allowedOrigins)) throw new Error("PREFLIGHT_EDGE_ORIGINS_MISMATCH");

console.log("STAGING_PREFLIGHT: PASS");
console.log("IDENTITY_OUTPUT: REDACTED_BY_DESIGN");

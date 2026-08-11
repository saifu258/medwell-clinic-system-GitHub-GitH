import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderRuntimeConfig, validateEnvironmentManifest } from "./environment-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const environment = args.get("--environment");
if (!environment) throw new Error("Usage: npm run build:config -- --environment <development|staging|production>");

const manifestPath = resolve(root, "config", "environments", `${environment}.json`);
const outputPath = resolve(root, "public", "assets", "js", "runtime-config.js");
const temporaryPath = `${outputPath}.tmp`;
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const config = validateEnvironmentManifest(manifest, {
  environment,
  expectedFirebaseProjectId: process.env.STAGING_FIREBASE_PROJECT_ID,
  expectedSupabaseProjectRef: process.env.STAGING_SUPABASE_PROJECT_REF
});

try {
  await writeFile(temporaryPath, renderRuntimeConfig(config), { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, outputPath);
} finally {
  await rm(temporaryPath, { force: true });
}
console.log(`RUNTIME_CONFIG_GENERATED: ${config.environment}`);

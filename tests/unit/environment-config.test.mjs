import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderRuntimeConfig, validateEnvironmentManifest } from "../../scripts/environment-config.mjs";

const production = JSON.parse(await readFile(new URL("../../config/environments/production.json", import.meta.url), "utf8"));
const isolatedStaging = {
  ...production,
  environment: "staging",
  firebaseProjectId: "medwell-clinic-staging-test",
  firebaseApiKey: "synthetic-public-web-key",
  firebaseAuthDomain: "medwell-clinic-staging-test.firebaseapp.com",
  firebaseStorageBucket: "medwell-clinic-staging-test.firebasestorage.app",
  firebaseMessagingSenderId: "123456789012",
  firebaseAppId: "1:123456789012:web:synthetic",
  firebaseMeasurementId: "",
  firebaseHostingProjectId: "medwell-clinic-staging-test",
  supabaseProjectRef: "abcdefghijklmnopqrst",
  supabaseApiUrl: "https://abcdefghijklmnopqrst.supabase.co/functions/v1/api",
  allowedOrigins: ["https://medwell-clinic-staging-test.web.app"]
};

const stagingOptions = {
  environment: "staging",
  expectedFirebaseProjectId: "medwell-clinic-staging-test",
  expectedSupabaseProjectRef: "abcdefghijklmnopqrst"
};

test("production manifest preserves protected production identity", () => {
  assert.equal(validateEnvironmentManifest(production, { environment: "production" }).environment, "production");
});

test("isolated staging manifest validates and renders one immutable runtime config", () => {
  const config = validateEnvironmentManifest(isolatedStaging, stagingOptions);
  const output = renderRuntimeConfig(config);
  assert.match(output, /MEDWELL_RUNTIME_CONFIG/);
  assert.match(output, /medwell-clinic-staging-test/);
  assert.doesNotMatch(output, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("staging rejects protected production Firebase identity", () => {
  assert.throws(() => validateEnvironmentManifest({ ...isolatedStaging, firebaseProjectId: "medwell-clinic-system", firebaseAuthDomain: "medwell-clinic-system.firebaseapp.com", firebaseHostingProjectId: "medwell-clinic-system" }, { ...stagingOptions, expectedFirebaseProjectId: "medwell-clinic-system" }), /STAGING_PRODUCTION_FIREBASE_COLLISION/);
});

test("staging rejects protected production Supabase identity", () => {
  assert.throws(() => validateEnvironmentManifest({ ...isolatedStaging, supabaseProjectRef: "rubqdcvwrwatxdrtfxkg", supabaseApiUrl: "https://rubqdcvwrwatxdrtfxkg.supabase.co/functions/v1/api" }, { ...stagingOptions, expectedSupabaseProjectRef: "rubqdcvwrwatxdrtfxkg" }), /STAGING_PRODUCTION_SUPABASE_COLLISION/);
});

test("staging rejects protected production origin", () => {
  assert.throws(() => validateEnvironmentManifest({ ...isolatedStaging, allowedOrigins: ["https://medwell-clinic-system.web.app"] }, stagingOptions), /STAGING_ORIGIN_NOT_APPROVED_PROJECT|STAGING_PRODUCTION_ORIGIN_COLLISION/);
});

test("staging rejects an API host that does not match its project ref", () => {
  assert.throws(() => validateEnvironmentManifest({ ...isolatedStaging, supabaseApiUrl: "https://zyxwvutsrqponmlkjihg.supabase.co/functions/v1/api" }, stagingOptions), /SUPABASE_API_HOST_REF_MISMATCH/);
});

test("owner staging manifest validates against the approved identities", async () => {
  const staging = JSON.parse(await readFile(new URL("../../config/environments/staging.json", import.meta.url), "utf8"));
  const validated = validateEnvironmentManifest(staging, {
    environment: "staging",
    expectedFirebaseProjectId: "medwell-clinic-staging",
    expectedSupabaseProjectRef: "mrgjpgcppvikyrtaspuf"
  });
  assert.equal(validated.firebaseProjectId, "medwell-clinic-staging");
  assert.equal(validated.supabaseProjectRef, "mrgjpgcppvikyrtaspuf");
});

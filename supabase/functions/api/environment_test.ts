import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { readEdgeConfig } from "./environment.ts";

const staging = {
  MEDWELL_ENV: "staging",
  FIREBASE_PROJECT_ID: "medwell-clinic-staging-test",
  SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  ALLOWED_ORIGINS: JSON.stringify(["https://medwell-clinic-staging-test.web.app"]),
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: "synthetic-secret" })
};

Deno.test("uses SUPABASE_SECRET_KEYS.default for the admin client", () => {
  const config = readEdgeConfig({ ...staging, SUPABASE_SERVICE_ROLE_KEY: "synthetic-legacy" });
  assertEquals(config.environment, "staging");
  assertEquals(config.supabaseProjectRef, "abcdefghijklmnopqrst");
  assertEquals(config.serviceKey, "synthetic-secret");
});

Deno.test("uses the legacy service-role key only when the new key map is absent", () => {
  const { SUPABASE_SECRET_KEYS: _newKeys, ...withoutNewKeys } = staging;
  const config = readEdgeConfig({ ...withoutNewKeys, SUPABASE_SERVICE_ROLE_KEY: "synthetic-legacy" });
  assertEquals(config.serviceKey, "synthetic-legacy");
});

Deno.test("fails closed when both admin key sources are missing", () => {
  const { SUPABASE_SECRET_KEYS: _newKeys, ...withoutAdminKeys } = staging;
  assertThrows(
    () => readEdgeConfig(withoutAdminKeys),
    Error,
    "EDGE_CONFIG_MISSING: SUPABASE_SECRET_KEYS_OR_SUPABASE_SERVICE_ROLE_KEY"
  );
});

Deno.test("fails closed on malformed SUPABASE_SECRET_KEYS without legacy downgrade", () => {
  assertThrows(
    () => readEdgeConfig({ ...staging, SUPABASE_SECRET_KEYS: "{malformed", SUPABASE_SERVICE_ROLE_KEY: "synthetic-legacy" }),
    Error,
    "EDGE_CONFIG_INVALID: SUPABASE_SECRET_KEYS"
  );
});

Deno.test("does not use publishable or anon keys for the admin client", () => {
  const { SUPABASE_SECRET_KEYS: _newKeys, ...withoutAdminKeys } = staging;
  assertThrows(
    () => readEdgeConfig({
      ...withoutAdminKeys,
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "synthetic-publishable" }),
      SUPABASE_ANON_KEY: "synthetic-anon"
    }),
    Error,
    "EDGE_CONFIG_MISSING: SUPABASE_SECRET_KEYS_OR_SUPABASE_SERVICE_ROLE_KEY"
  );
});

Deno.test("fails closed when SUPABASE_URL is missing", () => {
  const { SUPABASE_URL: _url, ...withoutUrl } = staging;
  assertThrows(() => readEdgeConfig(withoutUrl), Error, "EDGE_CONFIG_MISSING: SUPABASE_URL");
});

Deno.test("rejects protected production Firebase identity in staging", () => {
  assertThrows(() => readEdgeConfig({ ...staging, FIREBASE_PROJECT_ID: "medwell-clinic-system" }), Error, "STAGING_PRODUCTION_IDENTITY_COLLISION: FIREBASE");
});

Deno.test("rejects protected production Supabase identity in staging", () => {
  assertThrows(() => readEdgeConfig({ ...staging, SUPABASE_URL: "https://rubqdcvwrwatxdrtfxkg.supabase.co" }), Error, "STAGING_PRODUCTION_IDENTITY_COLLISION: SUPABASE");
});

Deno.test("rejects wildcard origins", () => {
  assertThrows(() => readEdgeConfig({ ...staging, ALLOWED_ORIGINS: JSON.stringify(["*"]) }), Error, "ALLOWED_ORIGINS_WILDCARD");
});

Deno.test("rejects a staging origin from a different Firebase project", () => {
  assertThrows(() => readEdgeConfig({ ...staging, ALLOWED_ORIGINS: JSON.stringify(["https://unapproved-staging.web.app"]) }), Error, "STAGING_ORIGIN_PROJECT_MISMATCH");
});

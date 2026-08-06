import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("backend ตรวจ provider และกำหนด role ใน transaction เท่านั้น", async () => {
  const api = fs.readFileSync("supabase/functions/api/index.ts", "utf8");
  const migration = fs.readFileSync("supabase/migrations/20260802041155_google_role_approvals.sql", "utf8");
  expect(api).toContain('identity.provider !== "google.com"');
  expect(api).toContain('db.rpc("medwell_claim_google_role"');
  expect(migration).toContain("for update");
  expect(migration).toContain("ROLE_APPROVAL_DENIED");
});

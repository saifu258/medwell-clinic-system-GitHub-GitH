import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("self-selection allowlist ไม่มีบทบาทสิทธิ์สูง", async () => {
  const helpers = fs.readFileSync("supabase/functions/api/helpers.ts", "utf8");
  const match = helpers.match(/GOOGLE_SELF_SELECT_ROLES = \[([^\]]+)\]/);
  expect(match).not.toBeNull();
  expect(match[1]).toBe('"receptionist", "nurse", "doctor", "pharmacist", "cashier"');
});

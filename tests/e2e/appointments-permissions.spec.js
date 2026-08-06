import { test, expect } from "@playwright/test";
import { apiFetchFromPage, loginAs } from "./helpers.js";

for (const [role, expected] of [["admin", 400], ["receptionist", 400], ["nurse", 403], ["doctor", 403], ["pharmacist", 403], ["cashier", 403]]) {
  test(`${role} appointment-create permission ถูกบังคับที่ backend`, async ({ page }) => {
    await loginAs(page, role);
    const result = await apiFetchFromPage(page, "/appointments", { method: "POST", idempotencyKey: `qa-permission-${crypto.randomUUID()}`, body: {} });
    expect(result.status).toBe(expected);
    expect(result.body.success).toBe(false);
  });
}

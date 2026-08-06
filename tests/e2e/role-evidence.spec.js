import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers.js";

for (const role of ["admin", "receptionist", "nurse", "doctor", "pharmacist", "cashier"]) {
  test(`capture ${role} dashboard evidence`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await loginAs(page, role);
    await expect(page.locator(".main-shell")).toBeVisible();
    await expect(page.locator(".skeleton")).toHaveCount(0);
    await page.screenshot({ path: `docs/evidence/role-${role}-dashboard.png`, fullPage: true });
  });
}

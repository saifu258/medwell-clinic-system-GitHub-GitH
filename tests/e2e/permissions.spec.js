import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers.js";

for (const [role, forbidden] of [["receptionist", "settings"], ["nurse", "appointments"], ["doctor", "billing"], ["pharmacist", "users"], ["cashier", "queue"]]) {
  test(`${role} ถูกปฏิเสธ route ${forbidden}`, async ({ page }) => {
    await loginAs(page, role); await page.goto(`/#/${forbidden}`);
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.getByRole("heading", { name: "ภาพรวมคลินิก" })).toBeVisible();
  });
}

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers.js";

test("ผู้ใช้เดิมคง session และไม่ถูกส่งไปเลือกบทบาท", async ({ page }) => {
  await loginAs(page, "admin");
  await page.reload();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page).not.toHaveURL(/select-role/);
});

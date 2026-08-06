import { test, expect } from "@playwright/test";
import { captureConsoleErrors, expectNav, expectRoute, loginAs } from "./helpers.js";

test("Admin เข้าถึงเมนูผู้ดูแลและไม่มี console error", async ({ page }) => {
  const errors = captureConsoleErrors(page); await loginAs(page, "admin");
  await expectNav(page, ["patients", "appointments", "queue", "screening", "doctor", "pharmacy", "inventory", "billing", "reports", "users", "settings", "audit-logs"]);
  await expectRoute(page, "users", "ผู้ใช้งาน");
  await expectRoute(page, "settings", "ตั้งค่าคลินิก");
  await expectRoute(page, "audit-logs", "Audit Log");
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

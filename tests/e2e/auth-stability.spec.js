import { test, expect } from "@playwright/test";
import { captureConsoleErrors, loginAs } from "./helpers.js";

test("refresh และ Back/Forward ไม่ทำให้ auth หรือ router วนซ้ำ", async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await loginAs(page, "admin");
  await page.goto("/#/appointments");
  await expect(page.getByRole("heading", { name: "นัดหมาย", exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/#\/appointments$/);
  await expect(page.getByRole("heading", { name: "นัดหมาย", exact: true })).toBeVisible();
  await page.goto("/#/dashboard");
  await page.goBack();
  await expect(page).toHaveURL(/#\/appointments$/);
  expect(errors).toEqual([]);
});

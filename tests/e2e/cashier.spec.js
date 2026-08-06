import { test, expect } from "@playwright/test";
import { captureConsoleErrors, expectNav, expectRoute, loginAs } from "./helpers.js";

test("Cashier ใช้งานผู้ป่วยและการเงิน", async ({ page }) => {
  const errors = captureConsoleErrors(page); await loginAs(page, "cashier");
  await expectNav(page, ["patients", "billing"], ["appointments", "queue", "screening", "doctor", "pharmacy", "inventory", "settings"]);
  await expectRoute(page, "billing", "การเงินและชำระเงิน");
  expect(errors).toEqual([]);
});

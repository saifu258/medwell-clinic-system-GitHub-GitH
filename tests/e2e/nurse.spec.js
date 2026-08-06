import { test, expect } from "@playwright/test";
import { captureConsoleErrors, expectNav, expectRoute, loginAs } from "./helpers.js";

test("Nurse อ่านผู้ป่วย/คิวและบันทึกคัดกรอง", async ({ page }) => {
  const errors = captureConsoleErrors(page); await loginAs(page, "nurse");
  await expectNav(page, ["patients", "queue", "screening"], ["appointments", "doctor", "pharmacy", "billing", "settings"]);
  await expectRoute(page, "queue", "คิววันนี้");
  await expect(page.locator("[data-call],[data-next]")).toHaveCount(0);
  await expectRoute(page, "screening", "คัดกรองและสัญญาณชีพ");
  expect(errors).toEqual([]);
});

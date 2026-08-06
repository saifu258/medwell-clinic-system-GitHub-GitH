import { test, expect } from "@playwright/test";
import { captureConsoleErrors, expectNav, expectRoute, loginAs } from "./helpers.js";

test("Doctor ใช้งานห้องตรวจและใบสั่งยา", async ({ page }) => {
  const errors = captureConsoleErrors(page); await loginAs(page, "doctor");
  await expectNav(page, ["patients", "queue", "doctor", "prescriptions", "medicines"], ["appointments", "pharmacy", "inventory", "billing", "settings"]);
  await expectRoute(page, "doctor", "พื้นที่ทำงานแพทย์");
  await expectRoute(page, "prescriptions", "ใบสั่งยา");
  expect(errors).toEqual([]);
});

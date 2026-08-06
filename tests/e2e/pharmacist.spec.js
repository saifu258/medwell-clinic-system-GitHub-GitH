import { test, expect } from "@playwright/test";
import { captureConsoleErrors, expectNav, expectRoute, loginAs } from "./helpers.js";

test("Pharmacist ใช้งานจ่ายยาและคลังยา", async ({ page }) => {
  const errors = captureConsoleErrors(page); await loginAs(page, "pharmacist");
  await expectNav(page, ["patients", "pharmacy", "medicines", "inventory"], ["appointments", "queue", "doctor", "billing", "settings"]);
  await expectRoute(page, "pharmacy", "จ่ายยา");
  await expectRoute(page, "inventory", "คลังยาและเวชภัณฑ์");
  expect(errors).toEqual([]);
});

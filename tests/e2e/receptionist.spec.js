import { test, expect } from "@playwright/test";
import { captureConsoleErrors, expectNav, expectRoute, loginAs } from "./helpers.js";

test("Receptionist ใช้งานผู้ป่วย นัดหมาย และคิว", async ({ page }) => {
  const errors = captureConsoleErrors(page); await loginAs(page, "receptionist");
  await expectNav(page, ["patients", "appointments", "queue"], ["screening", "doctor", "pharmacy", "billing", "settings"]);
  await expectRoute(page, "patients", "ทะเบียนผู้ป่วย");
  await expectRoute(page, "appointments", "นัดหมาย");
  await expectRoute(page, "queue", "คิววันนี้");
  expect(errors).toEqual([]);
});

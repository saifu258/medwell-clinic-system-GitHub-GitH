import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers.js";

test("critical clinic routes โหลดต่อเนื่องโดยไม่เกิด uncaught error", async ({ page }) => {
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await loginAs(page, "admin");
  for (const [route, heading] of [["patients", "ทะเบียนผู้ป่วย"], ["appointments", "นัดหมาย"], ["queue", "คิววันนี้"], ["screening", "คัดกรองและสัญญาณชีพ"], ["doctor", "พื้นที่ทำงานแพทย์"], ["prescriptions", "ใบสั่งยา"], ["pharmacy", "จ่ายยา"], ["inventory", "คลังยาและเวชภัณฑ์"], ["billing", "การเงินและชำระเงิน"], ["reports", "รายงานและสถิติ"]]) {
    await page.goto(`/#/${route}`); await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

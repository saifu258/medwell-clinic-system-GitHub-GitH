import { test, expect } from "@playwright/test";
import { captureConsoleErrors, loginAs } from "./helpers.js";

test("หน้าตารางนัดหมายโหลดได้สำเร็จและไม่มี ReferenceError หรือ can is not defined", async ({ page }) => {
  const errors = captureConsoleErrors(page);

  await loginAs(page, "receptionist");

  await page.goto("/#/appointments");
  await expect(page).toHaveURL(/#\/appointments$/);

  // ตรวจสอบว่า Heading แสดงขึ้นมาปกติ
  await expect(page.getByRole("heading", { name: "นัดหมาย", exact: true }).first()).toBeVisible();

  // ตรวจสอบว่าไม่มีกล่องแจ้งเตือน Error 'can is not defined' หรือ 'ไม่สามารถโหลดข้อมูลได้'
  await expect(page.locator("text=can is not defined")).toHaveCount(0);
  await expect(page.locator("text=ไม่สามารถโหลดข้อมูลได้")).toHaveCount(0);

  // ตรวจสอบว่าไม่มี ReferenceError สะสมใน Console Log
  const referenceErrors = errors.filter((e) => e.includes("ReferenceError") || e.includes("can is not defined"));
  expect(referenceErrors).toEqual([]);
});

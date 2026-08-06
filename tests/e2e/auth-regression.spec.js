import { test, expect } from "@playwright/test";

test("route ที่ต้องยืนยันตัวตนกลับ Login โดยไม่ reload วน", async ({ page }) => {
  let documents = 0;
  page.on("request", (request) => { if (request.resourceType() === "document") documents += 1; });
  await page.goto("/#/patients");
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google" })).toBeVisible();
  expect(documents).toBe(1);
});

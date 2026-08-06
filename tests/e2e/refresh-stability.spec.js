import { test, expect } from "@playwright/test";
import { captureConsoleErrors, loginAs } from "./helpers.js";

test("Queue polling ไม่เขียนทับ route และ refresh คง session", async ({ page }) => {
  const errors = captureConsoleErrors(page); let documents = 0;
  page.on("request", (request) => { if (request.resourceType() === "document") documents += 1; });
  await loginAs(page, "admin");
  const documentsAfterLogin = documents;
  await page.goto("/#/queue"); await expect(page.getByRole("heading", { name: "คิววันนี้", exact: true }).first()).toBeVisible();
  await page.goto("/#/settings"); await expect(page.getByRole("heading", { name: "ตั้งค่าคลินิก" })).toBeVisible();
  await page.waitForTimeout(21_000);
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole("heading", { name: "ตั้งค่าคลินิก" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "คิววันนี้", exact: true })).toHaveCount(0);
  expect(documents).toBe(documentsAfterLogin);
  await page.reload();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole("heading", { name: "ตั้งค่าคลินิก" })).toBeVisible();
  expect(errors).toEqual([]);
});

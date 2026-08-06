import { expect, test } from "@playwright/test";
import { captureConsoleErrors, loginAs } from "./helpers.js";

test("Receptionist creates and reloads a patient with nullable optional fields", async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const marker = `QA-CRUD-${Date.now()}`;
  let createRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/patients$/.test(new URL(request.url()).pathname)) createRequests += 1;
  });

  await loginAs(page, "receptionist");
  await page.goto("/#/patients/new");
  await page.locator('[name="firstName"]').fill(marker);
  await page.locator('[name="lastName"]').fill("PATIENT");
  await page.locator('[name="phone"]').fill("0890000000");

  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && /\/api\/patients$/.test(new URL(response.url()).pathname));
  await page.locator('#patient-form button[type="submit"]').dblclick();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  expect(createRequests).toBe(1);
  await expect(page).toHaveURL(/#\/patients\/[0-9a-f-]+$/i);
  await expect(page.getByText(`${marker} PATIENT`, { exact: false })).toBeVisible();

  await page.goto("/#/patients");
  await expect(page.getByRole("heading", { name: "ทะเบียนผู้ป่วย" })).toBeVisible();
  await page.locator("#patient-search").fill(marker);
  await expect(page.getByText(marker, { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("หน้า Login แสดง Google Sign-In และยังคงฟอร์มเดิม", async ({ page }) => {
  await page.goto("/#/login");
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google" })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test("Firebase production config ตรงกับโปรเจกต์และ CSP อนุญาต auth iframe แบบจำกัด origin", async () => {
  const configSource = fs.readFileSync("public/assets/js/runtime-config.js", "utf8");
  const hosting = JSON.parse(fs.readFileSync("firebase.json", "utf8"));
  const csp = hosting.hosting.headers[0].headers.find((header) => header.key === "Content-Security-Policy").value;
  expect(configSource).toContain('"projectId": "medwell-clinic-system"');
  expect(configSource).toContain('"authDomain": "medwell-clinic-system.firebaseapp.com"');
  expect(configSource).toContain('"messagingSenderId": "569102271370"');
  expect(configSource).toContain('"appId": "1:569102271370:web:ee49211a341fca17c93e73"');
  expect(csp).toContain("frame-src 'self' https://medwell-clinic-system.firebaseapp.com https://accounts.google.com");
  expect(csp).toContain("script-src 'self' https://www.gstatic.com https://apis.google.com");
  expect(csp).not.toContain("frame-src *");
});

test("Google popup เป็นวิธีหลักและ redirect ทำงานเฉพาะ popup-blocked", async () => {
  const authSource = fs.readFileSync("public/assets/js/auth.js", "utf8");
  expect((authSource.match(/getRedirectResult\(auth\)/g) || []).length).toBe(1);
  expect(authSource.indexOf("signInWithPopup(auth, googleProvider)")).toBeLessThan(authSource.indexOf('error.code === "auth/popup-blocked"'));
  expect(authSource).toContain("signInWithRedirect(auth, googleProvider)");
  expect((authSource.match(/onAuthStateChanged\(auth/g) || []).length).toBe(1);
});

test("หน้า Google Login บนมือถือไม่มี horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/login");
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("หน้า Login แสดง Google Sign-In และยังคงฟอร์มเดิม", async ({ page }) => {
  await page.goto("/#/login");
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google" })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test("Firebase production config ตรงกับโปรเจกต์และ CSP อนุญาต auth iframe แบบจำกัด origin", async () => {
  const productionManifest = JSON.parse(fs.readFileSync("config/environments/production.json", "utf8"));
  const hosting = JSON.parse(fs.readFileSync("firebase.json", "utf8"));
  const csp = hosting.hosting.headers[0].headers.find((header) => header.key === "Content-Security-Policy").value;
  expect(productionManifest.firebaseProjectId).toBe("medwell-clinic-system");
  expect(productionManifest.firebaseAuthDomain).toBe("medwell-clinic-system.firebaseapp.com");
  expect(productionManifest.firebaseMessagingSenderId).toBe("569102271370");
  expect(productionManifest.firebaseAppId).toBe("1:569102271370:web:ee49211a341fca17c93e73");
  expect(csp).toContain("frame-src 'self' https://medwell-clinic-system.firebaseapp.com https://accounts.google.com");
  expect(csp).toContain("script-src 'self' https://www.gstatic.com https://apis.google.com");
  expect(csp).not.toContain("frame-src *");
});

test("Firebase staging config อนุญาตเฉพาะ Staging auth iframe และ runtime Staging", async () => {
  const configSource = fs.readFileSync("public/assets/js/runtime-config.js", "utf8");
  const hosting = JSON.parse(fs.readFileSync("firebase.staging.json", "utf8"));
  const csp = hosting.hosting.headers[0].headers.find((header) => header.key === "Content-Security-Policy").value;
  expect(configSource).toContain('"projectId": "medwell-clinic-staging"');
  expect(configSource).toContain('"supabaseProjectRef": "mrgjpgcppvikyrtaspuf"');
  expect(csp).toContain("frame-src 'self' https://medwell-clinic-staging.firebaseapp.com https://accounts.google.com");
  expect(csp).not.toContain("medwell-clinic-system.firebaseapp.com");
  expect(csp).not.toContain("frame-src *");
});

test("Google popup ใช้ single-flight และไม่ผสม redirect strategy", async () => {
  const authSource = fs.readFileSync("public/assets/js/auth.js", "utf8");
  const flowSource = fs.readFileSync("public/assets/js/googleLoginFlow.js", "utf8");
  const appSource = fs.readFileSync("public/assets/js/app.js", "utf8");
  expect(authSource).toContain("createGoogleLoginFlow");
  expect(authSource).not.toContain("signInWithRedirect");
  expect(authSource).not.toContain("getRedirectResult");
  expect((authSource.match(/onAuthStateChanged\(auth/g) || []).length).toBe(1);
  expect(flowSource).toContain("if (inFlight) return inFlight");
  expect(flowSource).toContain("await user.getIdToken(true)");
  expect(flowSource).toContain("RECOVERABLE_POPUP_CODES.has(error?.code) && auth.currentUser");
  expect(appSource).toContain("if (isGoogleLoginInProgress()) return");
});

test("หน้า Google Login บนมือถือไม่มี horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/login");
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

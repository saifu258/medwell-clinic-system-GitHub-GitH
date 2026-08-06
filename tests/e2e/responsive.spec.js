import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers.js";

for (const viewport of [{ name: "desktop-1920", width: 1920, height: 1080 }, { name: "laptop-1366", width: 1366, height: 768 }, { name: "tablet-768", width: 768, height: 1024 }, { name: "mobile-390", width: 390, height: 844 }]) {
  test(`responsive ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginAs(page, "admin");
    await expect(page.locator(".main-shell")).toBeVisible();
    await expect(page.locator(".skeleton")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `docs/evidence/responsive-${viewport.name}.png`, fullPage: true });
  });
}

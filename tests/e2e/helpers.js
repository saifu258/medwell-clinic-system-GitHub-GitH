import { expect, test } from "@playwright/test";

export function roleCredentials(role) {
  const prefix = `MEDWELL_QA_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  test.skip(!email || !password, `ตั้งค่า ${prefix}_EMAIL และ ${prefix}_PASSWORD ก่อนรัน`);
  return { email, password };
}

export async function loginAs(page, role) {
  const credentials = roleCredentials(role);
  await page.goto("/#/login");
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "ภาพรวมคลินิก" })).toBeVisible();
}

export function captureConsoleErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function expectNav(page, visible, hidden = []) {
  for (const path of visible) await expect(page.locator(`.sidebar [data-nav="${path}"]`)).toBeVisible();
  for (const path of hidden) await expect(page.locator(`.sidebar [data-nav="${path}"]`)).toHaveCount(0);
}

export async function expectRoute(page, path, heading) {
  await page.goto(`/#/${path}`);
  await expect(page).toHaveURL(new RegExp(`#/${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
}

export async function apiFetchFromPage(page, path, { method = "GET", body, idempotencyKey } = {}) {
  return page.evaluate(async ({ path, method, body, idempotencyKey }) => {
    const [{ auth }, { SUPABASE_API_URL }] = await Promise.all([
      import("/assets/js/auth.js"),
      import("/assets/js/supabase-config.js")
    ]);
    const token = await auth.currentUser.getIdToken(true);
    const response = await fetch(`${SUPABASE_API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json(), requestId: response.headers.get("x-request-id") };
  }, { path, method, body, idempotencyKey });
}

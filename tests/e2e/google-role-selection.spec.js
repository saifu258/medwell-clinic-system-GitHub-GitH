import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("หน้าเลือกบทบาทส่งเฉพาะ role ที่เลือกและป้องกันการกดซ้ำ", async () => {
  const source = fs.readFileSync("public/assets/js/pages/selectRolePage.js", "utf8");
  expect(source).toContain('apiPost("/auth/select-role", { role: selected.id }, { freshToken: true, idempotent: true })');
  expect(source).toContain("submissionInFlight");
  expect(source).toContain("freshToken: true");
  expect(source).toContain("ตรวจสอบการอนุมัติอีกครั้ง");
  expect(source).toContain("finally");
});

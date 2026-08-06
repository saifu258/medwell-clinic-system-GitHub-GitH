import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("หน้า first-login นิยาม role card เท่ากับห้าบทบาทที่อนุญาต", async () => {
  const source = fs.readFileSync("public/assets/js/pages/selectRolePage.js", "utf8");
  const ids = [...source.matchAll(/\{ id: "([a-z_]+)"/g)].map((match) => match[1]);
  expect(ids).toEqual(["receptionist", "nurse", "doctor", "pharmacist", "cashier"]);
});

import { test, expect } from "@playwright/test";
import { apiFetchFromPage, loginAs } from "./helpers.js";

test("Idempotency Key เดิมสร้าง appointment และ audit เพียงครั้งเดียว", async ({ page }) => {
  await loginAs(page, "admin");
  const patientId = process.env.MEDWELL_QA_PATIENT_ID;
  test.skip(!patientId, "ตั้งค่า MEDWELL_QA_PATIENT_ID ก่อนรัน");
  const key = `qa-idempotency-${crypto.randomUUID()}`;
  const input = { patientId, appointmentDate: "2026-12-30", startTime: "20:00", endTime: "20:30", doctorUid: null, appointmentType: "general", reason: "QA IDEMPOTENCY" };
  const first = await apiFetchFromPage(page, "/appointments", { method: "POST", idempotencyKey: key, body: input });
  const second = await apiFetchFromPage(page, "/appointments", { method: "POST", idempotencyKey: key, body: input });
  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  expect(second.body.data.appointmentId).toBe(first.body.data.appointmentId);
});

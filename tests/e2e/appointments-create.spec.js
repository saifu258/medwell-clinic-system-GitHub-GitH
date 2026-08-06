import { test, expect } from "@playwright/test";
import { apiFetchFromPage, loginAs } from "./helpers.js";

test("สร้างนัดหมายจริงโดยไม่ระบุแพทย์และได้ appointment ID", async ({ page }) => {
  await loginAs(page, "admin");
  const patientId = process.env.MEDWELL_QA_PATIENT_ID;
  test.skip(!patientId, "ตั้งค่า MEDWELL_QA_PATIENT_ID ก่อนรัน");
  const result = await apiFetchFromPage(page, "/appointments", {
    method: "POST",
    idempotencyKey: `qa-create-${crypto.randomUUID()}`,
    body: { patientId, appointmentDate: "2026-12-28", startTime: "20:00", endTime: "20:30", doctorUid: null, appointmentType: "follow_up", reason: "QA APPOINTMENT CREATE" }
  });
  expect(result.status).toBe(201);
  expect(result.body.success).toBe(true);
  expect(result.body.data.appointmentId).toMatch(/^[0-9a-f-]{36}$/i);
});

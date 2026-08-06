import { test, expect } from "@playwright/test";
import { apiFetchFromPage, loginAs } from "./helpers.js";

test("ออกคิว Walk-in โดยไม่มีนัดหมายสำเร็จพร้อม Idempotency", async ({ page }) => {
  await loginAs(page, "receptionist");
  const patientId = process.env.MEDWELL_QA_PATIENT_ID;
  test.skip(!patientId, "ตั้งค่า MEDWELL_QA_PATIENT_ID ก่อนรัน");

  // 1. เรียก API POST /queues เพื่อออกคิว Walk-in
  const walkinRes = await apiFetchFromPage(page, "/queues", {
    method: "POST",
    body: { patientId, appointmentId: null, source: "walk_in" }
  });

  expect([200, 201]).toContain(walkinRes.status);
  expect(walkinRes.body.success).toBe(true);
  expect(walkinRes.body.data.queue.queueNumber).toMatch(/^A\d{3}$/);
  expect(walkinRes.body.data.queue.patientId).toBe(patientId);

  const queueId = walkinRes.body.data.queue.queueId;

  // 2. ทดสอบออกคิว Walk-in ซ้ำ (Idempotency)
  const repeatRes = await apiFetchFromPage(page, "/queues", {
    method: "POST",
    body: { patientId, appointmentId: null, source: "walk_in" }
  });

  expect(repeatRes.status).toBe(200);
  expect(repeatRes.body.success).toBe(true);
  expect(repeatRes.body.data.queue.queueId).toBe(queueId);
});

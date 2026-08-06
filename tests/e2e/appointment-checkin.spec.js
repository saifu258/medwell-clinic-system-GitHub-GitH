import { test, expect } from "@playwright/test";
import { apiFetchFromPage, loginAs } from "./helpers.js";

test("เช็กอินนัดหมายประจำวัน และแปลงเข้าสู่คิวสำเร็จพร้อม Idempotency", async ({ page }) => {
  await loginAs(page, "receptionist");
  const patientId = process.env.MEDWELL_QA_PATIENT_ID;
  test.skip(!patientId, "ตั้งค่า MEDWELL_QA_PATIENT_ID ก่อนรัน");

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

  // 1. สร้างนัดหมายสำหรับวันนี้
  const createRes = await apiFetchFromPage(page, "/appointments", {
    method: "POST",
    idempotencyKey: `qa-checkin-${crypto.randomUUID()}`,
    body: {
      patientId,
      appointmentDate: todayStr,
      startTime: "15:00",
      endTime: "15:30",
      doctorUid: null,
      appointmentType: "general",
      reason: "QA CHECKIN TEST"
    }
  });

  // อาจมีนัดหมายซ้ำในวันเดียวกัน ถ้ามี ให้ยอมรับหรือใช้ id ล่าสุด
  let appointmentId = createRes.body?.data?.appointmentId;
  if (createRes.status === 409) {
    const listRes = await apiFetchFromPage(page, "/appointments");
    const found = (listRes.body?.data || []).find((a) => a.patientId === patientId && a.appointmentDate === todayStr);
    appointmentId = found?.appointmentId;
  }
  expect(appointmentId).toMatch(/^[0-9a-f-]{36}$/i);

  // 2. ทำการเช็กอินผ่าน API POST /appointments/:id/check-in
  const checkInRes = await apiFetchFromPage(page, `/appointments/${appointmentId}/check-in`, {
    method: "POST",
    body: { patientId }
  });

  expect([200, 201]).toContain(checkInRes.status);
  expect(checkInRes.body.success).toBe(true);
  expect(checkInRes.body.data.appointment.status).toBe("checked_in");
  expect(checkInRes.body.data.queue.queueNumber).toMatch(/^A\d{3}$/);
  expect(checkInRes.body.data.queue.patientId).toBe(patientId);

  const queueId = checkInRes.body.data.queue.queueId;

  // 3. ทดสอบการเช็กอินซ้ำ (Idempotency)
  const repeatRes = await apiFetchFromPage(page, `/appointments/${appointmentId}/check-in`, {
    method: "POST",
    body: { patientId }
  });

  expect(repeatRes.status).toBe(200);
  expect(repeatRes.body.success).toBe(true);
  expect(repeatRes.body.data.queue.queueId).toBe(queueId);

  // 4. ตรวจสอบว่าคิวแสดงผลใน /queues/today
  const todayRes = await apiFetchFromPage(page, "/queues/today");
  expect(todayRes.status).toBe(200);
  const foundQueue = (todayRes.body?.data || []).find((q) => q.queueId === queueId);
  expect(foundQueue).toBeTruthy();
  expect(foundQueue.patientId).toBe(patientId);
});

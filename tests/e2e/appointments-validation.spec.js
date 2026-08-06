import { test, expect } from "@playwright/test";
import { apiFetchFromPage, loginAs } from "./helpers.js";

test("API นัดหมายคืน 404/400/422 แทน 500 สำหรับ input ปกติที่ผิด", async ({ page }) => {
  await loginAs(page, "admin");
  const base = { patientId: "11111111-1111-4111-8111-111111111111", appointmentDate: "2026-12-29", startTime: "10:00", endTime: "10:30", doctorUid: null, appointmentType: "follow_up", reason: "QA VALIDATION" };
  const missingPatient = await apiFetchFromPage(page, "/appointments", { method: "POST", idempotencyKey: `qa-validation-${crypto.randomUUID()}`, body: base });
  expect(missingPatient.status).toBe(404);
  expect(missingPatient.body.error.code).toBe("PATIENT_NOT_FOUND");
  const malformedDate = await apiFetchFromPage(page, "/appointments", { method: "POST", idempotencyKey: `qa-validation-${crypto.randomUUID()}`, body: { ...base, appointmentDate: "29/12/2026" } });
  expect(malformedDate.status).toBe(400);
  expect(malformedDate.body.error.code).toBe("INVALID_APPOINTMENT_DATE");
  const reversed = await apiFetchFromPage(page, "/appointments", { method: "POST", idempotencyKey: `qa-validation-${crypto.randomUUID()}`, body: { ...base, startTime: "11:00", endTime: "10:30" } });
  expect(reversed.status).toBe(422);
  expect(reversed.body.error.code).toBe("INVALID_APPOINTMENT_TIME");
});

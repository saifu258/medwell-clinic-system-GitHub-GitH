import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { GOOGLE_SELF_SELECT_ROLES, hasPermission, isValidThaiCitizenId, nullifyBlankStrings, requirePermission, toCamel, toSnake, validateAppointmentInput, validateGoogleRoleSelection } from "./helpers.ts";

Deno.test("spO2 maps to the existing spo2 database column", () => {
  assertEquals(toSnake({ spO2: 98 }), { spo2: 98 });
});

Deno.test("nested API data converts between naming conventions", () => {
  assertEquals(toSnake({ patientId: "p1", items: [{ unitPrice: 300 }] }), { patient_id: "p1", items: [{ unit_price: 300 }] });
  assertEquals(toCamel({ patient_id: "p1", items: [{ unit_price: 300 }] }), { patientId: "p1", items: [{ unitPrice: 300 }] });
});

Deno.test("blank optional patient fields become database nulls", () => {
  assertEquals(nullifyBlankStrings({ date_of_birth: "", consent_date: "", phone: "0812345678" }), { date_of_birth: null, consent_date: null, phone: "0812345678" });
});

Deno.test("Thai citizen ID validation is enforced by the API", () => {
  assertEquals(isValidThaiCitizenId("1101700207030"), true);
  assertEquals(isValidThaiCitizenId("1234567890123"), false);
  assertEquals(isValidThaiCitizenId(""), true);
});

Deno.test("Google first-login accepts exactly the five non-privileged roles", () => {
  assertEquals(GOOGLE_SELF_SELECT_ROLES, ["receptionist", "nurse", "doctor", "pharmacist", "cashier"]);
  for (const role of GOOGLE_SELF_SELECT_ROLES) assertEquals(validateGoogleRoleSelection({ role }), role);
  assertEquals(validateGoogleRoleSelection({ role: "  Doctor " }), "doctor");
});

Deno.test("Google first-login rejects privileged, unknown, blank, and multiple role payloads", () => {
  const invalid = [
    { role: "admin" }, { role: "administrator" }, { role: "superadmin" }, { role: "owner" }, { role: "system_admin" },
    { role: "Admin" }, { role: " admin " }, { role: "" }, { role: "unknown" }, { role: ["doctor"] },
    { roles: ["doctor"] }, { role: "doctor", roles: ["admin"] }, {}, null, ["doctor"]
  ];
  for (const payload of invalid) assertThrows(() => validateGoogleRoleSelection(payload), Error, "ไม่สามารถกำหนดบทบาทนี้ได้");
});

Deno.test("appointment input normalizes an optional blank doctor to null", () => {
  assertEquals(validateAppointmentInput({
    patientId: "8b12eb75-90af-442b-80f8-8bc64c0dc7fa",
    appointmentDate: "2026-08-05",
    startTime: "13:00",
    endTime: "13:30",
    doctorUid: "  ",
    appointmentType: " FOLLOW_UP ",
    reason: " QA "
  }), {
    patientId: "8b12eb75-90af-442b-80f8-8bc64c0dc7fa",
    appointmentDate: "2026-08-05",
    startTime: "13:00",
    endTime: "13:30",
    doctorUid: null,
    appointmentType: "follow_up",
    reason: "QA"
  });
});

Deno.test("appointment input rejects malformed dates, times, extra fields, and reversed ranges", () => {
  const base = { patientId: "8b12eb75-90af-442b-80f8-8bc64c0dc7fa", appointmentDate: "2026-08-05", startTime: "13:00", endTime: "13:30", doctorUid: null, appointmentType: "follow_up", reason: "" };
  for (const payload of [
    { ...base, appointmentDate: "05/08/2026" },
    { ...base, startTime: "1:00 PM" },
    { ...base, endTime: "12:59" },
    { ...base, patientId: "not-a-uuid" },
    { ...base, appointmentType: "unknown" },
    { ...base, status: "confirmed" }
  ]) assertThrows(() => validateAppointmentInput(payload));
});

Deno.test("appointment-create permission allows admin/receptionist and rejects the other four roles", () => {
  assertEquals(hasPermission({ roles: ["admin"] }, "appointments.write"), true);
  assertEquals(hasPermission({ roles: ["receptionist"] }, "appointments.write"), true);
  for (const role of ["nurse", "doctor", "pharmacist", "cashier"]) {
    assertEquals(hasPermission({ roles: [role] }, "appointments.write"), false);
    const error = assertThrows(() => requirePermission({ roles: [role] }, "appointments.write"));
    assertEquals((error as Error & { status?: number; code?: string }).status, 403);
    assertEquals((error as Error & { status?: number; code?: string }).code, "FORBIDDEN");
  }
});

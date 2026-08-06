export const nowIso = () => new Date().toISOString();
export const todayBangkok = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
export const randomCode = (prefix: string) => `${prefix}-${todayBangkok().replaceAll("-", "").slice(2)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

const toSnakeKey = (key: string) => key === "spO2" ? "spo2" : key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const toCamelKey = (key: string) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
export function toSnake(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnake);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, val]) => val !== undefined).map(([key, val]) => [toSnakeKey(key), toSnake(val)]));
  return value;
}
export function toCamel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamel);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, val]) => [toCamelKey(key), toCamel(val)]));
  return value;
}

export function nullifyBlankStrings(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" && item.trim() === "" ? null : item]));
}

export function isValidThaiCitizenId(value: unknown) {
  const text = String(value ?? "");
  if (!text) return true;
  if (!/^\d{13}$/.test(text)) return false;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) sum += Number(text[index]) * (13 - index);
  return (11 - (sum % 11)) % 10 === Number(text[12]);
}

export const success = (data: unknown, message = "ดำเนินการสำเร็จ", status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify({ success: true, data: toCamel(data), message, timestamp: nowIso() }), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
export const failure = (error: unknown, headers: HeadersInit = {}) => {
  const value = error as { status?: number; code?: string; message?: string; details?: unknown };
  const status = value.status || 500;
  return new Response(JSON.stringify({ success: false, error: { code: value.code || "INTERNAL_ERROR", message: status === 500 ? "ระบบขัดข้อง กรุณาลองใหม่" : value.message, details: value.details || null }, timestamp: nowIso() }), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
};

const permissions: Record<string, string[]> = {
  admin: ["*"],
  receptionist: ["patients.read", "patients.write", "appointments.read", "appointments.write", "queues.read", "queues.write"],
  nurse: ["patients.read", "queues.read", "screenings.read", "screenings.write"],
  doctor: ["patients.read", "queues.read", "screenings.read", "records.read", "visits.write", "prescriptions.read", "prescriptions.write", "medicines.read"],
  pharmacist: ["patients.read", "prescriptions.read", "medicines.read", "inventory.read", "inventory.receive", "dispense.write"],
  cashier: ["patients.read", "services.read", "billing.read", "billing.write", "payments.write"]
};
export const hasPermission = (profile: { roles?: string[]; permissions?: string[] }, permission: string) => [...(profile.permissions || []), ...(profile.roles || []).flatMap((role) => permissions[role] || [])].some((item) => item === "*" || item === permission);
export function requirePermission(profile: { roles?: string[]; permissions?: string[] }, permission: string) { if (!hasPermission(profile, permission)) throw Object.assign(new Error("คุณไม่มีสิทธิ์ดำเนินการ"), { status: 403, code: "FORBIDDEN" }); }
export function requireAdmin(profile: { roles?: string[] }) { if (!profile.roles?.includes("admin")) throw Object.assign(new Error("สงวนสิทธิ์สำหรับผู้ดูแลระบบ"), { status: 403, code: "FORBIDDEN" }); }
export const GOOGLE_SELF_SELECT_ROLES = ["receptionist", "nurse", "doctor", "pharmacist", "cashier"] as const;
export function validateGoogleRoleSelection(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Object.assign(new Error("ไม่สามารถกำหนดบทบาทนี้ได้"), { status: 403, code: "ROLE_NOT_ALLOWED" });
  const input = value as Record<string, unknown>;
  const role = typeof input.role === "string" ? input.role.trim().toLowerCase() : "";
  if (Object.keys(input).length !== 1 || !GOOGLE_SELF_SELECT_ROLES.includes(role as typeof GOOGLE_SELF_SELECT_ROLES[number])) {
    throw Object.assign(new Error("ไม่สามารถกำหนดบทบาทนี้ได้"), { status: 403, code: "ROLE_NOT_ALLOWED" });
  }
  return role;
}

const appointmentTypes = new Set(["follow_up", "general", "procedure"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateAppointmentInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error("รูปแบบข้อมูลนัดหมายไม่ถูกต้อง"), { status: 400, code: "INVALID_APPOINTMENT" });
  }
  const input = value as Record<string, unknown>;
  const allowed = new Set(["patientId", "appointmentDate", "startTime", "endTime", "doctorUid", "appointmentType", "reason"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw Object.assign(new Error("ข้อมูลนัดหมายมีฟิลด์ที่ไม่รองรับ"), { status: 400, code: "INVALID_APPOINTMENT" });
  }

  const patientId = typeof input.patientId === "string" ? input.patientId.trim() : "";
  const appointmentDate = typeof input.appointmentDate === "string" ? input.appointmentDate.trim() : "";
  const startTime = typeof input.startTime === "string" ? input.startTime.trim() : "";
  const endTime = typeof input.endTime === "string" ? input.endTime.trim() : "";
  const rawDoctor = input.doctorUid;
  const doctorUid = rawDoctor === null || rawDoctor === undefined || (typeof rawDoctor === "string" && !rawDoctor.trim()) ? null : typeof rawDoctor === "string" ? rawDoctor.trim() : "";
  const appointmentType = typeof input.appointmentType === "string" ? input.appointmentType.trim().toLowerCase() : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";

  if (!uuidPattern.test(patientId)) throw Object.assign(new Error("รหัสผู้ป่วยไม่ถูกต้อง"), { status: 400, code: "INVALID_PATIENT_ID" });
  const parsedDate = new Date(`${appointmentDate}T00:00:00.000Z`);
  if (!datePattern.test(appointmentDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== appointmentDate) {
    throw Object.assign(new Error("วันที่นัดต้องอยู่ในรูปแบบ YYYY-MM-DD"), { status: 400, code: "INVALID_APPOINTMENT_DATE" });
  }
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
    throw Object.assign(new Error("เวลานัดต้องอยู่ในรูปแบบ 24 ชั่วโมง HH:mm"), { status: 400, code: "INVALID_APPOINTMENT_TIME" });
  }
  if (endTime <= startTime) {
    throw Object.assign(new Error("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น"), { status: 422, code: "INVALID_APPOINTMENT_TIME" });
  }
  if (doctorUid === "") throw Object.assign(new Error("รหัสแพทย์ไม่ถูกต้อง"), { status: 400, code: "INVALID_DOCTOR_UID" });
  if (!appointmentTypes.has(appointmentType)) throw Object.assign(new Error("ประเภทนัดหมายไม่ถูกต้อง"), { status: 422, code: "INVALID_APPOINTMENT_TYPE" });
  if (reason.length > 2000) throw Object.assign(new Error("เหตุผลการนัดยาวเกินไป"), { status: 422, code: "INVALID_APPOINTMENT_REASON" });

  return { patientId, appointmentDate, startTime, endTime, doctorUid, appointmentType, reason };
}
export const dbError = (error: { code?: string; message?: string } | null, fallback = "ไม่สามารถดำเนินการกับฐานข้อมูลได้") => { if (!error) return; const conflict = error.code === "23505"; throw Object.assign(new Error(conflict ? "ข้อมูลซ้ำกับรายการที่มีอยู่" : fallback), { status: conflict ? 409 : 500, code: conflict ? "CONFLICT" : "DATABASE_ERROR" }); };

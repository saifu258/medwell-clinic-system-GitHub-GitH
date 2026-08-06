import { repository } from "../repositories/baseRepository.js";
import { assertTransition, generateCode, nowIso, uuid } from "../utils/helpers.js";
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from "../errors/AppError.js";

export const repos = Object.fromEntries(["Appointments", "Queues", "Screenings", "Visits", "VisitAddendums", "Diagnoses", "DiagnosisMaster", "Prescriptions", "PrescriptionItems", "Medicines", "Services", "Users", "Settings", "AuditLogs"].map((name) => [name, repository(name)]));

export async function createAppointment(body, actor) {
  if (!body.patientId || !body.appointmentDate || !body.startTime) throw new ValidationError("ข้อมูลนัดหมายไม่ครบ");
  const rows = await repos.Appointments.list({ appointmentDate: body.appointmentDate });
  if (rows.some((r) => r.doctorUid === body.doctorUid && r.startTime === body.startTime && !["cancelled", "no_show"].includes(r.status))) throw new ConflictError("แพทย์มีนัดหมายในเวลานี้แล้ว");
  const now = nowIso(); return repos.Appointments.create({ appointmentId: uuid(), appointmentNumber: generateCode("AP"), status: "scheduled", ...body, createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor });
}

export async function checkInAppointment(id, actor) {
  const appointment = await repos.Appointments.get(id); assertTransition("appointment", appointment.status, "checked_in");
  const today = new Date().toISOString().slice(0, 10); const queues = await repos.Queues.list({ queueDate: today });
  if (queues.some((q) => q.patientId === appointment.patientId && q.currentStatus !== "cancelled")) throw new ConflictError("ผู้ป่วยมีคิววันนี้แล้ว");
  const queue = await repos.Queues.create({ queueId: uuid(), queueNumber: `A${String(queues.length + 1).padStart(3, "0")}`, patientId: appointment.patientId, appointmentId: id, queueDate: today, checkInTime: nowIso(), priority: appointment.priority || "normal", currentStatus: "waiting", currentStation: "reception", notes: "", createdAt: nowIso(), createdBy: actor, updatedAt: nowIso(), updatedBy: actor });
  await repos.Appointments.update(id, { status: "checked_in", updatedAt: nowIso(), updatedBy: actor }, appointment.updatedAt); return queue;
}

export async function updateStatus(repoName, id, type, status, actor, reason = "") {
  const current = await repos[repoName].get(id); const key = type === "queue" ? "currentStatus" : type === "visit" ? "visitStatus" : "status";
  assertTransition(type, current[key], status); if (status === "cancelled" && !reason) throw new ValidationError("กรุณาระบุเหตุผลการยกเลิก");
  return repos[repoName].update(id, { [key]: status, cancellationReason: reason, updatedAt: nowIso(), updatedBy: actor }, current.updatedAt);
}

export async function createScreening(body, actor) {
  if (!body.queueId || !body.patientId) throw new ValidationError("ไม่พบคิวหรือผู้ป่วย");
  const heightM = Number(body.height) / 100; const bmi = heightM > 0 ? (Number(body.weight) / (heightM ** 2)).toFixed(1) : "";
  const alerts = []; if (Number(body.systolic) >= 180 || Number(body.diastolic) >= 120) alerts.push("ความดันสูงมาก"); if (Number(body.temperature) >= 38) alerts.push("มีไข้"); if (Number(body.spO2) > 0 && Number(body.spO2) < 95) alerts.push("SpO2 ต่ำ");
  const record = await repos.Screenings.create({ screeningId: uuid(), ...body, bmi, alertsJson: JSON.stringify(alerts), createdAt: nowIso(), createdBy: actor, updatedAt: nowIso(), updatedBy: actor });
  await updateStatus("Queues", body.queueId, "queue", "waiting_doctor", actor); return record;
}

export async function createVisit(body, actor) {
  if (!body.patientId || !body.queueId) throw new ValidationError("ไม่พบผู้ป่วยหรือคิว");
  const existing = await repos.Visits.list({ queueId: body.queueId }); if (existing.some((v) => v.visitStatus !== "cancelled")) throw new ConflictError("คิวนี้มี Visit แล้ว");
  await updateStatus("Queues", body.queueId, "queue", "in_consultation", actor);
  const now = nowIso(); return repos.Visits.create({ visitId: uuid(), vn: generateCode("VN"), visitDate: now.slice(0, 10), doctorUid: actor, visitStatus: "in_consultation", ...body, createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor });
}

export async function updateVisit(id, body, actor) {
  const visit = await repos.Visits.get(id); if (visit.visitStatus === "completed") throw new BusinessRuleError("Visit ปิดแล้ว กรุณาเพิ่ม Addendum");
  return repos.Visits.update(id, { ...body, updatedAt: nowIso(), updatedBy: actor }, body.updatedAt);
}

export async function completeVisit(id, body, actor) {
  const visit = await repos.Visits.get(id); assertTransition("visit", visit.visitStatus, "completed");
  const prescriptions = await repos.Prescriptions.list({ visitId: id }); const nextQueue = prescriptions.some((p) => p.status !== "cancelled") ? "waiting_pharmacy" : "waiting_payment";
  await updateStatus("Queues", visit.queueId, "queue", nextQueue, actor); return repos.Visits.update(id, { visitStatus: "completed", closedAt: nowIso(), closedBy: actor, updatedAt: nowIso(), updatedBy: actor }, body.updatedAt || visit.updatedAt);
}

export async function addendum(id, body, actor) {
  const visit = await repos.Visits.get(id); if (visit.visitStatus !== "completed") throw new BusinessRuleError("เพิ่ม Addendum ได้หลังปิด Visit เท่านั้น"); if (!body.reason || !body.note) throw new ValidationError("กรุณาระบุเหตุผลและข้อความ");
  return repos.VisitAddendums.create({ addendumId: uuid(), visitId: id, note: body.note, reason: body.reason, createdAt: nowIso(), createdBy: actor });
}

export async function getDashboard() {
  const today = new Date().toISOString().slice(0, 10); const [queues, appointments, invoices, lots, medicines] = await Promise.all([repos.Queues.list({ queueDate: today }), repos.Appointments.list({ appointmentDate: today }), repository("Invoices").list({ invoiceDate: today }), repository("StockLots").list(), repos.Medicines.list()]);
  const sum = invoices.filter((i) => i.status === "paid").reduce((total, i) => total + Number(i.paidAmount || 0), 0);
  const now = Date.now(); return { patientsToday: queues.length, waiting: queues.filter((q) => ["waiting", "screening", "waiting_doctor"].includes(q.currentStatus)).length, consulting: queues.filter((q) => q.currentStatus === "in_consultation").length, completed: queues.filter((q) => q.currentStatus === "completed").length, appointmentsToday: appointments.length, revenueToday: sum, queues: queues.slice(-8), appointments: appointments.slice(0, 6), lowStock: medicines.filter((m) => Number(m.quantityRemaining || 0) <= Number(m.minimumStock || 0)).slice(0, 5), expiring: lots.filter((l) => new Date(l.expiryDate).getTime() - now < 90 * 86400000 && new Date(l.expiryDate).getTime() > now).slice(0, 5) };
}

export async function getById(repoName, id) { if (!repos[repoName]) throw new NotFoundError(); return repos[repoName].get(id); }

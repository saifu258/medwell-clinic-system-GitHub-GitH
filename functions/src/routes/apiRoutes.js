import { Router } from "express";
import { adminAuth } from "../config/firebaseAdmin.js";
import { SPREADSHEET_ID } from "../config/constants.js";
import { googleSheetsService } from "../services/googleSheetsService.js";
import { authenticateFirebaseToken, loadUserProfile, requireActiveUser } from "../middleware/auth.js";
import { requirePermission, requireRole } from "../middleware/authorization.js";
import { addendum, checkInAppointment, completeVisit, createAppointment, createScreening, createVisit, getById, getDashboard, repos, updateStatus, updateVisit } from "../services/clinicService.js";
import { createPatient, listPatients, updatePatient } from "../services/patientService.js";
import { adjustStock, dispensePrescription, receiveStock } from "../services/inventoryService.js";
import { addPayment, createInvoice, voidInvoice } from "../services/billingService.js";
import { writeAudit } from "../services/auditService.js";
import { repository } from "../repositories/baseRepository.js";
import { nowIso, parseJson, uuid } from "../utils/helpers.js";
import { NotFoundError, ValidationError } from "../errors/AppError.js";
import { AuthorizationError } from "../errors/AppError.js";
import { hasPermission } from "../permissions/permissions.js";
import { bootstrapClinic } from "../services/bootstrapService.js";

export const apiRouter = Router();
const ok = (res, data, message = "ดำเนินการสำเร็จ", status = 200) => res.status(status).json({ success: true, data, message, timestamp: nowIso() });
const wrap = (handler) => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
const actor = (req) => req.user.uid;
const audit = async (req, data) => { try { await writeAudit(req, data); } catch { /* audit failure must not expose patient data */ } };

apiRouter.get("/health", wrap(async (_req, res) => {
  const configured = SPREADSHEET_ID !== "YOUR_SPREADSHEET_ID"; let sheets = "not_configured";
  if (configured) { try { await googleSheetsService.getSheetHeaders("Settings"); sheets = "connected"; } catch { sheets = "unavailable"; } }
  ok(res, { status: "ok", service: "medwell-api", timezone: "Asia/Bangkok", sheets });
}));

apiRouter.post("/bootstrap", authenticateFirebaseToken, wrap(async (req, res) => ok(res, await bootstrapClinic(req.auth), "ตั้งค่าระบบครั้งแรกสำเร็จ", 201)));

apiRouter.use(authenticateFirebaseToken, loadUserProfile, requireActiveUser);
apiRouter.get("/me", wrap(async (req, res) => ok(res, { uid: req.user.uid, email: req.user.email, displayName: req.user.displayName, roles: req.user.roles, permissions: req.user.permissions })));
apiRouter.get("/dashboard", wrap(async (_req, res) => ok(res, await getDashboard())));

apiRouter.get("/patients", requirePermission("patients.read"), wrap(async (req, res) => ok(res, await listPatients(req.query))));
apiRouter.post("/patients", requirePermission("patients.write"), wrap(async (req, res) => { const data = await createPatient(req.body, actor(req)); await audit(req, { action: "create", module: "patients", recordType: "patient", recordId: data.patientId }); ok(res, data, "เพิ่มผู้ป่วยสำเร็จ", 201); }));
apiRouter.get("/patients/:id", requirePermission("patients.read"), wrap(async (req, res) => { const data = await getById("Patients", req.params.id); await audit(req, { action: "view", module: "patients", recordType: "patient", recordId: req.params.id }); ok(res, data); }));
apiRouter.put("/patients/:id", requirePermission("patients.write"), wrap(async (req, res) => { const data = await updatePatient(req.params.id, req.body, actor(req)); await audit(req, { action: "update", module: "patients", recordType: "patient", recordId: req.params.id }); ok(res, data, "แก้ไขผู้ป่วยสำเร็จ"); }));

apiRouter.get("/appointments", wrap(async (req, res) => ok(res, await repos.Appointments.list(req.query))));
apiRouter.post("/appointments", requirePermission("appointments.write"), wrap(async (req, res) => ok(res, await createAppointment(req.body, actor(req)), "สร้างนัดหมายสำเร็จ", 201)));
apiRouter.put("/appointments/:id", requirePermission("appointments.write"), wrap(async (req, res) => ok(res, await repos.Appointments.update(req.params.id, { ...req.body, updatedAt: nowIso(), updatedBy: actor(req) }, req.body.updatedAt))));
apiRouter.post("/appointments/:id/check-in", requirePermission("queues.write"), wrap(async (req, res) => ok(res, await checkInAppointment(req.params.id, actor(req)), "เช็กอินสำเร็จ", 201)));
apiRouter.post("/appointments/:id/cancel", requirePermission("appointments.write"), wrap(async (req, res) => ok(res, await updateStatus("Appointments", req.params.id, "appointment", "cancelled", actor(req), req.body.reason))));

apiRouter.get("/queues/today", wrap(async (_req, res) => ok(res, await repos.Queues.list({ queueDate: new Date().toISOString().slice(0, 10) }))));
apiRouter.post("/queues", requirePermission("queues.write"), wrap(async (req, res) => { const today = new Date().toISOString().slice(0, 10); const rows = await repos.Queues.list({ queueDate: today }); if (!req.body.patientId) throw new ValidationError("กรุณาเลือกผู้ป่วย"); const data = await repos.Queues.create({ queueId: uuid(), queueNumber: `A${String(rows.length + 1).padStart(3, "0")}`, queueDate: today, checkInTime: nowIso(), currentStatus: "waiting", currentStation: "reception", priority: "normal", ...req.body, createdAt: nowIso(), createdBy: actor(req), updatedAt: nowIso(), updatedBy: actor(req) }); ok(res, data, "ออกคิวสำเร็จ", 201); }));
apiRouter.put("/queues/:id/status", wrap(async (req, res) => ok(res, await updateStatus("Queues", req.params.id, "queue", req.body.status, actor(req), req.body.reason))));
apiRouter.post("/queues/:id/call", wrap(async (req, res) => { const current = await repos.Queues.get(req.params.id); ok(res, await repos.Queues.update(req.params.id, { calledTime: nowIso(), callCount: Number(current.callCount || 0) + 1, updatedAt: nowIso(), updatedBy: actor(req) }, current.updatedAt), "เรียกคิวแล้ว"); }));

apiRouter.post("/screenings", requirePermission("screenings.write"), wrap(async (req, res) => ok(res, await createScreening(req.body, actor(req)), "บันทึกคัดกรองสำเร็จ", 201)));
apiRouter.get("/screenings/:visitId", wrap(async (req, res) => ok(res, await repos.Screenings.list({ visitId: req.params.visitId }))));
apiRouter.get("/diagnosis-master", requirePermission("records.read"), wrap(async (req, res) => ok(res, await repos.DiagnosisMaster.list(req.query))));

apiRouter.post("/visits", requirePermission("visits.write"), wrap(async (req, res) => ok(res, await createVisit(req.body, actor(req)), "เปิด Visit สำเร็จ", 201)));
apiRouter.get("/visits/:id", requirePermission("records.read"), wrap(async (req, res) => { const data = await repos.Visits.get(req.params.id); await audit(req, { action: "view", module: "medical_records", recordType: "visit", recordId: req.params.id }); ok(res, data); }));
apiRouter.put("/visits/:id", requirePermission("visits.write"), wrap(async (req, res) => ok(res, await updateVisit(req.params.id, req.body, actor(req)))));
apiRouter.post("/visits/:id/complete", requirePermission("visits.write"), wrap(async (req, res) => ok(res, await completeVisit(req.params.id, req.body, actor(req)), "ปิด Visit สำเร็จ")));
apiRouter.post("/visits/:id/addendum", requirePermission("visits.write"), wrap(async (req, res) => ok(res, await addendum(req.params.id, req.body, actor(req)), "เพิ่ม Addendum สำเร็จ", 201)));

apiRouter.post("/prescriptions", requirePermission("prescriptions.write"), wrap(async (req, res) => { if (!req.body.visitId || !req.body.patientId || !Array.isArray(req.body.items) || !req.body.items.length || req.body.items.some((item) => Number(item.quantity) <= 0)) throw new ValidationError("ใบสั่งยาต้องมีรายการและจำนวนมากกว่า 0"); const now = nowIso(); const prescription = await repos.Prescriptions.create({ prescriptionId: uuid(), status: "prescribed", prescriptionDate: now, doctorUid: actor(req), ...req.body, items: undefined, createdAt: now, createdBy: actor(req), updatedAt: now, updatedBy: actor(req) }); for (const item of req.body.items) await repos.PrescriptionItems.create({ itemId: uuid(), prescriptionId: prescription.prescriptionId, status: "prescribed", ...item, createdAt: now, createdBy: actor(req) }); ok(res, prescription, "ออกใบสั่งยาสำเร็จ", 201); }));
apiRouter.get("/prescriptions/:id", wrap(async (req, res) => ok(res, { ...(await repos.Prescriptions.get(req.params.id)), items: await repos.PrescriptionItems.list({ prescriptionId: req.params.id }) })));
apiRouter.post("/prescriptions/:id/dispense", requirePermission("dispense.write"), wrap(async (req, res) => { const data = await dispensePrescription(req.params.id, req.body, actor(req)); await audit(req, { action: "dispense", module: "pharmacy", recordType: "prescription", recordId: req.params.id }); ok(res, data, "จ่ายยาสำเร็จ"); }));

for (const [path, repoName, permission] of [["medicines", "Medicines", "inventory.read"], ["services", "Services", "billing.read"]]) {
  apiRouter.get(`/${path}`, wrap(async (req, res) => ok(res, await repos[repoName].list(req.query))));
  apiRouter.post(`/${path}`, requirePermission(permission === "inventory.read" ? "inventory.receive" : "billing.write"), wrap(async (req, res) => ok(res, await repos[repoName].create({ [`${path.slice(0, -1)}Id`]: uuid(), ...req.body, createdAt: nowIso(), createdBy: actor(req), updatedAt: nowIso(), updatedBy: actor(req) }), "สร้างข้อมูลสำเร็จ", 201)));
  apiRouter.put(`/${path}/:id`, wrap(async (req, res) => ok(res, await repos[repoName].update(req.params.id, { ...req.body, updatedAt: nowIso(), updatedBy: actor(req) }, req.body.updatedAt))));
}
apiRouter.post("/inventory/receive", requirePermission("inventory.receive"), wrap(async (req, res) => ok(res, await receiveStock(req.body, actor(req)), "รับยาเข้าสต็อกสำเร็จ", 201)));
apiRouter.post("/inventory/adjust", requireRole("admin"), wrap(async (req, res) => { const data = await adjustStock(req.body, actor(req)); await audit(req, { action: "adjust", module: "inventory", recordType: "stock_lot", recordId: req.body.lotId, description: req.body.reason }); ok(res, data); }));
apiRouter.get("/inventory/low-stock", wrap(async (_req, res) => { const meds = await repos.Medicines.list(); ok(res, meds.filter((m) => Number(m.quantityRemaining || 0) <= Number(m.minimumStock || 0))); }));
apiRouter.get("/inventory/expiring", wrap(async (req, res) => { const days = Number(req.query.days || 90); const now = Date.now(); ok(res, (await repository("StockLots").list()).filter((l) => { const diff = new Date(l.expiryDate).getTime() - now; return diff > 0 && diff <= days * 86400000; })); }));

apiRouter.post("/invoices", requirePermission("billing.write"), wrap(async (req, res) => ok(res, await createInvoice(req.body, actor(req)), "สร้าง Invoice สำเร็จ", 201)));
apiRouter.get("/invoices/:id", requirePermission("billing.read"), wrap(async (req, res) => { const invoice = await repository("Invoices").get(req.params.id); ok(res, { ...invoice, items: await repository("InvoiceItems").list({ invoiceId: req.params.id }), payments: await repository("Payments").list({ invoiceId: req.params.id }) }); }));
apiRouter.post("/invoices/:id/payments", requirePermission("payments.write"), wrap(async (req, res) => ok(res, await addPayment(req.params.id, { ...req.body, idempotencyKey: req.get("idempotency-key") || req.body.idempotencyKey }, actor(req)), "รับชำระเงินสำเร็จ", 201)));
apiRouter.post("/invoices/:id/void", requireRole("admin"), wrap(async (req, res) => { const data = await voidInvoice(req.params.id, req.body, actor(req)); await audit(req, { action: "void", module: "billing", recordType: "invoice", recordId: req.params.id, description: req.body.reason }); ok(res, data); }));

apiRouter.get("/reports/:reportName", wrap(async (req, res) => { const map = { appointments: ["Appointments", null], queues: ["Queues", null], revenue: ["Payments", "billing.read"], inventory: ["StockLots", "inventory.read"], movements: ["StockMovements", "inventory.read"], treatments: ["Visits", "records.read"], users: ["Users", "admin"] }; const config = map[req.params.reportName]; if (!config) throw new NotFoundError("ไม่พบรายงาน"); const [name, permission] = config; if (permission === "admin" ? !req.user.roles.includes("admin") : permission && !hasPermission(req.user, permission)) throw new AuthorizationError(); ok(res, await repository(name).list(req.query)); }));
apiRouter.get("/users", requireRole("admin"), wrap(async (_req, res) => ok(res, await repos.Users.list())));
apiRouter.post("/users", requireRole("admin"), wrap(async (req, res) => { if (!req.body.email || !req.body.displayName) throw new ValidationError("กรุณากรอก Email และชื่อ"); const authUser = await adminAuth.createUser({ email: req.body.email, displayName: req.body.displayName, disabled: false }); const now = nowIso(); const profile = await repos.Users.create({ uid: authUser.uid, email: req.body.email, displayName: req.body.displayName, rolesJson: JSON.stringify(req.body.roles || []), permissionsJson: JSON.stringify(req.body.permissions || []), active: "true", phone: req.body.phone || "", lastLoginAt: "", createdAt: now, updatedAt: now }); await audit(req, { action: "create", module: "users", recordType: "user", recordId: authUser.uid }); ok(res, profile, "สร้างผู้ใช้สำเร็จ", 201); }));
apiRouter.put("/users/:uid", requireRole("admin"), wrap(async (req, res) => { const data = await repos.Users.update(req.params.uid, { ...req.body, rolesJson: req.body.roles ? JSON.stringify(req.body.roles) : req.body.rolesJson, permissionsJson: req.body.permissions ? JSON.stringify(req.body.permissions) : req.body.permissionsJson, updatedAt: nowIso() }, req.body.updatedAt); await audit(req, { action: "update", module: "users", recordType: "user", recordId: req.params.uid }); ok(res, data); }));
apiRouter.post("/users/:uid/disable", requireRole("admin"), wrap(async (req, res) => { await adminAuth.updateUser(req.params.uid, { disabled: true }); const data = await repos.Users.update(req.params.uid, { active: "false", updatedAt: nowIso() }, req.body.updatedAt); await audit(req, { action: "disable", module: "users", recordType: "user", recordId: req.params.uid }); ok(res, data); }));
apiRouter.post("/users/:uid/reset-password", requireRole("admin"), wrap(async (req, res) => { const user = await adminAuth.getUser(req.params.uid); const resetLink = await adminAuth.generatePasswordResetLink(user.email); await audit(req, { action: "password_reset_link", module: "users", recordType: "user", recordId: req.params.uid }); ok(res, { email: user.email, resetLink }, "สร้างลิงก์ตั้งรหัสผ่านใหม่แล้ว"); }));

apiRouter.get("/settings", wrap(async (_req, res) => { const rows = await repos.Settings.list(); ok(res, Object.fromEntries(rows.map((r) => [r.key, r.value]))); }));
apiRouter.put("/settings", requireRole("admin"), wrap(async (req, res) => { const current = await repos.Settings.list(); for (const [key, value] of Object.entries(req.body)) { const row = current.find((r) => r.key === key); if (row) await repos.Settings.update(key, { value: String(value), updatedAt: nowIso(), updatedBy: actor(req) }, row.updatedAt); else await repos.Settings.create({ key, value: String(value), description: "", updatedAt: nowIso(), updatedBy: actor(req) }); } ok(res, req.body, "บันทึกการตั้งค่าสำเร็จ"); }));
apiRouter.get("/audit-logs", requireRole("admin"), wrap(async (req, res) => ok(res, await repos.AuditLogs.list(req.query))));
apiRouter.get("/backup/:sheetName", requireRole("admin"), wrap(async (req, res) => { const allowed = Object.values({ ...Object.fromEntries(Object.keys(repos).map((k) => [k, k])), StockLots: "StockLots", StockMovements: "StockMovements", Invoices: "Invoices", InvoiceItems: "InvoiceItems", Payments: "Payments" }); if (!allowed.includes(req.params.sheetName)) throw new NotFoundError("ไม่พบชีต"); const data = await repository(req.params.sheetName).list(); await audit(req, { action: "export", module: "backup", recordType: req.params.sheetName }); ok(res, data); }));

export const REGION = "asia-southeast1";
export const TIMEZONE = "Asia/Bangkok";
export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "YOUR_SPREADSHEET_ID";
export const MASTER_CACHE_MS = 60_000;
export const API_TIMEOUT_MS = 12_000;

export const SHEETS = {
  settings: "Settings", users: "Users", patients: "Patients", appointments: "Appointments",
  queues: "Queues", screenings: "Screenings", visits: "Visits", visitAddendums: "VisitAddendums",
  diagnoses: "Diagnoses", diagnosisMaster: "DiagnosisMaster", prescriptions: "Prescriptions", prescriptionItems: "PrescriptionItems",
  medicines: "Medicines", stockLots: "StockLots", stockMovements: "StockMovements", services: "Services",
  invoices: "Invoices", invoiceItems: "InvoiceItems", payments: "Payments", auditLogs: "AuditLogs", counters: "Counters"
};

export const ID_COLUMNS = {
  Settings: "key", Users: "uid", Patients: "patientId", Appointments: "appointmentId", Queues: "queueId",
  Screenings: "screeningId", Visits: "visitId", VisitAddendums: "addendumId", Diagnoses: "diagnosisId", DiagnosisMaster: "diagnosisMasterId",
  Prescriptions: "prescriptionId", PrescriptionItems: "itemId", Medicines: "medicineId", StockLots: "lotId",
  StockMovements: "movementId", Services: "serviceId", Invoices: "invoiceId", InvoiceItems: "invoiceItemId",
  Payments: "paymentId", AuditLogs: "logId", Counters: "counterKey"
};

export const STATUS_TRANSITIONS = {
  appointment: { scheduled: ["confirmed", "checked_in", "cancelled", "no_show"], confirmed: ["checked_in", "cancelled"], checked_in: ["completed"] },
  queue: { waiting: ["screening"], screening: ["waiting_doctor"], waiting_doctor: ["in_consultation"], in_consultation: ["waiting_pharmacy", "waiting_payment", "completed"], waiting_pharmacy: ["waiting_payment", "completed"], waiting_payment: ["completed"] },
  visit: { open: ["in_consultation", "cancelled"], in_consultation: ["completed"] },
  prescription: { draft: ["prescribed", "cancelled"], prescribed: ["preparing", "cancelled"], preparing: ["dispensed"] },
  invoice: { draft: ["unpaid", "void"], unpaid: ["partially_paid", "paid", "void"], partially_paid: ["paid"] }
};

export const ROLE_PERMISSIONS = {
  admin: ["*"],
  receptionist: ["patients.read", "patients.write", "appointments.write", "queues.write", "print.queue", "print.appointment"],
  nurse: ["patients.read", "queues.read", "screenings.write"],
  doctor: ["patients.read", "records.read", "visits.write", "prescriptions.write"],
  pharmacist: ["prescriptions.read", "inventory.read", "inventory.receive", "dispense.write", "print.label"],
  cashier: ["billing.read", "billing.write", "payments.write", "print.receipt"]
};

import { invoiceRepository, invoiceItemRepository, paymentRepository } from "../repositories/billingRepository.js";
import { BusinessRuleError, ConflictError, ValidationError } from "../errors/AppError.js";
import { generateCode, nowIso, uuid } from "../utils/helpers.js";

export function calculateInvoice(items, discount = 0, tax = 0) { const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0), 0); const grandTotal = Math.max(0, subtotal - Number(discount) + Number(tax)); return { subtotal, discount: Number(discount), tax: Number(tax), grandTotal, paidAmount: 0, balance: grandTotal }; }
export async function createInvoice(body, actor) {
  if (!body.patientId || !body.visitId || !Array.isArray(body.items) || !body.items.length) throw new ValidationError("Invoice ต้องมีผู้ป่วย Visit และรายการ"); const totals = calculateInvoice(body.items, body.discount, body.tax); const now = nowIso();
  const invoice = await invoiceRepository.create({ invoiceId: uuid(), invoiceNumber: generateCode("INV"), visitId: body.visitId, patientId: body.patientId, invoiceDate: now.slice(0, 10), ...totals, status: "unpaid", notes: body.notes || "", createdBy: actor, createdAt: now, updatedAt: now, updatedBy: actor });
  for (const item of body.items) await invoiceItemRepository.create({ invoiceItemId: uuid(), invoiceId: invoice.invoiceId, ...item, total: Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0), createdAt: now, createdBy: actor }); return invoice;
}
export async function addPayment(id, body, actor) {
  if (!body.idempotencyKey) throw new ValidationError("ต้องระบุ Idempotency-Key"); const duplicates = await paymentRepository.list({ idempotencyKey: body.idempotencyKey }); if (duplicates.length) return duplicates[0];
  const invoice = await invoiceRepository.get(id); const amount = Number(body.amount); if (!(amount > 0)) throw new ValidationError("ยอดชำระต้องมากกว่า 0"); if (amount > Number(invoice.balance)) throw new BusinessRuleError("ยอดชำระเกินยอดคงเหลือ"); if (["paid", "void"].includes(invoice.status)) throw new ConflictError("Invoice นี้ไม่สามารถรับชำระได้");
  const paidAmount = Number(invoice.paidAmount || 0) + amount; const balance = Number(invoice.grandTotal) - paidAmount; const status = balance === 0 ? "paid" : "partially_paid"; const now = nowIso();
  const payment = await paymentRepository.create({ paymentId: uuid(), invoiceId: id, paymentDate: now, amount, paymentMethod: body.paymentMethod || "cash", referenceNumber: body.referenceNumber || "", receivedBy: actor, notes: body.notes || "", idempotencyKey: body.idempotencyKey, createdAt: now, createdBy: actor });
  await invoiceRepository.update(id, { paidAmount, balance, status, updatedAt: now, updatedBy: actor }, invoice.updatedAt); return payment;
}
export async function voidInvoice(id, body, actor) { if (!body.reason) throw new ValidationError("กรุณาระบุเหตุผล Void"); const invoice = await invoiceRepository.get(id); if (invoice.status === "paid") throw new BusinessRuleError("Invoice ที่ชำระแล้วต้องดำเนินการคืนเงินก่อน"); return invoiceRepository.update(id, { status: "void", voidReason: body.reason, voidedAt: nowIso(), voidedBy: actor, updatedAt: nowIso(), updatedBy: actor }, invoice.updatedAt); }

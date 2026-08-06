import { medicineRepository, stockLotRepository, stockMovementRepository } from "../repositories/inventoryRepository.js";
import { repos, updateStatus } from "./clinicService.js";
import { BusinessRuleError, ConflictError, ValidationError } from "../errors/AppError.js";
import { nowIso, uuid } from "../utils/helpers.js";

export function calculateAdjustedBalance(current, change) { const after = Number(current) + Number(change); if (after < 0) throw new BusinessRuleError("สต็อกไม่เพียงพอ"); return after; }

export async function receiveStock(body, actor) {
  if (!body.medicineId || Number(body.quantityReceived) <= 0) throw new ValidationError("จำนวนรับเข้าต้องมากกว่า 0");
  const now = nowIso(); const quantity = Number(body.quantityReceived);
  const lot = await stockLotRepository.create({ lotId: uuid(), status: "active", ...body, quantityReceived: quantity, quantityRemaining: quantity, receivedDate: body.receivedDate || now.slice(0, 10), createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor });
  await stockMovementRepository.create({ movementId: uuid(), medicineId: body.medicineId, lotId: lot.lotId, type: "receive", quantity, balanceBefore: 0, balanceAfter: quantity, unitCost: body.unitCost || 0, referenceType: "stock_receive", referenceId: lot.lotId, reason: body.reason || "รับยาเข้าคลัง", createdBy: actor, createdAt: now }); return lot;
}

export async function adjustStock(body, actor) {
  if (!body.lotId || !body.reason || Number(body.quantity) === 0) throw new ValidationError("กรุณาระบุ Lot จำนวน และเหตุผล"); const lot = await stockLotRepository.get(body.lotId);
  const before = Number(lot.quantityRemaining); const after = calculateAdjustedBalance(before, body.quantity); const type = Number(body.quantity) > 0 ? "adjust_in" : "adjust_out";
  await stockLotRepository.update(body.lotId, { quantityRemaining: after, updatedAt: nowIso(), updatedBy: actor }, body.updatedAt || lot.updatedAt);
  return stockMovementRepository.create({ movementId: uuid(), medicineId: lot.medicineId, lotId: lot.lotId, type, quantity: Math.abs(Number(body.quantity)), balanceBefore: before, balanceAfter: after, referenceType: "adjustment", referenceId: body.idempotencyKey || uuid(), reason: body.reason, createdBy: actor, createdAt: nowIso() });
}

export async function dispensePrescription(id, body, actor) {
  const prescription = await repos.Prescriptions.get(id); if (prescription.status === "dispensed") throw new ConflictError("ใบสั่งยานี้ถูกจ่ายแล้ว");
  const previous = await stockMovementRepository.list({ referenceId: id }); if (previous.length) throw new ConflictError("คำขอจ่ายยาซ้ำ");
  const items = await repos.PrescriptionItems.list({ prescriptionId: id }); const lots = await stockLotRepository.list(); const updates = [];
  for (const item of items) {
    let remaining = Number(item.quantity); const eligible = lots.filter((lot) => lot.medicineId === item.medicineId && Number(lot.quantityRemaining) > 0 && new Date(lot.expiryDate) > new Date()).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    if (eligible.reduce((sum, lot) => sum + Number(lot.quantityRemaining), 0) < remaining) throw new BusinessRuleError(`สต็อก ${item.medicineNameSnapshot} ไม่เพียงพอ`);
    for (const lot of eligible) { if (!remaining) break; const before = Number(lot.quantityRemaining); const used = Math.min(before, remaining); remaining -= used; updates.push({ lot, before, after: before - used, used, item }); }
  }
  for (const entry of updates) { await stockLotRepository.update(entry.lot.lotId, { quantityRemaining: entry.after, updatedAt: nowIso(), updatedBy: actor }, entry.lot.updatedAt); await stockMovementRepository.create({ movementId: uuid(), medicineId: entry.item.medicineId, lotId: entry.lot.lotId, type: "dispense", quantity: entry.used, balanceBefore: entry.before, balanceAfter: entry.after, referenceType: "prescription", referenceId: id, reason: "จ่ายยาตามใบสั่ง", createdBy: actor, createdAt: nowIso() }); }
  await repos.Prescriptions.update(id, { status: "dispensed", dispensedAt: nowIso(), dispensedBy: actor, updatedAt: nowIso(), updatedBy: actor }, prescription.updatedAt);
  if (prescription.queueId) await updateStatus("Queues", prescription.queueId, "queue", "waiting_payment", actor); return { prescriptionId: id, status: "dispensed", movements: updates.length };
}

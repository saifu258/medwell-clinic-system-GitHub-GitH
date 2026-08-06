import { patientRepository } from "../repositories/patientRepository.js";
import { ConflictError, ValidationError } from "../errors/AppError.js";
import { generateCode, nowIso, sanitizeText, uuid, validateCitizenId } from "../utils/helpers.js";

const clean = (input) => Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? sanitizeText(value) : value]));
export async function listPatients(query = {}) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  let rows = await patientRepository.list();
  if (query.search?.length >= 2) { const term = query.search.toLowerCase(); rows = rows.filter((p) => [p.hn, p.firstName, p.lastName, p.citizenId, p.phone].some((value) => String(value).toLowerCase().includes(term))); }
  if (query.status) rows = rows.filter((p) => String(p.active) === query.status);
  const total = rows.length; return { items: rows.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
export async function createPatient(input, actor) {
  if (!input.firstName || !input.lastName) throw new ValidationError("กรุณากรอกชื่อและนามสกุล"); validateCitizenId(input.citizenId);
  const existing = await patientRepository.list();
  if (input.citizenId && existing.some((p) => p.citizenId === input.citizenId && String(p.active) !== "false")) throw new ConflictError("เลขบัตรประชาชนนี้มีอยู่แล้ว");
  const now = nowIso(); return patientRepository.create({ patientId: uuid(), hn: generateCode("HN"), ...clean(input), active: String(input.active ?? true), createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor });
}
export async function updatePatient(id, input, actor) {
  validateCitizenId(input.citizenId); const existing = await patientRepository.list();
  if (input.citizenId && existing.some((p) => p.patientId !== id && p.citizenId === input.citizenId && String(p.active) !== "false")) throw new ConflictError("เลขบัตรประชาชนนี้มีอยู่แล้ว");
  return patientRepository.update(id, { ...clean(input), updatedAt: nowIso(), updatedBy: actor }, input.updatedAt);
}

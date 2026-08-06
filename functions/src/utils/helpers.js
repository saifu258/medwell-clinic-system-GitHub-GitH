import crypto from "node:crypto";
import { STATUS_TRANSITIONS } from "../config/constants.js";
import { ValidationError, ConflictError } from "../errors/AppError.js";

export const nowIso = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();
export const parseJson = (value, fallback = []) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
export const maskCitizenId = (value = "") => value.length === 13 ? `${value[0]}-${value.slice(1, 5)}-xxxxx-xx-${value[12]}` : value;
export const maskPhone = (value = "") => value.length >= 7 ? `${value.slice(0, 3)}-xxx-${value.slice(-4)}` : value;
export function thaiDate(value) { return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)); }
export function generateCode(prefix, date = new Date()) { const y = new Intl.DateTimeFormat("en", { year: "2-digit", timeZone: "Asia/Bangkok" }).format(date); return `${prefix}-${y}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`; }
export function assertTransition(type, from, to) { if (to === "cancelled") return true; if (!STATUS_TRANSITIONS[type]?.[from]?.includes(to)) throw new ConflictError(`ไม่สามารถเปลี่ยนสถานะ ${from} เป็น ${to}`); return true; }
export function validateCitizenId(value) { if (!value) return true; if (!/^\d{13}$/.test(value)) throw new ValidationError("เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"); let sum = 0; for (let i = 0; i < 12; i += 1) sum += Number(value[i]) * (13 - i); if ((11 - (sum % 11)) % 10 !== Number(value[12])) throw new ValidationError("เลขบัตรประชาชนไม่ถูกต้อง"); return true; }
export const sanitizeText = (value, max = 1000) => String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);

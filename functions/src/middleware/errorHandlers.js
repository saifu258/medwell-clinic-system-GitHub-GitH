import crypto from "node:crypto";
import { AppError } from "../errors/AppError.js";
export function notFoundHandler(_req, _res, next) { next(new AppError("ไม่พบ API ที่เรียก", 404, "ROUTE_NOT_FOUND")); }
export function errorHandler(error, _req, res, _next) {
  const errorId = crypto.randomUUID(); const known = error instanceof AppError;
  if (!known) console.error("Unhandled API error", { errorId, name: error?.name, message: error?.message });
  res.status(known ? error.status : 500).json({ success: false, error: { code: known ? error.code : "INTERNAL_ERROR", message: known ? error.message : `ระบบขัดข้อง กรุณาแจ้งรหัส ${errorId}`, details: known ? error.details : null, errorId }, timestamp: new Date().toISOString() });
}

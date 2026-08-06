export class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", details = null) {
    super(message); this.name = this.constructor.name; this.status = status; this.code = code; this.details = details;
  }
}
export class AuthenticationError extends AppError { constructor(message = "กรุณาเข้าสู่ระบบ") { super(message, 401, "UNAUTHENTICATED"); } }
export class AuthorizationError extends AppError { constructor(message = "คุณไม่มีสิทธิ์ดำเนินการ") { super(message, 403, "FORBIDDEN"); } }
export class ValidationError extends AppError { constructor(message = "ข้อมูลไม่ถูกต้อง", details = null) { super(message, 400, "VALIDATION_ERROR", details); } }
export class NotFoundError extends AppError { constructor(message = "ไม่พบข้อมูล") { super(message, 404, "NOT_FOUND"); } }
export class ConflictError extends AppError { constructor(message = "ข้อมูลขัดแย้งกับรายการปัจจุบัน") { super(message, 409, "CONFLICT"); } }
export class BusinessRuleError extends AppError { constructor(message) { super(message, 422, "BUSINESS_RULE_ERROR"); } }
export class ExternalServiceError extends AppError { constructor(message = "บริการภายนอกขัดข้อง") { super(message, 502, "EXTERNAL_SERVICE_ERROR"); } }

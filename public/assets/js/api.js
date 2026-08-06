import { auth, logout, refreshIdToken } from "./auth.js";
import { SUPABASE_API_URL } from "./supabase-config.js";

const TIMEOUT = 15_000;
const apiUrl = (path) => {
  if (!SUPABASE_API_URL) throw new Error("ยังไม่ได้เชื่อมต่อโปรเจกต์ Supabase สำหรับ MEDWELL");
  const suffix = path.startsWith("/api") ? path.slice(4) : path;
  return `${SUPABASE_API_URL}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
};
async function request(method, path, body, options = {}, retry = true) {
  const user = auth.currentUser; if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.timeout || TIMEOUT);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const token = await user.getIdToken(Boolean(options.freshToken));
    const response = await fetch(apiUrl(path), { method, signal: controller.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const payload = await response.json().catch(() => ({ success: false, error: { message: "รูปแบบคำตอบจากระบบไม่ถูกต้อง" } }));
    const retryAllowed = ["GET", "HEAD"].includes(method) || Boolean(options.idempotencyKey || options.idempotent);
    if (response.status === 401 && retry && retryAllowed) { await refreshIdToken(); return request(method, path, body, { ...options, freshToken: false }, false); }
    if (response.status === 401 || (response.status === 403 && ["ACCOUNT_DISABLED", "PROFILE_NOT_FOUND"].includes(payload.error?.code))) await logout();
    if (!response.ok || !payload.success) { const error = new Error(payload.error?.message || "ไม่สามารถดำเนินการได้"); error.code = payload.error?.code; error.status = response.status; error.details = payload.error?.details; error.requestId = response.headers.get("x-request-id"); throw error; }
    return payload.data;
  } catch (error) { if (error.name === "AbortError") throw new Error(options.signal?.aborted ? "ยกเลิกคำขอแล้ว" : "ระบบใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่"); throw error; } finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); }
}
export const apiGet = (path, options) => request("GET", path, undefined, options);
export const apiPost = (path, body, options) => request("POST", path, body, options);
export const apiPut = (path, body, options) => request("PUT", path, body, options);
export const apiDelete = (path, body, options) => request("DELETE", path, body, options);

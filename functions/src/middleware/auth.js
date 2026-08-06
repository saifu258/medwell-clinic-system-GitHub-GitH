import { adminAuth } from "../config/firebaseAdmin.js";
import { repository } from "../repositories/baseRepository.js";
import { AuthenticationError, AuthorizationError } from "../errors/AppError.js";
import { parseJson } from "../utils/helpers.js";

const users = repository("Users");
export async function authenticateFirebaseToken(req, _res, next) {
  try {
    const match = req.get("authorization")?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new AuthenticationError();
    req.auth = await adminAuth.verifyIdToken(match[1]); next();
  } catch (error) { next(error instanceof AuthenticationError ? error : new AuthenticationError("Session ไม่ถูกต้องหรือหมดอายุ")); }
}
export async function loadUserProfile(req, _res, next) {
  try {
    const profile = await users.get(req.auth.uid);
    req.user = { ...profile, uid: req.auth.uid, roles: parseJson(profile.rolesJson), permissions: parseJson(profile.permissionsJson) };
    next();
  } catch { next(new AuthorizationError("ไม่พบบัญชีผู้ใช้ในระบบคลินิก")); }
}
export function requireActiveUser(req, _res, next) { if (String(req.user.active).toLowerCase() !== "true") return next(new AuthorizationError("บัญชีถูกระงับการใช้งาน")); next(); }

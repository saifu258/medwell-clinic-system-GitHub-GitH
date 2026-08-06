import { repository } from "../repositories/baseRepository.js";
import { nowIso, uuid } from "../utils/helpers.js";

const logs = repository("AuditLogs");
export async function writeAudit(req, { action, module, recordType = "", recordId = "", description = "", success = true, errorCode = "" }) {
  const user = req.user || {};
  return logs.create({ logId: uuid(), timestamp: nowIso(), userUid: user.uid || "anonymous", userName: user.displayName || "", role: JSON.stringify(user.roles || []), action, module, recordType, recordId, description: String(description).slice(0, 500), ipAddress: req.ip || "", userAgent: String(req.get?.("user-agent") || "").slice(0, 300), success: String(success), errorCode });
}

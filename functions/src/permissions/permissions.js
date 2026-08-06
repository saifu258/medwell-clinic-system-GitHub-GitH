import { ROLE_PERMISSIONS } from "../config/constants.js";
export function hasPermission(user, permission) {
  const direct = user.permissions || [];
  const inherited = (user.roles || []).flatMap((role) => ROLE_PERMISSIONS[role] || []);
  return inherited.includes("*") || inherited.includes(permission) || direct.includes(permission);
}

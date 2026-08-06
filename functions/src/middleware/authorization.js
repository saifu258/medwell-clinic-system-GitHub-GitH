import { AuthorizationError } from "../errors/AppError.js";
import { hasPermission } from "../permissions/permissions.js";
export const requireRole = (...roles) => (req, _res, next) => req.user.roles.some((role) => roles.includes(role) || role === "admin") ? next() : next(new AuthorizationError());
export const requirePermission = (permission) => (req, _res, next) => hasPermission(req.user, permission) ? next() : next(new AuthorizationError());

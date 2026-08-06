import { ValidationError } from "../errors/AppError.js";
export const validateRequest = (validator) => (req, _res, next) => { try { validator(req.body, req); next(); } catch (error) { next(error instanceof ValidationError ? error : new ValidationError(error.message)); } };

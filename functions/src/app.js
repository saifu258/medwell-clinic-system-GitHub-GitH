import express from "express";
import cors from "cors";
import helmet from "helmet";
import { apiRouter } from "./routes/apiRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandlers.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:5000").split(",").map((value) => value.trim());
app.use(cors({ origin(origin, callback) { callback(null, !origin || origins.includes(origin)); }, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

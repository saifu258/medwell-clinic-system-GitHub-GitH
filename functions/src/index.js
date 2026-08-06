import { onRequest } from "firebase-functions/v2/https";
import { app } from "./app.js";
import { REGION } from "./config/constants.js";
export const api = onRequest({ region: REGION, timeoutSeconds: 60, memory: "512MiB", maxInstances: 10 }, app);

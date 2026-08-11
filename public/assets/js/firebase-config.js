import { MEDWELL_RUNTIME_CONFIG } from "./runtime-config.js";

const config = MEDWELL_RUNTIME_CONFIG.firebase;
if (!config || config.projectId !== MEDWELL_RUNTIME_CONFIG.firebaseHostingProjectId) {
  throw new Error("Firebase runtime configuration identity mismatch");
}
if (config.authDomain !== `${config.projectId}.firebaseapp.com` && config.authDomain !== `${config.projectId}.web.app`) {
  throw new Error("Firebase runtime auth domain mismatch");
}

// Firebase Web configuration is public client configuration, never an Admin credential.
export const firebaseConfig = Object.freeze({ ...config });

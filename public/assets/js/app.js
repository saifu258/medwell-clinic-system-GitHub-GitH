import { authReady, auth, isGoogleLoginInProgress, logout, onSessionChange } from "./auth.js";
import { store } from "./store.js";
import { startRouter, navigate, setRoute } from "./router.js?v=20260802-google-auth-1";
import { clearSessionCache, resolveSessionState } from "./session.js";

let handlersInitialized = false;
function initializeGlobalHandlers() {
  if (handlersInitialized) return;
  handlersInitialized = true;
  window.addEventListener("error", (event) => console.error("UI error", event.error?.name, event.error?.message));
  window.addEventListener("unhandledrejection", (event) => console.error("Unhandled promise", event.reason?.name, event.reason?.message));
}

let applicationReady = false;
let bootstrapPromise = null;
function renderStartupError(error) {
  const id = crypto.randomUUID().slice(0, 8).toUpperCase();
  document.querySelector("#app").innerHTML = `<main class="login-shell"><section class="login-panel"><div class="brand"><div class="brand-mark">M</div><div class="brand-copy"><strong>MEDWELL</strong><span>CLINIC SYSTEM</span></div></div><h1>ไม่สามารถเตรียมระบบได้</h1><p>${String(error.message || "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่")}</p><p class="subtle">Error ID: ${id}</p><button class="btn btn-primary" id="retry-bootstrap" type="button">ลองใหม่</button></section></main>`;
  document.querySelector("#retry-bootstrap").addEventListener("click", () => bootstrap());
}

async function performBootstrap() {
  initializeGlobalHandlers();
  const user = await authReady;
  if (user) await resolveSessionState(user);
  startRouter();
  applicationReady = true;
  onSessionChange(async (nextUser) => {
    if (!applicationReady) return;
    if (!nextUser) { clearSessionCache(); setRoute("login"); return; }
    if (isGoogleLoginInProgress()) return;
    try { const result = await resolveSessionState(nextUser); setRoute(result.state === "NEEDS_ROLE_SELECTION" ? "select-role" : "dashboard"); await navigate({ force: true }); }
    catch (error) {
      if (["ACCOUNT_DISABLED", "PROFILE_NOT_FOUND", "ACCESS_DENIED"].includes(error.code)) await logout();
      else renderStartupError(error);
    }
  });
}

export function bootstrap() {
  if (!bootstrapPromise) bootstrapPromise = performBootstrap().catch((error) => { renderStartupError(error); bootstrapPromise = null; });
  return bootstrapPromise;
}

let inactivityTimer;
function resetInactivity() { clearTimeout(inactivityTimer); if (auth.currentUser) inactivityTimer = setTimeout(() => logout(), 30 * 60 * 1000); }
const activityEvents = ["click", "keydown", "pointerdown", "touchstart"];
activityEvents.forEach((event) => document.addEventListener(event, resetInactivity, { passive: true }));
bootstrap();

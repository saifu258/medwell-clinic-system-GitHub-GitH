import { auth } from "./auth.js";
import { store } from "./store.js";
import { can, isAdmin } from "./permissions.js";
import { renderShell, setActiveNav } from "./components/layout.js";
import { toast } from "./notifications.js";

import * as loginPage from "./pages/loginPage.js";
import * as selectRolePage from "./pages/selectRolePage.js?v=20260802-role-fix-1";
import * as dashboardPage from "./pages/dashboardPage.js";
import * as patientsPage from "./pages/patientsPage.js?v=20260802-patient-fix-3";
import * as patientFormPage from "./pages/patientFormPage.js";
import * as patientDetailPage from "./pages/patientDetailPage.js?v=20260802-patient-fix-3";
import * as appointmentsPage from "./pages/appointmentsPage.js?v=20260802-appointment-fix-1";
import * as queuePage from "./pages/queuePage.js";
import * as screeningPage from "./pages/screeningPage.js";
import * as doctorWorkspacePage from "./pages/doctorWorkspacePage.js";
import * as prescriptionsPage from "./pages/prescriptionsPage.js";
import * as pharmacyPage from "./pages/pharmacyPage.js";
import * as medicinesPage from "./pages/medicinesPage.js";
import * as inventoryPage from "./pages/inventoryPage.js";
import * as servicesPage from "./pages/servicesPage.js";
import * as billingPage from "./pages/billingPage.js";
import * as reportsPage from "./pages/reportsPage.js";
import * as usersPage from "./pages/usersPage.js";
import * as settingsPage from "./pages/settingsPage.js";
import * as auditLogsPage from "./pages/auditLogsPage.js";
import * as backupPage from "./pages/backupPage.js";
import * as notFoundPage from "./pages/notFoundPage.js";

const routes = [
  [/^login$/, loginPage, null], [/^select-role$/, selectRolePage, null], [/^dashboard$/, dashboardPage, null], [/^patients$/, patientsPage, "patients.read"], [/^patients\/new$/, patientFormPage, "patients.write"],
  [/^patients\/([^/]+)\/edit$/, patientFormPage, "patients.write", ["id"]], [/^patients\/([^/]+)$/, patientDetailPage, "patients.read", ["id"]],
  [/^appointments$/, appointmentsPage, "appointments.read"], [/^queue$/, queuePage, "queues.read"], [/^screening$/, screeningPage, "screenings.write"], [/^doctor$/, doctorWorkspacePage, "visits.write"],
  [/^prescriptions$/, prescriptionsPage, "prescriptions.write"], [/^pharmacy$/, pharmacyPage, "dispense.write"], [/^medicines$/, medicinesPage, "medicines.read"], [/^inventory$/, inventoryPage, "inventory.read"],
  [/^services$/, servicesPage, "admin"], [/^billing$/, billingPage, "billing.read"], [/^reports$/, reportsPage, "admin"], [/^users$/, usersPage, "admin"], [/^settings$/, settingsPage, "admin"], [/^audit-logs$/, auditLogsPage, "admin"], [/^backup$/, backupPage, "admin"]
];
let rendering = false;
let navigationPending = false;
let routerStarted = false;
let activePage = null;
let activeRoute = null;

const routeFromLocation = () => location.hash.replace(/^#\/?/, "") || (store.get().profile ? "dashboard" : store.get().authState === "NEEDS_ROLE_SELECTION" ? "select-role" : "login");
export function setRoute(target) {
  const nextHash = `#/${String(target).replace(/^#\/?/, "")}`;
  if (location.hash !== nextHash) location.hash = nextHash;
  else if (!rendering) navigate({ force: true });
}

async function renderRoute(force = false) {
    const fullRoute = routeFromLocation();
    const raw = fullRoute.split("?")[0];
    const authenticated = Boolean(auth.currentUser && store.get().profile);
    const selectingRole = Boolean(auth.currentUser && store.get().authState === "NEEDS_ROLE_SELECTION" && !store.get().profile);
    if (selectingRole && raw !== "select-role") { setRoute("select-role"); return; }
    if (!authenticated && !selectingRole && raw !== "login") { setRoute("login"); return; }
    if (authenticated && raw === "login") { setRoute("dashboard"); return; }
    if (authenticated && raw === "select-role") { setRoute("dashboard"); return; }
    if (!force && fullRoute === activeRoute) return;
    const match = routes.map((route) => ({ route, match: raw.match(route[0]) })).find((item) => item.match);
    const [, page = notFoundPage, permission, names = []] = match?.route || [];
    if (permission && !(permission === "admin" ? isAdmin() : can(permission))) { toast("คุณไม่มีสิทธิ์เปิดหน้านี้", "error"); setRoute("dashboard"); return; }
    if (activePage?.cleanup) await activePage.cleanup();
    activePage = page;
    activeRoute = fullRoute;
    if (raw === "login" || raw === "select-role") { await page.render(document.querySelector("#app"), {}); return; }
    if (!document.querySelector("#page-content")) renderShell();
    const params = Object.fromEntries(names.map((name, index) => [name, match.match[index + 1]])); setActiveNav(raw.split("/")[0]); store.set({ route: raw });
    const root = document.querySelector("#page-content"); try { await page.render(root, params); } catch (error) { root.innerHTML = `<section class="card error-state"><h2>เกิดข้อผิดพลาดในการแสดงหน้า</h2><p>${String(error.message || "ไม่ทราบสาเหตุ")}</p><a class="btn btn-primary" href="#/dashboard">กลับ Dashboard</a></section>`; }
    window.lucide?.createIcons(); window.scrollTo({ top: 0, behavior: "instant" });
}

export async function navigate({ force = false } = {}) {
  if (rendering) { navigationPending = true; return; }
  rendering = true;
  try {
    do {
      navigationPending = false;
      await renderRoute(force);
      force = false;
      if (activeRoute !== routeFromLocation()) navigationPending = true;
    } while (navigationPending);
  } finally { rendering = false; }
}
export function startRouter() { if (routerStarted) return; routerStarted = true; window.addEventListener("hashchange", () => navigate()); navigate(); }

import { store } from "./store.js";
const rolePermissions = {
  admin: ["*"],
  receptionist: ["patients.read", "patients.write", "appointments.read", "appointments.write", "queues.read", "queues.write"],
  nurse: ["patients.read", "queues.read", "screenings.read", "screenings.write"],
  doctor: ["patients.read", "queues.read", "screenings.read", "records.read", "visits.write", "prescriptions.read", "prescriptions.write", "medicines.read"],
  pharmacist: ["patients.read", "prescriptions.read", "medicines.read", "inventory.read", "inventory.receive", "dispense.write"],
  cashier: ["patients.read", "services.read", "billing.read", "billing.write", "payments.write"]
};
export function can(permission) { const roles = store.get().profile?.roles || []; const custom = store.get().profile?.permissions || []; return custom.includes("*") || custom.includes(permission) || roles.some((role) => rolePermissions[role]?.includes("*") || rolePermissions[role]?.includes(permission)); }
export const isAdmin = () => (store.get().profile?.roles || []).includes("admin");

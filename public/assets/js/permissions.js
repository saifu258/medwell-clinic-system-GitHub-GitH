import { store } from "./store.js";
const rolePermissions = {
  admin: ["*"],
  // TARGET ROLES
  physiotherapist: ["patients.read", "queues.read", "queues.write", "screenings.read", "screenings.write", "records.read", "visits.write", "appointments.read", "appointments.write"],
  thai_traditional_practitioner: ["patients.read", "queues.read", "queues.write", "screenings.read", "screenings.write", "records.read", "visits.write", "appointments.read", "appointments.write"],
  clinic_assistant: ["patients.read", "patients.write", "appointments.read", "appointments.write", "queues.read", "queues.write", "screenings.read", "screenings.write", "records.read", "visits.write", "billing.read", "billing.write", "payments.write", "services.read", "medicines.read", "inventory.read", "inventory.receive"],

  // TEMPORARY MIGRATION COMPATIBILITY ONLY: Alias legacy operational roles to clinic_assistant.
  receptionist: ["patients.read", "patients.write", "appointments.read", "appointments.write", "queues.read", "queues.write", "screenings.read", "screenings.write", "records.read", "visits.write", "billing.read", "billing.write", "payments.write", "services.read", "medicines.read", "inventory.read", "inventory.receive"],
  nurse: ["patients.read", "patients.write", "appointments.read", "appointments.write", "queues.read", "queues.write", "screenings.read", "screenings.write", "records.read", "visits.write", "billing.read", "billing.write", "payments.write", "services.read", "medicines.read", "inventory.read", "inventory.receive"],
  cashier: ["patients.read", "patients.write", "appointments.read", "appointments.write", "queues.read", "queues.write", "screenings.read", "screenings.write", "records.read", "visits.write", "billing.read", "billing.write", "payments.write", "services.read", "medicines.read", "inventory.read", "inventory.receive"],

  // LEGACY ROLES BLOCKED: Treat doctor and pharmacist effectively as pending_role_review
  doctor: [],
  pharmacist: [],
  pending_role_review: []
};
export function can(permission) { const roles = store.get().profile?.roles || []; const custom = store.get().profile?.permissions || []; return custom.includes("*") || custom.includes(permission) || roles.some((role) => rolePermissions[role]?.includes("*") || rolePermissions[role]?.includes(permission)); }
export const isAdmin = () => (store.get().profile?.roles || []).includes("admin");
export const isPendingRoleReview = () => store.get().profile?.pendingRoleReview || (store.get().profile?.roles || []).some(r => ["pending_role_review", "doctor", "pharmacist"].includes(r));

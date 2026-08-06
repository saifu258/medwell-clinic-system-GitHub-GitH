# CURRENT SYSTEM AUDIT

## 1. Technology Stack
- **Frontend**: Vanilla JavaScript Single Page Application (SPA).
- **Backend/API**: Supabase Edge Functions (Deno).
- **Database**: PostgreSQL (hosted on Supabase).
- **Authentication**: Firebase Authentication.
- **Hosting**: Firebase Hosting.
- **Testing**: Playwright for E2E testing, Node `node:test` for unit testing.

## 2. Architecture & Design Patterns
- **Frontend Architecture**:
  - Hash-based routing (`router.js`).
  - Permissions control (`permissions.js`).
  - View rendering with HTML strings and event delegation.
  - No service worker currently in place.
- **Backend Architecture**:
  - A monolithic Edge Function `api/index.ts` serving endpoints like `/health`, `/auth/profile`, `/auth/select-role`, etc.
  - Strict validation of Firebase JWT in Edge API.
  - `helpers.ts` handles response formatting, role checks, and error handling.
- **Database Architecture**:
  - Row Level Security (RLS) enabled on all public tables, restricting direct client access (clients must go through Edge Functions).
  - Business logic (payment recording, stock dispensing) is heavily reliant on atomic PostgreSQL RPC functions (`medwell_record_payment`, `medwell_dispense_prescription`, etc.) for consistency.

## 3. Current User Roles
Roles currently active in code and UI (`permissions.js`, `helpers.ts`):
- `admin`
- `receptionist`
- `nurse`
- `doctor`
- `pharmacist`
- `cashier`

## 4. Current Entities & Modules
The current database schemas and UI focus on:
- **Patients**: Registration and demographics.
- **Queues/Appointments**: Standard visit tracking.
- **Screening**: Vitals and basic history.
- **Visits (Doctor)**: Present illness, diagnosis, treatment plan.
- **Pharmacy & Inventory**: Medicines, stock lots (FEFO), prescriptions.
- **Billing & Payment**: Invoices, services, idempotency on payments.

## 5. Security Posture
- Firebase JWT token validation ensures valid Google sign-in.
- RLS blocks direct Postgres access; only the `service_role` edge function executes queries.
- Idempotency keys used for payments.

## 6. Real-Time & Offline Capabilities
- Real-time updates: Currently not extensively used or absent.
- Offline capabilities: Currently minimal or non-existent (No Service Worker, single-flight token refresh but no persistent offline drafts).

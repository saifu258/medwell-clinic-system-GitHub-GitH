# Implementation Plan: MEDWELL CLINIC SYSTEM Upgrade

## User Review Required
> [!WARNING]
> **Role Deletion**: We are replacing the old roles (Receptionist, Nurse, Doctor, Pharmacist, Cashier) with the new roles: `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`. (Admin remains). 
> This will mean users assigned to old roles will need to select new roles upon their next login, or an admin will need to re-assign them. Is it acceptable to forcefully prompt them to reselect roles, or do you want an automatic migration of old roles to new roles (e.g. Nurse -> clinic_assistant)?

> [!CAUTION]
> **Workflow Changes**: The workflow completely changes the order of operations. Pharmacy and Dispense steps are essentially being bypassed/modified heavily in favor of a Treatment Program -> Next Appointment -> Billing flow. This will require massive changes to the frontend views. Existing uncompleted queues might break during migration. We plan to mark all pending queues as 'completed' or 'cancelled' before the database migration to prevent inconsistent states. Please confirm this approach.

## Open Questions
1. **~~Medical Certificate Form Layout~~**: *(Resolved)* Thank you for the OneDrive link! I have successfully extracted the exact layout, text, and structure for the "ใบรับรองความเจ็บป่วย แพทย์แผนไทย" (including the clinic branding, 4 practitioner license checkboxes, the dotted line fields for symptoms, medical opinion, rest period, and the dual signature area at the bottom right). I will replicate this exactly in the PDF generator and the UI.
2. **Translation API Keys**: For Google Cloud Translation and Gemini API, do you already have API keys? We will provide the admin UI for you to enter them, but they need to be available for end-to-end testing.
3. **Data Backup**: The specification asks to back up existing schemas and data before migration. Is there an automated Supabase backup schedule in place, or would you like me to create an SQL dump locally in a file?

## Proposed Changes

---

### Phase 1: Roles, Database & Security Updates

#### [MODIFY] supabase/functions/api/helpers.ts
- Update `permissions` map with new roles (`physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`).
- Modify `GOOGLE_SELF_SELECT_ROLES`.
- Update `hasPermission` logic to reflect new role structure.

#### [MODIFY] public/assets/js/permissions.js
- Sync frontend role permission arrays.
- Remove obsolete roles from the frontend definitions.

#### [NEW] supabase/migrations/20260806000000_upgrade_schema.sql
- Create tables: `treatment_programs`, `treatment_templates`, `treatment_courses`, `course_usage`.
- Create tables: `medical_certificates`, `medical_certificate_counters`, `medical_certificate_number_reservations`, `standard_certificate_texts`.
- Create tables: `icd10_codes`, `icd10_imports`.
- Create real-time tables: `notifications`, `presence_sessions`, `export_jobs`, `offline_sync_metadata`, `conflict_histories`.
- Implement `HN` counter and YY+6 sequences for receipts and medical certificates via Postgres sequence logic and locking functions.
- Update `queues` and `visits` tables to accommodate the new status enums (e.g., "รอคัดกรอง", "รอสรุปและชำระเงิน").

#### [MODIFY] supabase/functions/api/index.ts
- Expose new endpoints for ICD-10 CSV import, medical certificate PDF generation/retrieval, and export job processing.
- Add real-time endpoints or integrate Supabase Realtime Channels.

---

### Phase 2: Core Clinic Workflow & Frontend UI

#### [MODIFY] public/assets/js/router.js
- Remove obsolete routes (`/pharmacy`, `/doctor`, etc.).
- Add new routes (`/certificates`, `/certificates/new`, `/icd10-management`).

#### [MODIFY] public/assets/js/pages/screeningPage.js
- Update screening fields to match requirements (Pain score, BMI auto-calculation, Chief complaint, etc.).

#### [NEW] public/assets/js/pages/clinicalAssessmentPage.js
- A unified form for Physiotherapists and Thai Traditional Practitioners replacing the doctor workspace.
- Contains: CC, History, Pain assessment, PE, Assessment, Treatment plan, Selected programs, Next appointment.

#### [NEW] public/assets/js/pages/treatmentCoursesPage.js
- Manage treatment courses, deductions, and balance tracking.

---

### Phase 3: Medical Certificate Module & Translation

#### [NEW] public/assets/js/pages/medicalCertificatesPage.js
- List page with searching/filtering by status, language, date.

#### [NEW] public/assets/js/pages/medicalCertificateFormPage.js
- Live preview A4 editor, fetching patient and visit data automatically.
- Translation integration (calls to Edge API which wraps Google Cloud/Gemini APIs).
- Draft saving, status management, number reservation logic on open.

#### [NEW] supabase/functions/api/pdfGenerator.ts (or inside `index.ts`)
- Server-side PDF generation using a library (e.g., pdf-lib or puppeteer in Deno) to guarantee accurate A4 layout for downloading.

---

### Phase 4: Billing, Revisions, & Notifications

#### [MODIFY] public/assets/js/pages/billingPage.js
- Support editable quantities and discounts pre-payment.
- Support partial payments and split methods.
- Block payment if case-specific treatment lacks price.

#### [NEW] public/assets/js/pages/invoiceRevisionPage.js
- Allow post-payment invoice edits, track differences, log audit trails.

#### [NEW] public/assets/js/components/notifications.js
- Toast manager and Notification Bell drop-down.
- Setup Supabase Realtime listeners to capture and display global events (action-required, midnight due date checks).
- Sound queue manager for audio notifications.

---

### Phase 5: Autosave & Offline Capability

#### [NEW] public/assets/js/offlineStorage.js
- Wrapper around IndexedDB (e.g., using `idb` library) to store local drafts with AES encryption.
- Background sync loop running every 30 seconds.

#### [NEW] public/assets/js/components/conflictResolutionModal.js
- Side-by-side comparison UI for when server and local records diverge.

---

## Verification Plan

### Automated Tests
- Playwright E2E tests covering the 4 active roles, navigating the entire workflow from registration to billing completion.
- Edge API unit tests testing role validation and atomic ID generation.
- Deno node:test executing logic for the YY+6 format and idempotency keys.

### Manual Verification
- Deploy to a staging Firebase/Supabase environment.
- Log in as each role to verify UI constraints.
- Trigger offline mode via Chrome DevTools to verify IndexedDB caching and sync resolution.
- Verify Thai rendering in generated PDFs and CSV exports.

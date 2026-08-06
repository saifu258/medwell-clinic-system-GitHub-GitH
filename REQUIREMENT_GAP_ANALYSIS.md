# REQUIREMENT GAP ANALYSIS

## 1. User Roles
- **Current**: Admin, Receptionist, Nurse, Doctor, Pharmacist, Cashier.
- **Required**: Admin, Physiotherapist (นักกายภาพบำบัด), Thai Traditional Medicine Practitioner (แพทย์แผนไทย), Clinic Assistant (ผู้ช่วยคลินิก).
- **Gap**: All non-Admin old roles must be removed from the UI, API validation (`helpers.ts`), and RBAC configurations. The new roles must be integrated into Google sign-in flow and RBAC system.

## 2. Clinical Workflow & Statuses
- **Current**: Queues pass from screening -> doctor -> pharmacy -> cashier.
- **Required**: Registration -> Screening -> History & Physical Examination -> Treatment Program -> Next Appointment -> Summary & Billing -> Completion.
- **Gap**: Transition logic in the frontend and backend must be updated to support the new unified workflow, bypassing the pharmacy-centric model.

## 3. Clinical Assessment & Forms
- **Current**: Separate doctor visit form and nurse screening.
- **Required**: Shared clinical assessment form for PT and Thai Med (Chief complaint, History, Pain assessment, PE, Clinical assessment, Goals, Plan, Program selection, Outcome, Next appointment).
- **Gap**: A new comprehensive form structure must replace the existing doctor visit structure.

## 4. Treatment Programs & Courses
- **Current**: Basic services and medicines.
- **Required**: Standard treatment programs, case-specific treatments (blocking payment until priced), and Treatment Courses (tracking total sessions, remaining balance, retroactive editing).
- **Gap**: Missing `treatment_programs`, `treatment_templates`, `treatment_courses`, and `course_usage` tables and related business logic.

## 5. Billing & Payments
- **Current**: Invoice creation and payment recording.
- **Required**: Paid invoice editing (with difference calculation/refund tracking), split payments, partial payments on a single receipt, and custom receipt numbering (YY+6 sequence).
- **Gap**: Need logic for invoice revision (`invoice_revisions`), partial payment states, and atomic sequence generation for receipts (`receipt_counters`).

## 6. Patient HN Configuration
- **Current**: HN generation might be automatic but not strictly configured per spec.
- **Required**: HN Format `HN69/00001` with yearly reset, editable only by Admin with audit logs.
- **Gap**: Custom HN generation logic and editing capabilities need to be implemented.

## 7. Medical Certificate Module (Major Addition)
- **Current**: No medical certificate functionality.
- **Required**: Complete certificate module mirroring a specific Word layout, supporting Draft/Issued/Canceled states, custom YY+6 numbering (with gap reuse), ICD-10 linkage, translation via Google Cloud/Gemini API, and PDF generation.
- **Gap**: Entirely missing. Requires new tables (`medical_certificates`, `medical_certificate_counters`, `icd10_codes`, etc.), complex sequence generation, UI views, translation integration, and PDF creation logic.

## 8. ICD-10 Management
- **Current**: Basic `diagnosis_master` table.
- **Required**: Admin-only CSV import, duplicate handling, enabling/disabling, search ranking by relevance.
- **Gap**: Need CSV parsing, validation, and a robust management interface.

## 9. Real-Time Architecture & Notifications
- **Current**: No global notification center or presence.
- **Required**: Real-time notifications (export jobs, follow-ups, payments), multi-user presence (showing who is viewing/editing), and concurrent edit locking.
- **Gap**: Need to implement Supabase Realtime (Channels) for presence and Postgres triggers/channels for notifications and edit locks.

## 10. Autosave & Offline Storage
- **Current**: No autosave or offline draft storage.
- **Required**: 30-second autosave, offline IndexedDB storage (encrypted), conflict resolution UI, and 5-year expiry.
- **Gap**: Requires implementing complex client-side storage mechanisms and synchronization logic.

## 11. Data Exports
- **Current**: Minimal reporting.
- **Required**: Comprehensive CSV exports with BOM via background jobs.
- **Gap**: Need background processing (possibly Supabase Edge Functions triggered asynchronously or pg_cron) to handle large CSV generation.

# Phase 6: Clinical Documents Foundation — Audit & Findings

## 1. Database Schema Audit
- **Medical Certificates:** Completely absent. No tables for `medical_certificates` or `documents`.
- **Localization:** No `locale` or `language` columns in existing patient or visit tables.
- **Visit Records (`public.visits`):**
  - Contains `diagnosis` (text), `diagnosis_code` (text), `treatment_plan` (text), `doctor_note` (text).
  - Phase 3/4 introduced `visit_treatments` (structured), meaning `treatment_plan` is now legacy fallback.
- **Professional Profiles:**
  - `public.users` contains `uid`, `email`, `display_name`, `roles`, `permissions`, `active`, `phone`.
  - Missing: `professional_title_th`, `professional_title_en`, `license_number`, `signature_display_name`.
- **Clinic Settings:**
  - Currently contains `clinicNameTh`, `timezone`, `pageSize`, `expiryAlertDays`.
  - Missing: `clinicNameEn`, `address`, `phone`, `taxId`/`registrationNumber` for formal documents.
- **Receipts:**
  - `public.receipts` was added in Phase 5 with authoritative sequence numbers.

## 2. Frontend / Source Audit
- **Print Functionality:**
  - Uses basic `window.print()` in `billingPage.js` (for receipts), `reportsPage.js` (for data exports), and `patientDetailPage.js` (patient summary).
  - No modular template system. The receipt is built via an inline string template un-hiding a `#receipt` div.
- **Localization / i18n:**
  - Hardcoded Thai strings across the entire UI.
  - No translation dictionaries or language-switching mechanisms exist.
- **Target Roles:**
  - `physiotherapist`, `thai_traditional_practitioner`, `clinic_assistant`, `admin`.
  - The word `doctor` is still used in older schema variables (`doctor_uid`, `doctor_note`), but the target business roles explicitly avoid "doctor" for physical therapy/Thai med contexts.

## 3. Direction & Gaps for Phase 6
- **Medical Certificate Model:** Needs a dedicated table `medical_certificates` with snapshot fields, strict lifecycle (draft -> issued -> cancelled), and a high-water global counter (`MC-YYYYMM-XXXXXX`).
- **Professional Profiles:** Needs a `user_professional_profiles` table or additions to `users` to store titles, license numbers, and formal display names.
- **Localization Architecture:** Needs a simple, lightweight JS i18n module (e.g., `i18n/th.js`, `i18n/en.js`) with a `t(key)` function to drive the frontend, especially for printable document layouts and role names.
- **Document Rendering:** Needs a reusable template pattern (e.g., `documentTemplate.js`) separating the data layer, translated strings, and CSS layout from the business logic.
- **Security:** New Edge API endpoints for issuing certificates and RPCs (Security Definer) are required to ensure atomicity, idempotency, and sequence authority.

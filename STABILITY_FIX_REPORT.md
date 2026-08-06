# STABILITY FIX REPORT — MEDWELL CLINIC SYSTEM

## ไฟล์สำคัญที่แก้

- `public/assets/js/app.js`, `auth.js`, `session.js`, `api.js`, `router.js`, `store.js`
- `public/assets/js/pages/loginPage.js`, `queuePage.js`, `dashboardPage.js`, `patientsPage.js`, `patientDetailPage.js`, `patientFormPage.js`, `screeningPage.js`, `usersPage.js`, `auditLogsPage.js`
- `public/assets/js/formatters.js`, `public/index.html`, `firebase.json`
- `public/assets/js/permissions.js`, `components/layout.js`, `components/ui.js`
- `supabase/functions/api/index.ts`, `helpers.ts`, `helpers_test.ts`
- migrations: UTF-8 repair, payment queue completion และ atomic clinic workflows
- Playwright config/tests, README, environment example และรายงาน QA

## Lifecycle และ refresh-loop prevention

- Bootstrap เป็น single promise (`app.js:15,42-43`)
- Firebase app/auth listener ใช้ instance/listener กลางเพียงชุดเดียว
- Router ไม่เขียน hash เดิมโดยไม่จำเป็น, queue navigation ที่มาระหว่าง render และเรียก page cleanup ก่อน mount หน้าใหม่
- Queue polling เป็น recursive timeout ชุดเดียวทุก 20 วินาที มี `mounted`, `loading`, route guard, AbortController, cleanup และหยุดเมื่อ tab hidden (`queuePage.js:7,19,68,75`)
- Dashboard destroy Chart instance ก่อนสร้างใหม่
- Login เปลี่ยน route ใน SPA และไม่ reload document

## Auth/API recovery

- Firebase token refresh และ logout เป็น single-flight
- 401: force-refresh หนึ่งครั้ง, retry request หนึ่งครั้ง, logout ครั้งเดียวเมื่อยัง 401
- 403 แยก `FORBIDDEN` ออกจาก `ACCOUNT_DISABLED`/`PROFILE_NOT_FOUND`; ไม่ logout ผู้ใช้เพียงเพราะไม่มี permission
- Request มี timeout, external AbortSignal และข้อความ error; form ใช้ loading/finally ป้องกัน double submit

## Backend, transaction และข้อมูล

- Backend permission matrix อยู่ที่ `helpers.ts:25-33`; frontend matrix ตรงกัน
- Payment/Dispense idempotent และใช้ row locking; payment ปิด queue เมื่อ balance = 0
- Screening/Open Visit/Prescription/Stock receive/Invoice ใช้ security-definer RPC ที่ revoke จาก public/anon/authenticated และ grant เฉพาะ service_role
- `spO2`, nested patient name, roles, alerts และ occurredAt mapping ตรง schema
- วันธุรกิจ queue/visit/invoice ใช้ Asia/Bangkok ชัดเจน
- Audit เพิ่มใน patient, appointment/check-in, queue status, screening, visit, prescription, inventory, dispense, invoice, payment, users/settings และ backup ที่เกี่ยวข้อง
- Patient input ใช้ field whitelist, แปลง optional blank strings เป็น database `NULL`, ตรวจเลขบัตรซ้ำ/รูปแบบที่ API และไม่รับ audit/system fields จาก client
- Patient formatter รองรับ nullable citizen ID/phone และมี release query ป้องกัน module cache เก่าหลัง deploy

## Security/Performance

- Supabase Security Advisor: 0 findings
- Performance Advisor: เฉพาะ unused-index ระดับ INFO ในฐานข้อมูลใหม่; เก็บ foreign-key/query indexes ไว้เพื่อ workload จริง ดู [Supabase linter guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- RLS เปิดครบ public tables และไม่มี service credential ใน frontend
- Firebase Hosting มี CSP, X-Frame-Options DENY, nosniff, referrer/permissions policy

## Deploy ที่ดำเนินการ

- Supabase Edge Function `api` active version 9
- Firebase Hosting deploy สำเร็จที่ https://medwell-clinic-system.web.app

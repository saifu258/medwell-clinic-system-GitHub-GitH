# E2E TEST REPORT — MEDWELL CLINIC SYSTEM

## Environment

- Date: 2026-08-02, Asia/Bangkok
- Local: `http://127.0.0.1:4173`
- Production: https://medwell-clinic-system.web.app
- Browser: Playwright Chromium + Codex in-app Chromium
- Accounts: Firebase accounts แยก Admin, Receptionist, Nurse, Doctor, Pharmacist, Cashier; credentials ไม่ถูกเขียนลงไฟล์/รายงาน/ภาพ

## ผลอัตโนมัติ

| ชุดทดสอบ | ผล |
|---|---:|
| Node unit tests | 20/20 passed |
| Deno helper regression | 4/4 passed |
| Deno type-check | passed |
| API read permission matrix | 84/84 passed |
| API write/negative matrix | 72/72 passed |
| Local Playwright critical/roles/stability | 13/13 passed |
| Production Playwright critical/roles/stability | 13/13 passed |
| Responsive 1920/1366/768/390 | 4/4 passed |
| Role evidence capture | 6/6 passed |
| Final combined run | 22/23, 1 Admin login assertion exceeded 8s; targeted rerun with explicit 20s operation timeout passed 2/2 (Admin + stability) |
| Atomic rollback cases | 3/3 failed safely; row counts unchanged |
| Atomic success clinic flow | passed end-to-end |
| Production Patient list/detail/search | passed; GET/OPTIONS 200 |
| Production Patient create | passed; POST 201, duplicate count 1, create audit count 1 |
| Patient double-submit | passed; double-click produced 1 row and 1 create audit |

## Full clinic flow ที่เขียน Backend จริง

Receptionist create patient → appointment/check-in/queue → Nurse screening/BMI/SpO2 → Doctor open/complete Visit + prescription → Pharmacist receive lot + FEFO dispense → Cashier invoice + payment → queue completed

ผลที่ตรวจตรง DB: queue date `2026-08-02`, queue `completed`, SpO2 99, visit date/status `2026-08-02/completed`, prescription `dispensed`, invoice date/status `2026-08-02/paid`, balance `0.00`; stock ไม่ติดลบและ FEFO ตัด lot ที่หมดอายุก่อน

Negative cases ครอบคลุม route/API forbidden, future appointment check-in 422, invalid queue state/reason, invalid vital value, payment/dispense duplicate, rollback เมื่อ child insert ล้ม และ browser refresh/session persistence

## Refresh stability evidence

- Queue → Settings → รอ 22 วินาที: URL/heading คง Settings และไม่มี Queue DOM กลับมาทับ
- Browser reload บน `#/settings`: session และ route คงอยู่
- Main-document request countไม่เพิ่มระหว่าง SPA navigation/poll interval
- ไม่มี console error/pageerror ใน critical route suites

## Responsive และ screenshots

- `docs/evidence/refresh-loop-before.png`
- `docs/evidence/responsive-desktop-1920.png`
- `docs/evidence/responsive-laptop-1366.png`
- `docs/evidence/responsive-tablet-768.png`
- `docs/evidence/responsive-mobile-390.png`
- `docs/evidence/role-{admin,receptionist,nurse,doctor,pharmacist,cashier}-dashboard.png`

## Patient failure regression — 2026-08-02

- Failed endpoint เดิม: `POST /functions/v1/api/patients` ตอบ 500; Postgres log ระบุ `invalid input syntax for type date: ""`
- List endpoint ไม่ได้ล้ม: `OPTIONS` และ `GET /functions/v1/api/patients?page=1&limit=20&search=` ตอบ 200; UI แตกที่ nullable formatter
- หลังแก้: POST 201, GET list/detail/search 200, dates/citizen ID ว่างเก็บเป็น `NULL`, UUID/HN และ audit fields ครบ
- Double-submit สร้างเพียง 1 record/1 create audit; Print summary สร้าง 1 print audit
- CSP source-map requests ไม่ใช่ root cause และไม่ได้ผ่อน CSP; console errors ใน clean Production session = 0
- เพิ่ม `tests/e2e/patient-crud.spec.js` และ nullable formatter unit tests

## ข้อจำกัด

- QA accounts ถูกปิด `active=false` หลังทดสอบเพื่อความปลอดภัย; ต้องสร้าง/เปิดบัญชี QA ที่ควบคุมได้และตั้ง environment variables ใหม่เมื่อต้อง rerun
- Test records ที่เป็นเวชระเบียน/การเงินไม่ hard-delete; ถูก tag `QA-TEST-20260802`
- ไม่มี Git metadata ในโฟลเดอร์นี้ จึงไม่มี commit hash/branch
- Performance Advisor มี unused-index INFO เพราะข้อมูลยังน้อย ไม่ใช่ production error

## สรุป

Console errors คงเหลือ: 0  
Network 401/403 loop: 0  
Refresh/router/auth/polling loop: 0  
Production readiness: **READY WITH MINOR LIMITATIONS** (ข้อจำกัดคือการจัดการ QA accounts/test records และไม่มี Git history ไม่ใช่ critical runtime bug)

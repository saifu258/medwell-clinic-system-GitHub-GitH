# GOOGLE ROLE SECURITY TEST REPORT

วันที่ตรวจ: 2 สิงหาคม 2026 (Asia/Bangkok)

## Status

**NOT READY** — security controls ผ่าน แต่ยังไม่มี Google credential จริงเพื่อทำ production API negative test แบบ end-to-end

## Role allowlist

Backend รับเพียง `receptionist`, `nurse`, `doctor`, `pharmacist`, `cashier`

Unit tests ยืนยันการปฏิเสธ:

- `admin`, `administrator`, `superadmin`, `owner`, `system_admin`
- `Admin`, ` admin `, ค่าว่าง และ unknown
- array, key `roles`, payload หลาย role, object ว่าง และชนิดข้อมูลอื่น

การโจมตี self-assign role ตอบ HTTP 403 ด้วย generic Thai message

## Backend controls

- UID/email/provider มาจาก Firebase ID token เท่านั้น
- ต้องมี `firebase.sign_in_provider = google.com`
- Browser ไม่สามารถเขียนฐานข้อมูลโดยตรง
- Approval mapping เป็น one-time และ lock ด้วย `FOR UPDATE`
- สร้าง profile, consume approval และ audit อยู่ใน transaction เดียว
- Retry เดิมเป็น idempotent
- Existing/disabled user ไม่ถูก overwrite
- เปลี่ยน role ครั้งที่สองเองไม่ได้
- Approval table ใช้ RLS + explicit deny browser policy
- RPC เป็น `SECURITY INVOKER` และให้ execute เฉพาะ `service_role`
- Supabase security advisor: 0 findings
- Edge API version 11: `ACTIVE`

## Current production data check

- Google profiles: 0
- Duplicate UIDs: 0
- Invalid Google roles: 0

ยังไม่มี Google profile เพราะ account chooser ยังไม่ได้ถูกยืนยันในรอบทดสอบนี้

## Automated tests

- `google-login.spec.js`
- `google-role-selection.spec.js`
- `google-role-security.spec.js`
- `google-returning-user.spec.js`
- `google-five-roles.spec.js`
- `admin-role-protection.spec.js`
- `auth-regression.spec.js`

`google-returning-user.spec.js` และ email/password role suites ถูก skip เมื่อไม่มี `MEDWELL_QA_*` credentials ไม่ได้ถูกนับเป็น passed

## Verified production behavior

- Unauthenticated direct URL กลับ `#/login` โดยไม่มี reload loop
- Google popup code ทำงานจาก user click เท่านั้น
- Redirect fallback อยู่ใน branch `auth/popup-blocked` เท่านั้น
- `getRedirectResult()` และ auth listener อย่างละหนึ่งครั้ง
- หน้าเลือก role นิยามห้าบทบาทและไม่มี privileged option
- Mobile login layout ไม่มี overflow
- Clean-tab console และ network ไม่มี critical error ก่อน/หลัง popup initialization


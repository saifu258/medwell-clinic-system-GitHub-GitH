# MEDWELL CLINIC SYSTEM

ระบบคลินิกขนาดเล็กแบบ Vanilla JavaScript SPA ใช้ Firebase Authentication + Firebase Hosting (Spark) และ Supabase Postgres + Edge Functions (Free) เป็น Backend ปัจจุบัน โค้ดเก่าใน `functions/` เป็น migration reference เท่านั้นและไม่ถูก deploy ใน production path นี้

## Production

- Web: https://medwell-clinic-system.web.app
- Firebase project: `medwell-clinic-system`
- Edge API: `https://rubqdcvwrwatxdrtfxkg.supabase.co/functions/v1/api`
- Database timezone สำหรับวันธุรกิจ: `Asia/Bangkok`

```text
Browser -> Firebase ID Token -> Supabase Edge Function
        -> Auth/RBAC/Validation -> Postgres + atomic RPC
```

Browser ไม่ได้รับ Supabase service key และไม่ติดต่อฐานข้อมูลโดยตรง Edge Function ตรวจ Firebase ID token, active profile และ permission ทุก request

## บทบาท

- Admin: ทุกโมดูล การตั้งค่า ผู้ใช้ Audit และ Backup
- Receptionist: ผู้ป่วย นัดหมาย และคิว
- Nurse: อ่านผู้ป่วย/คิว และคัดกรอง
- Doctor: ผู้ป่วย คิว เวชระเบียน Visit และใบสั่งยา
- Pharmacist: ใบสั่งยา จ่ายยา รายการยา และคลังยา
- Cashier: ผู้ป่วย บริการ Invoice และ Payment

รายละเอียดอยู่ที่ `docs/ROLE_BASED_E2E_TEST_MATRIX.md`

## รันและทดสอบ

ต้องใช้ Node.js 20+ และ Python สำหรับ static server ของ Playwright

```bash
npm install
npm test
npx deno-bin@2.2.7 test --config supabase/functions/api/deno.json --node-modules-dir=auto supabase/functions/api/helpers_test.ts
npx deno-bin@2.2.7 check --config supabase/functions/api/deno.json --node-modules-dir=auto supabase/functions/api/index.ts
npm run test:e2e
```

E2E ใช้ environment variables แยกตามบทบาท เช่น `MEDWELL_QA_ADMIN_EMAIL` และ `MEDWELL_QA_ADMIN_PASSWORD` ดูรายการครบใน `.env.example` ห้าม commit credential จริง

## Deploy

```bash
npx firebase-tools@latest deploy --only hosting --project medwell-clinic-system
```

Edge Function และ migrations deploy ผ่าน Supabase CLI/MCP โดยอ่านไฟล์เป็น UTF-8 ต้อง deploy `supabase/functions/api/index.ts`, `helpers.ts`, `auth.ts`, `db.ts` และ `deno.json` พร้อมกัน `verify_jwt=false` เป็นข้อยกเว้นที่ตั้งใจไว้ เพราะ Function ตรวจ Firebase JWT เอง ไม่ใช่ Supabase JWT

## ความปลอดภัยและความเสถียร

- Firebase/Router/Auth bootstrap มี single initialization และ single-flight token refresh/logout
- Queue polling มี mount/unmount, AbortController, no-overlap และหยุดเมื่อ tab ถูกซ่อน
- Payment, Dispense, Screening, Open Visit, Prescription, Stock receive และ Invoice ใช้ PostgreSQL transaction/RPC
- Payment/Dispense ใช้ idempotency; FEFO ห้าม lot หมดอายุและสต็อกติดลบ
- RLS เปิดครบทุก public table และ client roles ถูก deny โดยตรง
- ไม่มี Service Worker จึงไม่มี Service Worker reload loop

รายงานล่าสุด: `BUG_AUDIT_REPORT.md`, `STABILITY_FIX_REPORT.md`, `E2E_TEST_REPORT.md`
# Google Sign-In และการอนุมัติบทบาท

1. เปิด [Firebase Console](https://console.firebase.google.com/) แล้วเลือกโปรเจกต์ `medwell-clinic-system`
2. ไปที่ Authentication → Sign-in method → Google และกด Enable โดยตั้ง Support email ให้ถูกต้อง
3. ตรวจว่า `medwell-clinic-system.web.app`, `medwell-clinic-system.firebaseapp.com` และโดเมนที่ใช้พัฒนาอยู่ใน Authorized domains
4. ผู้ดูแลระบบ MEDWELL ไปที่ ผู้ใช้งาน → อนุมัติ Google แล้วกรอกอีเมลกับหนึ่งในห้าบทบาทที่อนุญาต
5. ผู้ใช้กด “เข้าสู่ระบบด้วย Google” และเลือกบทบาทให้ตรงกับที่คลินิกอนุมัติ

ระบบไม่เก็บ OAuth token หรือบทบาทไว้ใน Local/Session Storage การกำหนดบทบาทเกิดที่ Edge API และฐานข้อมูลเท่านั้น บัญชีผู้ใช้ปกติไม่มีทางเลือกบทบาทผู้ดูแลระบบ และเมื่อเลือกครั้งแรกแล้วต้องเปลี่ยนผ่านผู้ดูแลระบบเดิมเท่านั้น

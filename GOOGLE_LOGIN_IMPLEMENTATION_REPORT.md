# GOOGLE LOGIN IMPLEMENTATION REPORT

วันที่ตรวจ production: 2 สิงหาคม 2026 (Asia/Bangkok)

## Production status

**NOT READY** — ต้นเหตุ `auth/internal-error` ถูกแก้และ Google popup initialization ทำงานแล้ว แต่ยังไม่มีการเลือกบัญชี Google จริงในหน้าต่าง popup จึงยังยืนยัน credential completion, first-login และ returning-user flow บน production ไม่ครบ

## 1. Exact root cause

Firebase Hosting CSP เดิมมี `default-src 'self'` แต่ขาดแหล่งที่ Firebase popup resolver ต้องใช้:

- `script-src https://apis.google.com`
- `frame-src https://medwell-clinic-system.firebaseapp.com https://accounts.google.com`

Firebase จึงสร้าง Auth helper iframe/GAPI ไม่สำเร็จและคืน `auth/internal-error` ก่อนเปิด account chooser ข้อความภาษาไทยเดิมทำให้ดูเหมือน provider ยังไม่เปิด

หลังแก้ CSP production สร้าง iframe ที่ `https://medwell-clinic-system.firebaseapp.com/__/auth/iframe` ได้ ปุ่มอยู่ในสถานะรอ popup โดยไม่มี alert, CSP error หรือ network error

## 2. Exact Firebase error

- Code ก่อนแก้: `auth/internal-error`
- Message ก่อนแก้: `Firebase: Error (auth/internal-error).`
- Origin: `https://medwell-clinic-system.web.app`
- Safe diagnostic แสดงเฉพาะ operation, code, message, origin, projectId และ authDomain เมื่อเป็น localhost/127.0.0.1 หรือมี `debugAuth=1`; ไม่ log token/credential

## 3. Firebase config findings

ค่าใน source ตรงกับ `firebase apps:sdkconfig WEB` ทุกค่า:

- apiKey: ตรง
- authDomain: `medwell-clinic-system.firebaseapp.com`
- projectId: `medwell-clinic-system`
- storageBucket: `medwell-clinic-system.firebasestorage.app`
- messagingSenderId: `569102271370`
- appId: `1:569102271370:web:ee49211a341fca17c93e73`

ใช้ Firebase Web SDK modular version `11.1.0` เพียงเวอร์ชันเดียวใน frontend, initialize app ครั้งเดียว, `getAuth()` ใช้ app เดียวกัน, Google provider instance เดียว, `getRedirectResult()` หนึ่งครั้ง และ `onAuthStateChanged()` หนึ่งครั้ง

## 4. Provider และ Authorized domains

Identity Toolkit `accounts:createAuthUri` ตอบ HTTP 200 และคืน Google OAuth URI สำหรับ:

- `medwell-clinic-system.web.app`
- `medwell-clinic-system.firebaseapp.com`
- `localhost`
- `127.0.0.1`

โดเมนที่ไม่ได้อนุมัติถูกปฏิเสธ HTTP 400 `INVALID_CONTINUE_URI` ตามคาด Google provider จึงเปิดและ authorized-domain validation ทำงาน

## 5. CSP, Hosting และ cache

- เพิ่ม `https://apis.google.com` เฉพาะใน `script-src`
- เพิ่ม `medwell-clinic-system.firebaseapp.com` และ `accounts.google.com` เฉพาะใน `frame-src`
- ไม่ใช้ `frame-src *`
- Hosting rewrite ยังคงส่ง SPA routes ไป `/index.html`
- เพิ่ม `Cache-Control: no-cache,max-age=0,must-revalidate` ครอบคลุม HTML และ assets
- Production ETag หลัง deploy: `162d65205209e6cd89260a3cdd743dfdc93d5ba746b5a3f204453436904dcd14`
- Version marker: `20260802-google-auth-3`
- ไม่พบ service-worker registration ในโปรเจกต์

## 6. Files changed

- `firebase.json`
- `public/index.html`
- `public/assets/js/auth.js`
- `public/assets/js/pages/loginPage.js`
- `tests/e2e/google-login.spec.js`
- `GOOGLE_LOGIN_IMPLEMENTATION_REPORT.md`
- `GOOGLE_ROLE_SECURITY_TEST_REPORT.md`

## 7. Deployment

- ยืนยัน Firebase project: `medwell-clinic-system`
- Firebase Hosting deploy: สำเร็จ
- Backend ไม่เปลี่ยนในรอบแก้ CSP จึงไม่ deploy Functions/Edge ซ้ำ
- Production URL: https://medwell-clinic-system.web.app

## 8. Test results

- Node regression: 20 passed
- Deno backend/security: 6 passed
- Google-focused local Playwright: 9 passed across final targeted suites
- Full production Playwright: 7 passed, 25 skipped เพราะไม่มี QA email/password credentials ใน environment
- Final production Google-focused Playwright: 9 passed
- Mobile 390×844: Google button visible, horizontal overflow 0
- Clean production tab: console warning/error 0
- Google click หลังแก้: Auth iframe โหลดสำเร็จ, alert ไม่มี, critical network error ไม่มี

## 9. Remaining verification

ต้องเลือกบัญชี Google จริงใน popup ก่อนจึงจะทดสอบต่อได้ครบ:

- ID token → `/auth/profile`
- existing account → dashboard
- first-time approved account → role selection
- refresh, Back/Forward, persistence และ logout หลัง Google login
- disabled Google account
- modified `role=admin` ผ่าน HTTP จริงด้วย Google token

Backend transaction/unit tests สำหรับห้าบทบาท, idempotency และ Admin rejection ผ่านแล้ว แต่ไม่แทนการทดสอบ OAuth credential จริง


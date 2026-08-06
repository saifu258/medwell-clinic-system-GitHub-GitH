# BUG AUDIT REPORT — MEDWELL CLINIC SYSTEM

วันที่ตรวจ: 2 สิงหาคม 2026 (Asia/Bangkok)  
Production: https://medwell-clinic-system.web.app  
Architecture ที่ตรวจจริง: Firebase Auth/Hosting (Spark) + Supabase Postgres/Edge Functions (Free)

## สรุป

พบ 18 กลุ่มปัญหา แก้และยืนยันผลแล้วทั้งหมด ไม่มี Critical/High bug คงเหลือใน flow ที่ทดสอบ

| Severity | อาการและวิธีทำให้เกิด | Root cause / จุดอ้างอิง | การแก้และสถานะ |
|---|---|---|---|
| Critical | เปิด Queue แล้วไป Settings; หลัง 20 วินาที DOM กลับเป็น Queue แต่ URL ยัง Settings | Timer ถูกสร้างใน render โดยไม่มี cleanup (`public/assets/js/pages/queuePage.js`) | เพิ่ม lifecycle, AbortController, visibility handling และ no-overlap; ผ่าน stability test |
| Critical | Hash เปลี่ยนระหว่าง render แล้ว URL/DOM ไม่ตรงกัน | Router ทิ้ง `hashchange` เมื่อ `rendering=true` | ใช้ `navigationPending` drain loop และ cleanup หน้าเดิม (`router.js:37,59,70-78`) |
| High | Login สำเร็จแล้ว reload ทั้งหน้า | Login page เรียก reload เพื่อ bootstrap profile | เปลี่ยนเป็น `hydrateSession()` + SPA route โดยไม่ reload |
| High | 401 หลาย request ทำ token refresh/logout ซ้อนกัน | ไม่มี single-flight | เพิ่ม `refreshTokenPromise`/`logoutPromise` (`auth.js:26-39`) และ retry 401 หนึ่งครั้ง |
| High | Nurse/Doctor/Pharmacist/Cashier เข้าถึง API เกินบทบาท | หลาย route ไม่มี backend permission guard | เพิ่ม granular RBAC ทั้ง read/write/report; read matrix 84/84 และ write matrix 72/72 ผ่าน |
| High | คิว/Visit/Invoice ของวันไทยไม่แสดงช่วงหลังเที่ยงคืน | ใช้ Postgres `current_date` ซึ่งเป็น UTC | บังคับ `todayBangkok()` ตอนสร้าง queue/visit/invoice (`index.ts:63,68,105`) |
| High | Screening ตอบ 500 เมื่อส่ง `spO2` | camel→snake แปลงเป็น `sp_o2` แต่ schema คือ `spo2` | special mapping + Deno regression test (`helpers.ts:5`, `helpers_test.ts:4`) |
| High | Screening GET อ้างคอลัมน์ `visit_id` ที่ไม่มี | API/schema contract ผิด | เปลี่ยนเป็นค้นตาม `queue_id` |
| High | ชำระครบแต่คิวค้าง waiting_payment | Payment RPC ไม่ปิด queue | migration `complete_queue_after_payment`; regression ยืนยัน queue completed |
| High | นัดคนละวันเช็กอินได้ | ไม่มี business rule ก่อนสร้าง queue | อนุญาตเฉพาะ scheduled/confirmed และวัน Bangkok ตรงกัน; negative test ได้ 422 |
| High | Prescription/Invoice/Stock/Screening/Visit อาจเหลือข้อมูลครึ่งชุด | เขียนหลายตารางด้วย PostgREST calls แยกกัน | ย้าย 5 flow เข้า atomic PostgreSQL RPC; rollback test ยืนยัน count ไม่เปลี่ยน |
| Medium | Dashboard chart ซ้อนเมื่อกลับหน้า | Chart instance ไม่ destroy | `dashboardPage.cleanup()` destroy ก่อน render (`dashboardPage.js:7-9`) |
| Medium | Users/Screening/Audit แสดงข้อมูลผิด | UI ใช้ `rolesJson`, `alertsJson`, `timestamp` แต่ API ส่ง array/`occurredAt` | แก้ contract และเพิ่ม nested patient name fallback |
| Medium | ภาษาไทย production เป็น mojibake | deploy เดิมอ่าน UTF-8 ผ่าน PowerShell decoding ผิด | migration ซ่อม seed แบบเจาะจงและ deploy Edge ด้วย UTF-8 bytes |
| High | Patient list แสดง “ไม่สามารถโหลดข้อมูลได้” ทั้งที่ GET สำเร็จ | ผู้ป่วยที่ไม่ระบุเลขบัตรมี `citizenId=null`; `maskCitizenId()` และ `maskPhone()` อ่าน `null.length` | ทำ formatter ให้ null-safe, เพิ่ม unit regression และยืนยัน GET/search/detail Production ผ่าน |
| High | สร้างผู้ป่วยตอบ 500 | ฟอร์มส่งวันที่ optional เป็น `""` ไปยัง Postgres column ชนิด `date` | Backend whitelist patient fields, แปลง blank เป็น `NULL`, validate required fields/เลขบัตร; POST Production ได้ 201 |
| High | Browser ยังเห็นบัคเดิมหลัง Deploy | JS/CSS ไม่มี hashed filename แต่ Hosting cache 1 ชั่วโมง และ module graph ยังใช้ release เก่า | เปลี่ยนเป็น `no-cache,must-revalidate` พร้อม module release query; session ใหม่ได้รับโค้ดทันที |
| Medium | หน้ารายละเอียดแสดงปุ่มแก้ไข/ประวัติรักษาที่บางบทบาทไม่มีสิทธิ์ | Quick actions ไม่ตรวจ permission ก่อน render | แสดงปุ่มตาม `can()` และบันทึก Audit ก่อนพิมพ์; Receptionist เห็น edit/print แต่ไม่เห็น admin report |

## สิ่งที่ตรวจและไม่ใช่ต้นเหตุ

- ไม่มี Service Worker หรือ registration จึงไม่ใช่ Service Worker reload loop
- ไม่พบ `location.reload`, `location.replace`, `history.go` ที่ยังใช้แก้ error/state
- Firebase initialization ใช้ `getApps().length ? getApp() : initializeApp()` เพียง instance เดียว
- ไม่มี Browser ติดต่อ Supabase database โดยตรง; ติดต่อ Edge API เท่านั้น
- CSP source-map warnings จาก CDN ไม่กระทบ runtime; ไม่ได้ขยาย `connect-src` และ Production session ใหม่ไม่มี console error
- Repository นี้ไม่มี `.git` จึงไม่สามารถสร้าง branch หรือแสดง git status ได้ และไม่มีการ reset/clean/checkout

## ข้อมูลทดสอบ

ใช้ข้อมูลที่ติดป้าย `QA-TEST-20260802`/`QA-PATIENT-FIX-*` เท่านั้น ไม่มีข้อมูลผู้ป่วยจริงก่อนเริ่ม ตัวอย่างหลัก: patient `5a357a8d-c04a-4e96-85ca-72f8ae410b99`, patient fix `8b12eb75-90af-442b-80f8-8bc64c0dc7fa`, atomic flow queue `b252555c-d8af-4c9a-89a3-890261dcc31b` ข้อมูลเวชระเบียนและธุรกรรมไม่ hard-deleteเพื่อรักษา audit trail

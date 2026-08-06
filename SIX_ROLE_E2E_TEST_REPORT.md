# SIX ROLE E2E TEST REPORT — MEDWELL CLINIC SYSTEM

วันที่: 2 สิงหาคม 2026 (Asia/Bangkok)  
Production: https://medwell-clinic-system.web.app  
Backend ที่ใช้งานจริง: Firebase Authentication + Supabase Postgres/Edge API

## ผลตามบทบาท

| Role | UI/route ที่อนุญาต | API ที่อนุญาต | UI/API ที่ปฏิเสธ | ผล |
|---|---|---|---|---|
| Admin | ทุกโมดูล รวม users/settings/audit/backup | ทุก permission | ไม่มี route นอกสิทธิ์ | ผ่าน |
| Receptionist | patients/appointments/queue | patient CRUD, appointment, check-in, queue | clinical/pharmacy/billing/admin | ผ่าน |
| Nurse | patients/queue/screening | read patient/queue, create screening | diagnosis/prescription/payment/admin | ผ่าน |
| Doctor | patient history/doctor/prescriptions | visit/diagnosis/prescription | stock/payment/admin | ผ่าน |
| Pharmacist | prescriptions/pharmacy/medicines/inventory | FEFO dispense/stock receive | diagnosis/payment/admin | ผ่าน |
| Cashier | patients/billing | invoice/payment | clinical/dispense/stock/admin | ผ่าน |

Backend read permission matrix 84/84 และ write/negative matrix 72/72 ผ่าน ผู้ไม่มีสิทธิ์ได้รับ 403 โดยไม่ logout loop

## Cross-role clinic workflow

Receptionist ลงทะเบียน/นัด/เช็กอิน → Nurse คัดกรอง → Doctor เปิดและปิด Visit/สั่งยา → Pharmacist FEFO dispense → Cashier invoice/payment → Admin ตรวจรายงานและ Audit ผ่านครบ โดย linked IDs และสถานะฐานข้อมูลสอดคล้องกัน

## Patient regression

- Production GET list/detail/search ผ่าน
- Production create ได้ 201; DB มี record เดียว, optional dates เป็น `NULL`, created/updated actor ครบ และ Audit create 1 รายการ
- Session refresh คง route/ผู้ใช้, ไม่มี console error, ไม่มี document reload; double-click สร้าง 1 record/1 audit เท่านั้น
- Patient detail quick actions แสดงตาม permission; Receptionist ไม่เห็น admin-only treatment report
- Automated regression เพิ่มใน `tests/e2e/patient-crud.spec.js`; credentials ใช้ environment variables เท่านั้น

## สถานะ

**READY WITH MINOR LIMITATIONS** — เหลือเพียง QA-tagged audit records และโฟลเดอร์ไม่มี Git history; ไม่มี critical runtime bug คงเหลือใน flow ที่ทดสอบ

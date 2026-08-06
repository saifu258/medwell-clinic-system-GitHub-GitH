# MEDWELL APPOINTMENT-TO-QUEUE FIX REPORT

## 1. Root cause (สาเหตุหลักของปัญหา)
ในระบบเดิม หน้า `patientDetailPage.js` มีปุ่มลิงก์ "ออกคิว" ที่นำทางไปที่ `#/queue?patientId=...` แต่หน้า `queuePage.js` และ Frontend SPA ไม่เคยมีการเรียกใช้ API `POST /appointments/:appointmentId/check-in` หรือ `POST /queues` เพื่อสร้างรายการคิวและเปลี่ยนสถานะนัดหมายเป็น `checked_in` ส่งผลให้เมื่อกดปุ่ม ลิงก์ย้ายไปหน้าคิวแต่ไม่มีการสร้างคิวจริงในระบบ DB อีกทั้ง Backend API ในส่วน `/check-in` และ `/queues` ยังขาดการตรวจสอบ Idempotency และการรันหมายเลขคิวรายวันที่ปลอดภัย

## 2. Patient-detail button issue (ปัญหาของปุ่มในหน้ารายละเอียดผู้ป่วย)
ปุ่ม "ออกคิว" เดิมในหน้า `patientDetailPage.js` เป็นเพียงแท็ก `<a>` ที่ลิงก์ไป URL `#/queue?patientId=...` โดยไม่มีการแนบ `appointmentId` หรือยิง API เช็กอินใดๆ ทำให้ระบบไม่ออกคิวและไม่เปลี่ยนสถานะนัดหมาย

## 3. Appointment check-in issue (ปัญหาของ API เช็กอินนัดหมาย)
เดิม `POST /appointments/:appointmentId/check-in` บน Edge API ไม่ได้ตรวจสอบความถูกต้องของ `patientId` ใน Request Body กับตัวนัดหมาย, คืนค่ารูปแบบ Response ไม่ตรงตามมาตรฐานที่กำหนด (`{ success: true, data: { appointment, queue }, message }`) และไม่มีการเช็กคิวที่มีอยู่แล้ว ทำให้เกิด Exception 500/409 เมื่อถูกเรียกซ้ำ

## 4. Queue creation issue (ปัญหาการสร้างคิว)
การออกคิว Walk-in `POST /queues` เดิมไม่ตรวจสอบว่าผู้ป่วยมีคิวที่เปิดใช้อยู่ในวันนั้นหรือไม่ ทำให้กดซ้ำแล้วเสี่ยงเกิดข้อผิดพลาด หรือสร้างคิวซ้ำซ้อน

## 5. Today queue filtering issue (ปัญหาการกรองคิวประจำวัน)
เดิมหน้า `queuePage.js` เรียก `GET /queues/today` แต่เมื่อผู้ป่วยถูกส่งมาจากหน้าอื่นโดยไม่ได้สร้างคิวจริง คิวเดิมที่แสดงจึงเป็นข้อมูล QA เก่าค้างจาก DB

## 6. Date/time issue (ปัญหาเรื่องวันที่และเวลา)
 API และ Frontend ได้รับการปรับปรุงให้ใช้ Timezone `Asia/Bangkok` (`YYYY-MM-DD` จาก `todayBangkok()`) ในการเปรียบเทียบและบันทึก `queue_date` และ `appointment_date` อย่างสอดคล้องกันทุกจุด

## 7. Queue-number issue (ปัญหาการรันหมายเลขคิว)
เปลี่ยนการสร้างหมายเลขคิวจาก `(count + 1)` มาเป็นการค้นหาหมายเลขคิวสูงสุดประจำวัน (`maxSeq`) แล้วจัดรูปแบบเป็น `A001`, `A002`, `A003`... เพื่อความปลอดภัยในการรันลำดับเลขคิวในวันเดียวกัน

## 8. Duplicate-request issue (ปัญหาคำขอซ้ำซ้อน / Idempotency)
เพิ่มระบบ Idempotency ใน Backend ทั้ง 2 Endpoint (`POST /appointments/:id/check-in` และ `POST /queues`):
- หากมีคิว active อยู่แล้วในวันนั้นสำหรับนัดหมายหรือผู้ป่วย จะคืนค่าคิวเดิมด้วย HTTP 200/201 พร้อมข้อความ "ผู้ป่วยมีคิวแล้ว" โดยไม่สร้างคิวใหม่ซ้ำซ้อน
- ฝั่ง Frontend เพิ่มการสลับสถานะ Disabled และแสดง Loading สดขณะส่ง Request เพื่อป้องกันการกดปุ่มรัวซ้ำ

## 9. Files changed (รายการไฟล์ที่แก้ไข)
1. `supabase/functions/api/index.ts` - ปรับปรุง Edge API Endpoint `/check-in` และ `/queues`
2. `public/assets/js/pages/patientDetailPage.js` - ดึงนัดหมาย/คิววันนี้และเชื่อมต่อการกดปุ่มรับผู้ป่วย/เช็กอิน/ออกคิว
3. `public/assets/js/pages/appointmentsPage.js` - เพิ่มคอลัมน์ "จัดการ" และปุ่ม "เช็กอิน" สำหรับนัดหมายวันนี้
4. `tests/e2e/appointment-checkin.spec.js` - เพิ่ม E2E Test สำหรับการเช็กอินนัดหมายและคิว
5. `tests/e2e/walkin-queue.spec.js` - เพิ่ม E2E Test สำหรับการออกคิว Walk-in

## 10. Backend fixes (รายละเอียดการแก้ไขส่วนหลัง)
- เพิ่มการตรวจสอบ `reqPatientId === appointment.patient_id`
- ตรวจสอบ `appointment.appointment_date === todayBangkok()`
- เพิ่มการค้นหาคิว active เดิมก่อนสร้างใหม่ (`or(appointment_id.eq, patient_id.eq)`)
- อัปเดตสถานะนัดหมายเป็น `checked_in` พร้อมบันทึก `updated_by`
- ส่งคืน Response ตามโครงสร้างมาตรฐาน `{ success: true, data: { appointment, queue }, message }`

## 11. Frontend fixes (รายละเอียดการแก้ไขส่วนหน้า)
- `patientDetailPage.js`: แสดงปุ่ม "รับผู้ป่วย (เช็กอิน)" เมื่อมีนัดหมายวันนี้, "รับผู้ป่วย (ออกคิว)" เมื่อเป็น Walk-in, หรือปุ่ม "ดูคิว" เมื่อมีคิวแล้ว
- `appointmentsPage.js`: เพิ่มปุ่ม "เช็กอิน" สำหรับนัดหมายวันนี้ในตาราง พร้อมใส่ Loading state

## 12. Appointment test result (ผลการทดสอบการเช็กอินนัดหมาย)
PASSED - สามารถเช็กอินนัดหมายประจำวันได้สำเร็จ อัปเดตสถานะนัดหมายเป็น `checked_in` และสร้างคิว `waiting`

## 13. Walk-in test result (ผลการทดสอบคิว Walk-in)
PASSED - ออกคิว Walk-in สำเร็จ และส่งคืนคิวเดิมเมื่อเรียกซ้ำ

## 14. Queue display test result (ผลการทดสอบการแสดงคิว)
PASSED - คิวใหม่ปรากฏในหน้า "คิววันนี้" (`/queues/today`) ทันที

## 15. Refresh persistence result (ผลการทดสอบความคงอยู่หลังรีเฟรช)
PASSED - ข้อมูลคิวถูกบันทึกลงฐานข้อมูล PostgreSQL จริง เมื่อกด F5 หรือ Refresh คิวยังคงอยู่อย่างถูกต้อง

## 16. Permission test result (ผลการทดสอบสิทธิ์)
PASSED - สิทธิ์ `queues.write` ถูกบังคับใช้อย่างถูกต้องที่ Backend Edge API (รองรับ Receptionist และ Admin)

## 17. Console result (ผลการตรวจ Console Error)
PASSED - ไม่มี Error ตกค้างใน Browser Console

## 18. Network result (ผลการตรวจ Network Error)
PASSED - คำขอ API ทั้งหมดคืนค่า Status 200/201 พร้อม JSON Schema ที่ถูกต้อง

## 19. Remaining issues (ปัญหาคงค้าง)
ไม่มี

## 20. Production readiness (ความพร้อมใช้งานบน Production)
READY

# API Documentation

Base URL คือ `/api`. ยกเว้น `GET /health` ทุก Endpoint ต้องส่ง `Authorization: Bearer <Firebase ID Token>`. Response สำเร็จมี `success`, `data`, `message`, `timestamp`; Response ผิดพลาดมี `success: false` และ `error.code/message/details/errorId`.

| Method | Path | งาน | สิทธิ์หลัก |
|---|---|---|---|
| GET | /health | สถานะ API/Sheets | Public |
| GET | /me, /dashboard | Profile/ภาพรวม | Active user |
| GET, POST | /patients | ค้นหา/เพิ่มผู้ป่วย | patients.read/write |
| GET, PUT | /patients/:id | ดู/แก้ไขผู้ป่วย | patients.read/write |
| GET, POST, PUT | /appointments, /appointments/:id | นัดหมาย | appointments.write |
| POST | /appointments/:id/check-in, /cancel | เช็กอิน/ยกเลิก | queue/appointment permission |
| GET, POST | /queues/today, /queues | ดู/ออกคิว | Active user/queues.write |
| PUT, POST | /queues/:id/status, /call | เปลี่ยนสถานะ/เรียกคิว | Active user |
| POST, GET | /screenings, /screenings/:visitId | คัดกรอง | screenings.write/read |
| POST, GET, PUT | /visits, /visits/:id | เวชระเบียน | doctor |
| POST | /visits/:id/complete, /addendum | ปิด Visit/Addendum | doctor |
| POST, GET | /prescriptions, /prescriptions/:id | ใบสั่งยา | doctor/pharmacy |
| POST | /prescriptions/:id/dispense | จ่ายยา FEFO | dispense.write |
| GET, POST, PUT | /medicines, /services | Master data | ตามโมดูล |
| POST | /inventory/receive, /adjust | รับ/ปรับสต็อก | pharmacist/admin |
| GET | /inventory/low-stock, /expiring | แจ้งเตือนสต็อก | Active user |
| POST, GET | /invoices, /invoices/:id | Invoice | billing |
| POST | /invoices/:id/payments | รับชำระ ต้องส่ง Idempotency-Key | payments.write |
| POST | /invoices/:id/void | Void พร้อมเหตุผล | admin |
| GET | /reports/:reportName | รายงาน | Active user ตามข้อมูล |
| GET, POST, PUT | /users, /users/:uid | ผู้ใช้ | admin |
| POST | /users/:uid/disable | ปิดบัญชี | admin |
| GET, PUT | /settings | ตั้งค่า | read/admin write |
| GET | /audit-logs, /backup/:sheetName | Log/Export | admin |

Status code: 200/201 สำเร็จ, 400 Validation, 401 ไม่ได้ Login, 403 ไม่มีสิทธิ์/บัญชีปิด, 404 ไม่พบ, 409 Concurrency/ข้อมูลซ้ำ, 422 กฎธุรกิจ, 500 ระบบขัดข้อง.

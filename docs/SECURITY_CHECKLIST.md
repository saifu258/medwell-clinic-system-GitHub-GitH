# Security Checklist

- [x] Firebase ID Token ตรวจด้วย Admin SDK ทุก API ภายใน
- [x] Active user, Role และ Permission ตรวจที่ Backend
- [x] Frontend ไม่มี Service Account, Private Key หรือ Sheets token
- [x] Google Sheets เข้าผ่าน Backend เท่านั้นและไม่แชร์ Public
- [x] Helmet, CSP, frame protection, nosniff, Referrer/Permissions Policy
- [x] CORS จำกัด Hosting domain และ localhost
- [x] Validation, Sanitization, Output escaping และขนาด JSON limit
- [x] Optimistic concurrency ด้วย updatedAt; Payment/Dispense รองรับ Idempotency
- [x] Audit Log ไม่เก็บ Password/Token/เวชระเบียนเต็ม/Citizen ID เต็ม
- [x] Frontend timeout, Auth refresh หนึ่งครั้ง, auto logout และป้องกัน submit ซ้ำ
- [ ] ตั้งค่า Firebase Web config, SPREADSHEET_ID และ ALLOWED_ORIGINS จริง
- [ ] ทบทวน IAM, Firebase Authorized domains และสิทธิ์ Spreadsheet ก่อน Production
- [ ] กำหนดนโยบาย Backup, Retention, Incident response และ PDPA ของคลินิก

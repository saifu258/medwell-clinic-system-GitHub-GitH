# ตั้งค่า Google Sheets

1. สร้าง Firebase/Google Cloud Project และเปิด Google Sheets API.
2. สร้าง Google Spreadsheet ใหม่และคัดลอก ID จาก URL.
3. ตรวจ Service Account ของ Cloud Functions ใน IAM แล้วแชร์ Spreadsheet ให้บัญชีนั้นเป็น Editor. ห้ามแชร์เป็น Public.
4. ตั้งค่า `SPREADSHEET_ID` ในสภาพแวดล้อม Functions. สำหรับ Local ใช้ `.env` ที่ไม่ Commit.
5. ใช้ Application Default Credentials: `gcloud auth application-default login` สำหรับ Local. Production ใช้สิทธิ์ของ Cloud Function โดยไม่ต้องมี JSON key.
6. ใน `functions` รัน `npm run setup:sheets` เพื่อสร้าง 20 Tabs และ Header.
7. สร้างผู้ใช้ Firebase Authentication แล้วเพิ่ม UID ลง Users โดยตั้ง `rolesJson` เป็น `["admin"]`, `permissionsJson` เป็น `[]`, `active` เป็น `true`.
8. ทดสอบ `/api/health`; ค่า `sheets` ควรเป็น `connected`.

ห้ามใส่ Spreadsheet ID, Service Account JSON หรือ Private Key ใน Frontend.

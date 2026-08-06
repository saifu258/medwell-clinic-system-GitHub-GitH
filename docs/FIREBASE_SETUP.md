# ตั้งค่า Firebase

1. สร้าง Project ที่ Firebase Console แล้วเพิ่ม Web App.
2. Authentication > Sign-in method เปิด Email/Password.
3. นำ Web config ที่ไม่ใช่ Admin secret ใส่ `public/assets/js/firebase-config.js`.
4. ติดตั้ง Firebase CLI, Login และเลือก Project ด้วย `firebase use --add`.
5. เปิด Functions, Hosting, Cloud Build และ Artifact Registry API. โปรเจกต์ต้องใช้ Blaze plan สำหรับ Gen 2.
6. ตั้ง `SPREADSHEET_ID` และ `ALLOWED_ORIGINS` ใน Functions environment.
7. ใช้ Emulator ทดสอบก่อน Deploy.

Region หลักคือ `asia-southeast1` และ Hosting rewrite `/api/**` ไปยัง Function `api`.

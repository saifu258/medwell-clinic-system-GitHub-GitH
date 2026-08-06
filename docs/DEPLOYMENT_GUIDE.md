# Deployment Guide

1. ใส่ Firebase Web config, เลือก Project และตั้งค่า Functions environment.
2. แชร์ Spreadsheet ให้ Service Account และรัน setup/seed.
3. รัน `npm --prefix functions install` และ `npm test`.
4. ทดสอบ `firebase emulators:start` ที่ `http://localhost:5000`.
5. Deploy ด้วย `firebase deploy` หรือแยก `firebase deploy --only functions` และ `firebase deploy --only hosting`.
6. ตรวจ `https://<PROJECT_ID>.web.app/api/health`, Login, RBAC, CRUD ผู้ป่วย, Queue, Dispense, Payment และ Audit.

Rollback Hosting ใช้ Firebase Console > Hosting > Release history. Functions ควร Deploy เวอร์ชันที่ Tag ไว้ใน Source Control. ก่อนเปลี่ยน Schema ต้องสำรอง Spreadsheet.

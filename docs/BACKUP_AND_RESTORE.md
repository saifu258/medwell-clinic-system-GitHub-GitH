# Backup & Restore

Admin ส่งออกแต่ละชีตเป็น JSON จากหน้า “สำรองข้อมูล” ได้ และทุก Export ถูกบันทึก Audit Log. เก็บไฟล์ในพื้นที่เข้ารหัส จำกัดสิทธิ์ และกำหนดอายุการเก็บตามนโยบายคลินิก.

สำรอง Spreadsheet ด้วยตนเอง: Google Sheets > File > Make a copy หรือ Download เป็น Excel. ตรวจวันสำรอง, จำนวน Tabs และสิทธิ์ผู้เข้าถึงทุกครั้ง.

การ Restore ต้องทำในสำเนาใหม่ก่อน: ปิดการเขียนของระบบ, สำรองปัจจุบัน, ตรวจ Header ให้ตรง `GOOGLE_SHEETS_SCHEMA.md`, Import เฉพาะข้อมูลใต้ Header, ตรวจ UUID/ยอดสต็อก/ยอดชำระ, ทดสอบ Emulator แล้วจึงเปลี่ยน `SPREADSHEET_ID`. ระบบไม่ลบข้อมูลอัตโนมัติ.

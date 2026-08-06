import { google } from "googleapis";
import crypto from "node:crypto";
const spreadsheetId = process.env.SPREADSHEET_ID;
if (!spreadsheetId || spreadsheetId === "YOUR_SPREADSHEET_ID") throw new Error("กรุณากำหนด SPREADSHEET_ID");
const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth }); const now = new Date().toISOString();
const rows = [
  { range: "Settings!A:E", values: [["clinicNameTh", "เมดเวลล์ คลินิก", "ชื่อคลินิกภาษาไทย", now, "setup"], ["timezone", "Asia/Bangkok", "เขตเวลา", now, "setup"], ["pageSize", "20", "จำนวนต่อหน้า", now, "setup"], ["expiryAlertDays", "90", "แจ้งเตือนยาหมดอายุ", now, "setup"]] },
  { range: "Services!A:L", values: [[crypto.randomUUID(), "SV001", "ค่าตรวจแพทย์", "ค่าตรวจ", 300, 0, true, "", now, "setup", now, "setup"]] },
  { range: "Medicines!A:S", values: [[crypto.randomUUID(), "MED001", "Paracetamol", "", "500 mg", "tablet", "เม็ด", "กล่อง", 100, 20, 0, 2, 0.5, true, "ข้อมูลเริ่มต้น โปรดตรวจสอบก่อนใช้", now, "setup", now, "setup"]] }
  ,{ range: "DiagnosisMaster!A:I", values: [[crypto.randomUUID(), "J00", "Acute nasopharyngitis (common cold)", true, "ข้อมูลตัวอย่าง ICD-10 โปรดตรวจสอบก่อนใช้", now, "setup", now, "setup"]] }
];
for (const data of rows) await sheets.spreadsheets.values.append({ spreadsheetId, range: data.range, valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS", requestBody: { values: data.values } });
console.log("เพิ่มข้อมูลเริ่มต้นสำเร็จ (ไม่สร้างรหัสผ่านหรือบัญชี Admin)");

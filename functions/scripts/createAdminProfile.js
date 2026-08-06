import { google } from "googleapis";

const spreadsheetId = process.env.SPREADSHEET_ID;
const uid = process.env.ADMIN_UID;
const email = process.env.ADMIN_EMAIL;
const displayName = process.env.ADMIN_DISPLAY_NAME || "ผู้ดูแลระบบ";

if (!spreadsheetId || spreadsheetId === "YOUR_SPREADSHEET_ID") throw new Error("กรุณากำหนด SPREADSHEET_ID");
if (!uid || !email) throw new Error("กรุณากำหนด ADMIN_UID และ ADMIN_EMAIL");

const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth });
const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Users'!A2:A" });
const exists = (response.data.values || []).some((row) => row[0] === uid);

if (exists) {
  console.log("Admin profile มีอยู่แล้ว ไม่มีการสร้างซ้ำ");
} else {
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'Users'!A:J",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[uid, email, displayName, JSON.stringify(["admin"]), JSON.stringify([]), true, "", "", now, now]]
    }
  });
  console.log("สร้าง Admin profile สำเร็จ");
}

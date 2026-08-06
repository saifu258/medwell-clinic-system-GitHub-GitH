import crypto from "node:crypto";
import { sheetsClient } from "../config/googleSheets.js";
import { SCHEMA } from "../config/schema.js";
import { SPREADSHEET_ID } from "../config/constants.js";
import { AuthorizationError, ExternalServiceError } from "../errors/AppError.js";

const expectedUid = process.env.ADMIN_UID;
const expectedEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase();
const displayName = process.env.ADMIN_DISPLAY_NAME || "ผู้ดูแลระบบ";

export async function bootstrapClinic(authUser) {
  if (!expectedUid || !expectedEmail || authUser.uid !== expectedUid || String(authUser.email || "").toLowerCase() !== expectedEmail) {
    throw new AuthorizationError("บัญชีนี้ไม่ได้รับอนุญาตให้ตั้งค่าระบบครั้งแรก");
  }
  if (!SPREADSHEET_ID || SPREADSHEET_ID === "YOUR_SPREADSHEET_ID") throw new ExternalServiceError("ยังไม่ได้กำหนด Spreadsheet ID");

  const metadata = await sheetsClient.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = new Set((metadata.data.sheets || []).map((sheet) => sheet.properties.title));
  const missingSheets = Object.keys(SCHEMA).filter((title) => !existingSheets.has(title));
  if (missingSheets.length) {
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: missingSheets.map((title) => ({ addSheet: { properties: { title, frozenRowCount: 1 } } })) }
    });
  }

  await sheetsClient.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: Object.entries(SCHEMA).map(([sheetName, headers]) => ({ range: `'${sheetName}'!A1`, values: [headers] }))
    }
  });

  const users = await sheetsClient.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Users'!A2:A" });
  const adminExists = (users.data.values || []).some((row) => row[0] === expectedUid);
  if (!adminExists) {
    const now = new Date().toISOString();
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Users'!A:J",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[expectedUid, expectedEmail, displayName, JSON.stringify(["admin"]), JSON.stringify([]), true, "", "", now, now]] }
    });
  }

  const settings = await sheetsClient.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Settings'!A2:A" });
  if (!(settings.data.values || []).length) {
    const now = new Date().toISOString();
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Settings'!A:E",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [
        ["clinicNameTh", "เมดเวลล์ คลินิก", "ชื่อคลินิกภาษาไทย", now, expectedUid],
        ["timezone", "Asia/Bangkok", "เขตเวลา", now, expectedUid],
        ["pageSize", "20", "จำนวนรายการต่อหน้า", now, expectedUid],
        ["expiryAlertDays", "90", "แจ้งเตือนยาหมดอายุ", now, expectedUid]
      ] }
    });
  }

  return { initialized: true, sheets: Object.keys(SCHEMA).length, adminUid: expectedUid, bootstrapId: crypto.randomUUID() };
}

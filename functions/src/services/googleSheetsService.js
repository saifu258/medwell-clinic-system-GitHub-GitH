import { sheetsClient } from "../config/googleSheets.js";
import { SPREADSHEET_ID, MASTER_CACHE_MS } from "../config/constants.js";
import { ConflictError, ExternalServiceError, NotFoundError } from "../errors/AppError.js";

const headerCache = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quote = (name) => `'${String(name).replaceAll("'", "''")}'`;

async function withRetry(operation, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try { return await operation(); } catch (error) {
      last = error;
      if (![429, 500, 502, 503, 504].includes(error?.code) || i === attempts - 1) break;
      await sleep(250 * (2 ** i) + Math.floor(Math.random() * 100));
    }
  }
  if (last instanceof NotFoundError || last instanceof ConflictError) throw last;
  throw new ExternalServiceError("ไม่สามารถติดต่อฐานข้อมูล Google Sheets ได้");
}

function valuesToObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
}

export async function getSheetHeaders(sheetName) {
  const cached = headerCache.get(sheetName);
  if (cached && Date.now() - cached.at < MASTER_CACHE_MS) return cached.value;
  const response = await withRetry(() => sheetsClient.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${quote(sheetName)}!1:1` }));
  const headers = response.data.values?.[0] || [];
  if (!headers.length) throw new ExternalServiceError(`ไม่พบ Header ของชีต ${sheetName}`);
  headerCache.set(sheetName, { value: headers, at: Date.now() });
  return headers;
}

export async function getAllRows(sheetName) {
  const headers = await getSheetHeaders(sheetName);
  const response = await withRetry(() => sheetsClient.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${quote(sheetName)}!A2:ZZ` }));
  return (response.data.values || []).map((row, index) => ({ ...valuesToObject(headers, row), _rowNumber: index + 2 }));
}

export async function findRowById(sheetName, idColumn, id) {
  const row = (await getAllRows(sheetName)).find((item) => item[idColumn] === String(id));
  if (!row) throw new NotFoundError(`ไม่พบข้อมูล ${sheetName}`);
  return row;
}

export async function findRows(sheetName, filters = {}) {
  return (await getAllRows(sheetName)).filter((row) => Object.entries(filters).every(([key, value]) => value === undefined || String(row[key]).toLowerCase().includes(String(value).toLowerCase())));
}

export async function appendRow(sheetName, data) {
  const headers = await getSheetHeaders(sheetName);
  const values = headers.map((header) => data[header] ?? "");
  await withRetry(() => sheetsClient.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${quote(sheetName)}!A:ZZ`, valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS", requestBody: { values: [values] } }));
  return data;
}

export async function updateRowById(sheetName, idColumn, id, data, expectedUpdatedAt) {
  const current = await findRowById(sheetName, idColumn, id);
  if (expectedUpdatedAt && current.updatedAt && current.updatedAt !== expectedUpdatedAt) throw new ConflictError("ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น กรุณารีเฟรชแล้วลองใหม่");
  const headers = await getSheetHeaders(sheetName);
  const merged = { ...current, ...data }; delete merged._rowNumber;
  await withRetry(() => sheetsClient.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${quote(sheetName)}!A${current._rowNumber}:ZZ${current._rowNumber}`, valueInputOption: "USER_ENTERED", requestBody: { values: [headers.map((header) => merged[header] ?? "")] } }));
  return merged;
}

export async function softDeleteRow(sheetName, idColumn, id, actor) {
  return updateRowById(sheetName, idColumn, id, { active: "false", updatedAt: new Date().toISOString(), updatedBy: actor });
}

export async function batchAppendRows(requests) { for (const request of requests) await appendRow(request.sheetName, request.data); return requests.length; }
export async function batchUpdateRows(requests) { for (const request of requests) await updateRowById(request.sheetName, request.idColumn, request.id, request.data, request.expectedUpdatedAt); return requests.length; }
export const googleSheetsService = { getSheetHeaders, getAllRows, findRowById, findRows, appendRow, updateRowById, softDeleteRow, batchAppendRows, batchUpdateRows };

import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
export const sheetsClient = google.sheets({ version: "v4", auth });

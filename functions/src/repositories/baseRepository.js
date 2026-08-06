import { ID_COLUMNS } from "../config/constants.js";
import { googleSheetsService } from "../services/googleSheetsService.js";

export class BaseRepository {
  constructor(sheetName) { this.sheetName = sheetName; this.idColumn = ID_COLUMNS[sheetName]; }
  list(filters) { return googleSheetsService.findRows(this.sheetName, filters); }
  get(id) { return googleSheetsService.findRowById(this.sheetName, this.idColumn, id); }
  create(data) { return googleSheetsService.appendRow(this.sheetName, data); }
  update(id, data, expectedUpdatedAt) { return googleSheetsService.updateRowById(this.sheetName, this.idColumn, id, data, expectedUpdatedAt); }
  softDelete(id, actor) { return googleSheetsService.softDeleteRow(this.sheetName, this.idColumn, id, actor); }
}

export const repository = (sheetName) => new BaseRepository(sheetName);

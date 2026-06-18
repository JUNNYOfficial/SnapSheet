import type { Cell, Sheet, Workbook } from '../types';

interface SerializableCell {
  value: string;
  formula?: string;
  computed?: number | string;
  style?: { bold?: boolean; align?: 'left' | 'center' | 'right' };
}

interface SerializableSheet {
  id: string;
  name: string;
  cells: Record<string, SerializableCell>;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  mergedCells?: Record<string, { startRow: number; startCol: number; endRow: number; endCol: number }>;
  conditionalFormats?: Sheet['conditionalFormats'];
}

interface SerializableWorkbook {
  version: string;
  sheets: SerializableSheet[];
  activeSheetId: string;
}

export function workbookToJSON(workbook: Workbook): string {
  const serializable: SerializableWorkbook = {
    version: '1.0',
    activeSheetId: workbook.activeSheetId,
    sheets: workbook.sheets.map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      cells: Object.fromEntries(
        Array.from(sheet.cells.entries()).map(([ref, cell]) => [ref, cell]),
      ),
      colWidths: Object.fromEntries(Array.from(sheet.colWidths.entries())),
      rowHeights: Object.fromEntries(Array.from(sheet.rowHeights.entries())),
      mergedCells: Object.fromEntries(Array.from(sheet.mergedCells.entries())),
      conditionalFormats: sheet.conditionalFormats,
    })),
  };
  return JSON.stringify(serializable, null, 2);
}

export function workbookFromJSON(json: string): Workbook {
  const data = JSON.parse(json) as SerializableWorkbook;
  const sheets: Sheet[] = data.sheets.map((s) => ({
    id: s.id,
    name: s.name,
    cells: new Map<string, Cell>(
      Object.entries(s.cells).map(([ref, cell]) => [ref, cell as Cell]),
    ),
    colWidths: new Map<number, number>(
      Object.entries(s.colWidths).map(([col, width]) => [parseInt(col, 10), width]),
    ),
    rowHeights: new Map<number, number>(
      Object.entries(s.rowHeights).map(([row, height]) => [parseInt(row, 10), height]),
    ),
    frozenRows: (s as SerializableSheet & { frozenRows?: number }).frozenRows || 0,
    frozenCols: (s as SerializableSheet & { frozenCols?: number }).frozenCols || 0,
    conditionalFormats: (s as SerializableSheet & { conditionalFormats?: Sheet['conditionalFormats'] }).conditionalFormats || [],
    mergedCells: new Map<string, { startRow: number; startCol: number; endRow: number; endCol: number }>(
      Object.entries(s.mergedCells || {}),
    ) as Sheet['mergedCells'],
  }));
  return {
    sheets,
    activeSheetId: data.activeSheetId || sheets[0]?.id || 'default',
  };
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

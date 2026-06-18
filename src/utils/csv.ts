import type { Cell, Sheet } from '../types';
import { coordsToCell } from './cellRef';

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n') {
        current.push(field);
        field = '';
        rows.push(current);
        current = [];
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        current.push(field);
        field = '';
        rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

export function toCSV(cells: Map<string, Cell>, colWidths: Map<number, number>): string {
  let maxRow = 0;
  let maxCol = 0;
  for (const key of cells.keys()) {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const colNum = letterColToIndex(match[1]);
      const rowNum = parseInt(match[2], 10) - 1;
      maxRow = Math.max(maxRow, rowNum);
      maxCol = Math.max(maxCol, colNum);
    }
  }
  if (colWidths.size > 0) {
    for (const col of colWidths.keys()) {
      maxCol = Math.max(maxCol, col);
    }
  }
  if (cells.size === 0) return '';

  const lines: string[] = [];
  for (let r = 0; r <= maxRow; r++) {
    const rowCells: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const ref = coordsToCell(r, c);
      const cell = cells.get(ref);
      const val = cell ? (cell.formula ? cell.formula : cell.value) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        rowCells.push('"' + val.replace(/"/g, '""') + '"');
      } else {
        rowCells.push(val);
      }
    }
    lines.push(rowCells.join(','));
  }
  return lines.join('\n');
}

function letterColToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
}

export function cellsFromCSV(rows: string[][], startRow: number, startCol: number): Sheet {
  const cells = new Map<string, Cell>();
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const value = rows[r][c];
      if (value !== '') {
        const ref = coordsToCell(startRow + r, startCol + c);
        cells.set(ref, { value });
      }
    }
  }
  return {
    id: 'default',
    name: 'Sheet1',
    cells,
    colWidths: new Map(),
    rowHeights: new Map(),
    frozenRows: 0,
    frozenCols: 0,
    conditionalFormats: [],
    mergedCells: new Map(),
  };
}

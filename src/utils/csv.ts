/**
 * @file utils/csv.ts
 * @description CSV 导入导出工具。
 *              提供 CSV 文本解析、单元格集合导出为 CSV、以及将 CSV 行数据
 *              转换为工作表对象的能力。支持引号字段、转义引号和 CRLF 换行。
 *              被 Toolbar 组件在导入/导出 CSV 时调用。
 */

import type { Cell, Sheet } from '../types';
import { coordsToCell } from './cellRef';

/**
 * 解析 CSV 文本为二维字符串数组。
 * 自动处理引号包围字段、双引号转义、以及 \r\n / \n 换行。
 * @param text CSV 原始文本
 * @returns 按行/列组织的字符串数组，过滤掉完全空行
 */
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

/**
 * 将单元格集合导出为 CSV 字符串。
 * 仅导出包含数据的最小矩形区域，公式单元格导出公式原文。
 * @param cells 单元格映射，key 为单元格引用（如 A1）
 * @param colWidths 列宽映射（用于判断最右侧空列边界）
 * @returns CSV 格式字符串
 */
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

/**
 * 将列字母转换为零基列索引。
 * @param letters 列字母
 * @returns 零基列索引
 */
function letterColToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
}

/**
 * 将 CSV 解析后的行数据转换为工作表对象。
 * 空字符串单元格会被跳过，不写入 cells 映射。
 * @param rows CSV 行数据
 * @param startRow 起始行偏移（零基）
 * @param startCol 起始列偏移（零基）
 * @returns 包含单元格数据的工作表对象
 */
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
    hiddenRows: [],
    hiddenCols: [],
    autoFilter: null,
    conditionalFormats: [],
    mergedCells: new Map(),
    charts: [],
  };
}

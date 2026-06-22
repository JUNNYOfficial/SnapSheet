/**
 * @file utils/excel.test.ts
 * @description Excel 导入导出工具的单元测试。
 *              覆盖工作簿导出为 Buffer、从文件导入并还原单元格数据等场景。
 */

import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToExcelBuffer, importFromExcel } from './excel';
import type { Workbook } from '../types';

function createTestWorkbook(): Workbook {
  return {
    sheets: [
      {
        id: 'sheet1',
        name: 'Sheet1',
        cells: new Map([
          ['A1', { value: 'Name' }],
          ['B1', { value: 'Score' }],
          ['A2', { value: 'Alice' }],
          ['B2', { value: '90' }],
        ]),
        colWidths: new Map(),
        rowHeights: new Map(),
        frozenRows: 0,
        frozenCols: 0,
        hiddenRows: [],
        hiddenCols: [],
        autoFilter: null,
        conditionalFormats: [],
        mergedCells: new Map(),
      },
    ],
    activeSheetId: 'sheet1',
  };
}

describe('excel', () => {
  it('xlsx library round trips basic data', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Score'],
      ['Alice', '90'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: false });
    const wb2 = XLSX.read(data, { type: 'array' });
    const ws2 = wb2.Sheets[wb2.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws2, { header: 1 }) as string[][];
    expect(json).toEqual([
      ['Name', 'Score'],
      ['Alice', '90'],
    ]);
  });

  it('round trips workbook through Excel buffer', async () => {
    const original = createTestWorkbook();
    const buffer = await exportToExcelBuffer(original);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const restored = await importFromExcel(buffer);
    expect(restored.sheets.length).toBe(1);
    expect(restored.sheets[0].data).toContainEqual({ row: 0, col: 0, value: 'Name' });
    expect(restored.sheets[0].data).toContainEqual({ row: 1, col: 1, value: '90' });
  });

  it('throws on empty buffer', async () => {
    await expect(importFromExcel(new ArrayBuffer(0))).rejects.toThrow();
  });
});

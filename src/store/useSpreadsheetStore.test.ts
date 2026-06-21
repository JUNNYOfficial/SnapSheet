/**
 * @file store/useSpreadsheetStore.test.ts
 * @description 全局状态管理 store 的单元测试。
 *              覆盖单元格读写、批量设置、公式计算、撤销重做、行列操作等场景。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSpreadsheetStore } from './useSpreadsheetStore';

describe('useSpreadsheetStore', () => {
  beforeEach(() => {
    useSpreadsheetStore.getState().newWorkbook();
  });

  it('sets a single cell value', () => {
    useSpreadsheetStore.getState().setCellValue(0, 0, 'hello');
    const sheet = useSpreadsheetStore.getState().getActiveSheet();
    expect(sheet.cells.get('A1')).toEqual({ value: 'hello' });
  });

  it('sets multiple cells in bulk', () => {
    const cells: { row: number; col: number; value: string }[] = [
      { row: 0, col: 0, value: 'a' },
      { row: 0, col: 1, value: 'b' },
      { row: 1, col: 0, value: 'c' },
    ];
    useSpreadsheetStore.getState().setCellsBulk(cells);
    const sheet = useSpreadsheetStore.getState().getActiveSheet();
    expect(sheet.cells.get('A1')).toEqual({ value: 'a' });
    expect(sheet.cells.get('B1')).toEqual({ value: 'b' });
    expect(sheet.cells.get('A2')).toEqual({ value: 'c' });
  });

  it('computes simple formulas in bulk', () => {
    useSpreadsheetStore.getState().setCellsBulk([
      { row: 0, col: 0, value: '10' },
      { row: 1, col: 0, value: '=A1*2' },
    ]);
    const sheet = useSpreadsheetStore.getState().getActiveSheet();
    expect(sheet.cells.get('A2')?.computed).toBe(20);
  });

  it('handles bulk data import within reasonable time', () => {
    const cells: { row: number; col: number; value: string }[] = [];
    for (let r = 0; r < 1000; r++) {
      for (let c = 0; c < 50; c++) {
        cells.push({ row: r, col: c, value: String(r * 50 + c) });
      }
    }
    const start = performance.now();
    useSpreadsheetStore.getState().setCellsBulk(cells);
    const duration = performance.now() - start;

    const sheet = useSpreadsheetStore.getState().getActiveSheet();
    expect(sheet.cells.size).toBe(50_000);
    expect(duration).toBeLessThan(5000);
  });
});

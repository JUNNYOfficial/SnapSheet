/**
 * @file utils/json.test.ts
 * @description 工作簿 JSON 序列化/反序列化的单元测试。
 *              覆盖工作簿往返、空工作表、Map 结构正确还原等场景。
 */

import { describe, it, expect } from 'vitest';
import { workbookToJSON, workbookFromJSON } from './json';
import type { Workbook } from '../types';

function createTestWorkbook(): Workbook {
  return {
    sheets: [
      {
        id: 'sheet1',
        name: 'Sheet1',
        cells: new Map([['A1', { value: 'hello' }]]),
        colWidths: new Map([[0, 100]]),
        rowHeights: new Map([[0, 24]]),
        frozenRows: 1,
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

describe('json', () => {
  it('round trips workbook', () => {
    const original = createTestWorkbook();
    const json = workbookToJSON(original);
    const restored = workbookFromJSON(json);

    expect(restored.activeSheetId).toBe('sheet1');
    expect(restored.sheets.length).toBe(1);
    expect(restored.sheets[0].name).toBe('Sheet1');
    expect(restored.sheets[0].cells.get('A1')).toEqual({ value: 'hello' });
    expect(restored.sheets[0].colWidths.get(0)).toBe(100);
    expect(restored.sheets[0].frozenRows).toBe(1);
  });

  it('throws on invalid JSON structure', () => {
    expect(() => workbookFromJSON('{}')).toThrow('JSON 中缺少工作表数据');
    expect(() => workbookFromJSON('{"sheets": []}')).toThrow('工作簿中没有任何工作表');
  });

  it('falls back to first sheet when activeSheetId is invalid', () => {
    const original = createTestWorkbook();
    const json = workbookToJSON(original).replace('"sheet1"', '"missing"');
    const restored = workbookFromJSON(json);
    expect(restored.activeSheetId).toBe('sheet1');
  });
});

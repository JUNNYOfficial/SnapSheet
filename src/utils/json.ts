/**
 * @file utils/json.ts
 * @description 工作簿 JSON 序列化与反序列化工具。
 *              将内存中的 Workbook（包含 Map）转换为可持久化的 JSON 字符串，
 *              并支持从 JSON 恢复为工作簿对象。同时提供通用文件下载辅助函数。
 *              被本地存储、导入导出功能调用。
 */

import type { Cell, Sheet, Workbook } from '../types';

/** 可 JSON 序列化的单元格结构 */
interface SerializableCell {
  value: string;
  formula?: string;
  computed?: number | string;
  style?: { bold?: boolean; align?: 'left' | 'center' | 'right' };
}

/** 可 JSON 序列化的工作表结构 */
interface SerializableSheet {
  id: string;
  name: string;
  cells: Record<string, SerializableCell>;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  frozenRows?: number;
  frozenCols?: number;
  mergedCells?: Record<string, { startRow: number; startCol: number; endRow: number; endCol: number }>;
  conditionalFormats?: Sheet['conditionalFormats'];
}

/** 可 JSON 序列化的工作簿结构 */
interface SerializableWorkbook {
  version: string;
  sheets: SerializableSheet[];
  activeSheetId: string;
}

/**
 * 将 Workbook 对象序列化为格式化的 JSON 字符串。
 * 将 Map 转换为普通对象以便 JSON 序列化。
 * @param workbook 内存中的工作簿对象
 * @returns 格式化后的 JSON 字符串
 */
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
      frozenRows: sheet.frozenRows,
      frozenCols: sheet.frozenCols,
      mergedCells: Object.fromEntries(Array.from(sheet.mergedCells.entries())),
      conditionalFormats: sheet.conditionalFormats,
    })),
  };
  return JSON.stringify(serializable, null, 2);
}

/**
 * 从 JSON 字符串恢复 Workbook 对象。
 * 会自动处理缺失的 frozenRows/frozenCols/conditionalFormats 等字段，
 * 并在 activeSheetId 无效时回退到第一张工作表。
 * @param json 工作簿 JSON 字符串
 * @returns 恢复后的工作簿对象
 * @throws 当 JSON 结构无效或缺少工作表时抛出错误
 */
export function workbookFromJSON(json: string): Workbook {
  const data = JSON.parse(json) as SerializableWorkbook;
  if (!data || typeof data !== 'object') {
    throw new Error('JSON 数据格式无效');
  }
  if (!Array.isArray(data.sheets)) {
    throw new Error('JSON 中缺少工作表数据');
  }
  const sheets: Sheet[] = data.sheets.map((s) => ({
    id: s.id || 'default',
    name: s.name || 'Sheet',
    cells: new Map<string, Cell>(
      Object.entries(s.cells || {}).map(([ref, cell]) => [ref, cell as Cell]),
    ),
    colWidths: new Map<number, number>(
      Object.entries(s.colWidths || {}).map(([col, width]) => [parseInt(col, 10), width]),
    ),
    rowHeights: new Map<number, number>(
      Object.entries(s.rowHeights || {}).map(([row, height]) => [parseInt(row, 10), height]),
    ),
    frozenRows: (s as SerializableSheet & { frozenRows?: number }).frozenRows || 0,
    frozenCols: (s as SerializableSheet & { frozenCols?: number }).frozenCols || 0,
    hiddenRows: (s as SerializableSheet & { hiddenRows?: number[] }).hiddenRows || [],
    hiddenCols: (s as SerializableSheet & { hiddenCols?: number[] }).hiddenCols || [],
    autoFilter: (s as SerializableSheet & { autoFilter?: Sheet['autoFilter'] }).autoFilter || null,
    conditionalFormats: (s as SerializableSheet & { conditionalFormats?: Sheet['conditionalFormats'] }).conditionalFormats || [],
    mergedCells: new Map<string, { startRow: number; startCol: number; endRow: number; endCol: number }>(
      Object.entries(s.mergedCells || {}),
    ) as Sheet['mergedCells'],
  }));
  if (sheets.length === 0) {
    throw new Error('工作簿中没有任何工作表');
  }
  const activeSheetId = data.activeSheetId && sheets.some((s) => s.id === data.activeSheetId)
    ? data.activeSheetId
    : sheets[0].id;
  return {
    sheets,
    activeSheetId,
  };
}

/**
 * 触发浏览器下载文本文件的通用辅助函数。
 * 会自动添加 UTF-8 BOM 以兼容 Excel 等软件。
 * @param content 文件内容
 * @param filename 下载文件名
 * @param mime MIME 类型
 */
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

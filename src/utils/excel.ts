/**
 * @file utils/excel.ts
 * @description Excel 导入导出工具（基于 sheetjs/xlsx）。
 *              提供工作簿/工作表导出为 .xlsx 文件、从 .xlsx 文件导入单元格数据、
 *              以及浏览器下载触发等功能。
 *              被 Toolbar 组件在导入/导出 Excel 时调用。
 */

import * as XLSX from 'xlsx';
import type { Workbook, Sheet } from '../types';
import { cellToCoords } from './cellRef';

/**
 * 将内存中的 Workbook 构建为 xlsx 内部 WorkBook 对象。
 * 保留公式单元格的公式表达式，普通单元格导出原始值或计算值。
 * @param workbook SnapSheet 工作簿
 * @returns xlsx 库使用的 WorkBook
 */
function buildXLSXWorkbook(workbook: Workbook): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  workbook.sheets.forEach((sheet) => {
    const ws: XLSX.WorkSheet = {};

    // 计算数据边界，避免导出全量空单元格
    let maxRow = 0;
    let maxCol = 0;
    sheet.cells.forEach((_, key) => {
      const { row, col } = cellToCoords(key);
      if (row > maxRow) maxRow = row;
      if (col > maxCol) maxCol = col;
    });

    if (sheet.cells.size === 0) {
      // 空表时仍保留至少一个单元格的引用范围，避免 xlsx 报错
      ws['!ref'] = 'A1';
    } else {
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
    }

    sheet.cells.forEach((cell, ref) => {
      const { row, col } = cellToCoords(ref);
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      const xlsxCell: XLSX.CellObject = { t: 's', v: '' };

      if (cell.formula) {
        // 导出公式时去掉开头的 '='，xlsx 内部格式不需要
        xlsxCell.f = cell.formula.slice(1);
        xlsxCell.t = 'n';
        xlsxCell.v = typeof cell.computed === 'number' ? cell.computed : 0;
      } else if (cell.value !== undefined && cell.value !== null) {
        const num = Number(cell.value);
        if (!isNaN(num) && cell.value.trim() !== '' && !isNaN(parseFloat(cell.value))) {
          xlsxCell.t = 'n';
          xlsxCell.v = num;
        } else {
          xlsxCell.t = 's';
          xlsxCell.v = cell.value;
        }
      }

      ws[addr] = xlsxCell;
    });

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  return wb;
}

/**
 * 将 Workbook 导出为 Excel 二进制数据（ArrayBuffer 或 Uint8Array）。
 * @param workbook 工作簿对象
 * @returns .xlsx 文件二进制数据
 */
export function exportToExcelBuffer(workbook: Workbook): ArrayBuffer | Uint8Array {
  const wb = buildXLSXWorkbook(workbook);
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: false });
}

/**
 * 将 Workbook 导出为 Excel 文件并触发浏览器下载。
 * @param workbook 工作簿对象
 * @param filename 下载文件名，默认 'snapsheet.xlsx'
 */
export function exportToExcel(workbook: Workbook, filename: string = 'snapsheet.xlsx'): void {
  const wbout = exportToExcelBuffer(workbook);
  const bytes = wbout instanceof ArrayBuffer ? new Uint8Array(wbout) : wbout;
  const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Excel 导入后的单元格数据结构 */
export type ImportedCell = { row: number; col: number; value: string | null; formula?: string };

/**
 * 读取二进制或字符串形式的 Excel 数据为 xlsx WorkBook。
 * @param data ArrayBuffer、字符串等 Excel 数据
 * @returns xlsx WorkBook
 */
function readExcelData(data: ArrayBuffer | string): XLSX.WorkBook {
  if (typeof data === 'string') {
    return XLSX.read(data, { type: 'binary', cellDates: true, cellNF: true });
  }
  return XLSX.read(data, { type: 'array', cellDates: true, cellNF: true });
}

/**
 * 从 Excel 文件导入单元格数据。
 * @param file File 对象、ArrayBuffer 或 Uint8Array
 * @returns 包含所有工作表数据的对象
 */
export function importFromExcel(file: File | ArrayBuffer | Uint8Array): Promise<{
  name: string;
  sheets: {
    name: string;
    data: ImportedCell[];
  }[];
}> {
  return new Promise((resolve, reject) => {
    const parse = (data: ArrayBuffer | string) => {
      try {
        if (typeof data !== 'string' && data.byteLength === 0) {
          reject(new Error('文件为空'));
          return;
        }
        const wb = readExcelData(data);

        // 检查工作表是否存在
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          reject(new Error('Excel 文件中没有工作表'));
          return;
        }

        const sheets: {
          name: string;
          data: ImportedCell[];
        }[] = [];

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          if (!ws) {
            return;
          }

          const cells: ImportedCell[] = [];
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

          for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
              const addr = XLSX.utils.encode_cell({ r, c });
              const xlsxCell = ws[addr];
              if (!xlsxCell) continue;

              // 优先保留公式
              if (xlsxCell.f) {
                cells.push({ row: r, col: c, value: '=' + String(xlsxCell.f), formula: '=' + String(xlsxCell.f) });
                continue;
              }

              let value: string | null = null;
              if (xlsxCell.v instanceof Date) {
                value = xlsxCell.v.toISOString().slice(0, 10);
              } else if (xlsxCell.v !== undefined && xlsxCell.v !== null) {
                value = String(xlsxCell.v);
              }

              if (value !== null && value !== undefined && value !== '') {
                cells.push({ row: r, col: c, value });
              }
            }
          }

          sheets.push({
            name: sheetName,
            data: cells,
          });
        });

        // 确保至少有一个工作表
        if (sheets.length === 0) {
          reject(new Error('Excel 文件中没有有效的工作表'));
          return;
        }

        resolve({
          name: wb.SheetNames[0] || 'Sheet1',
          sheets,
        });
      } catch (error) {
        console.error('Excel 解析错误:', error);
        reject(new Error('无法解析 Excel 文件: ' + (error as Error).message));
      }
    };

    if (file instanceof ArrayBuffer || file instanceof Uint8Array) {
      const data = file instanceof Uint8Array ? new Uint8Array(file).buffer : file;
      parse(data as ArrayBuffer);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (!data || (!(data instanceof ArrayBuffer) && typeof data !== 'string')) {
          reject(new Error('无效的文件数据格式'));
          return;
        }
        parse(data);
      };
      reader.onerror = () => {
        reject(new Error('读取文件失败，请重试'));
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * 将单个工作表导出为 Excel 文件并触发浏览器下载。
 * @param sheet 工作表对象
 * @param filename 下载文件名，默认 'sheet.xlsx'
 */
export function exportSheetToExcel(
  sheet: Sheet,
  filename: string = 'sheet.xlsx'
): void {
  const ws: XLSX.WorkSheet = {};

  // 计算数据边界
  let maxRow = 0;
  let maxCol = 0;
  sheet.cells.forEach((_, key) => {
    const { row, col } = cellToCoords(key);
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  });

  if (sheet.cells.size === 0) {
    ws['!ref'] = 'A1';
  } else {
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
  }

  sheet.cells.forEach((cell, ref) => {
    const { row, col } = cellToCoords(ref);
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const xlsxCell: XLSX.CellObject = { t: 's', v: '' };

    if (cell.formula) {
      xlsxCell.f = cell.formula.slice(1);
      xlsxCell.t = 'n';
      xlsxCell.v = typeof cell.computed === 'number' ? cell.computed : 0;
    } else if (cell.value !== undefined && cell.value !== null) {
      const num = Number(cell.value);
      if (!isNaN(num) && cell.value.trim() !== '' && !isNaN(parseFloat(cell.value))) {
        xlsxCell.t = 'n';
        xlsxCell.v = num;
      } else {
        xlsxCell.t = 's';
        xlsxCell.v = cell.value;
      }
    }

    ws[addr] = xlsxCell;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.name);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

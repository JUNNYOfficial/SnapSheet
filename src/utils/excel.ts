import * as XLSX from 'xlsx';
import type { Workbook, Sheet } from '../types';
import { coordsToCell } from './cellRef';

export function exportToExcel(workbook: Workbook, filename: string = 'snapsheet.xlsx'): void {
  const wb = XLSX.utils.book_new();

  workbook.sheets.forEach((sheet) => {
    const data: (string | number | null)[][] = [];

    // 找到数据的边界
    let maxRow = 0;
    let maxCol = 0;
    sheet.cells.forEach((_, key) => {
      const [row, col] = key.split(':').map(Number);
      if (row > maxRow) maxRow = row;
      if (col > maxCol) maxCol = col;
    });

    // 创建二维数组
    for (let r = 0; r <= maxRow; r++) {
      const rowData: (string | number | null)[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const ref = coordsToCell(r, c);
        const cell = sheet.cells.get(ref);
        if (cell) {
          // 如果有计算值，使用计算值
          if (cell.computed !== undefined && cell.computed !== null) {
            rowData.push(cell.computed as string | number);
          } else if (cell.value !== undefined && cell.value !== null) {
            rowData.push(cell.value as string | number);
          } else {
            rowData.push(null);
          }
        } else {
          rowData.push(null);
        }
      }
      data.push(rowData);
    }

    // 如果没有数据，创建一个空行
    if (data.length === 0) {
      data.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  // 生成文件并下载
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

export type ImportedCell = { row: number; col: number; value: string | null; formula?: string };

export function importFromExcel(file: File): Promise<{
  name: string;
  sheets: {
    name: string;
    data: ImportedCell[];
  }[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error('文件读取结果为空'));
          return;
        }
        const data = e.target.result;
        
        // 检查数据是否有效
        if (!(data instanceof ArrayBuffer) && typeof data !== 'string') {
          reject(new Error('无效的文件数据格式'));
          return;
        }
        
        const wb = XLSX.read(data, { type: ArrayBuffer.isView(data) ? 'array' : 'binary', cellDates: true, cellNF: true });

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
          
          // 使用 sheet_to_json 进行转换，设置 defval: null 处理空单元格
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false }) as (string | number | null | Date)[][];

          const cells: ImportedCell[] = [];

          json.forEach((row, rowIndex) => {
            if (!row) return;
            row.forEach((cell, colIndex) => {
              // 处理日期对象
              let value: string | null = null;
              if (cell instanceof Date) {
                value = cell.toISOString().slice(0, 10);
              } else if (cell !== null && cell !== undefined) {
                value = String(cell);
              }
              
              // 只添加非空单元格
              if (value !== null && value !== undefined && value !== '') {
                cells.push({ row: rowIndex, col: colIndex, value });
              }
            });
          });

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
    reader.onerror = () => {
      reject(new Error('读取文件失败，请重试'));
    };
    reader.readAsArrayBuffer(file);
  });
}

export function exportSheetToExcel(
  sheet: Sheet,
  filename: string = 'sheet.xlsx'
): void {
  const data: (string | number | null)[][] = [];

  // 找到数据的边界
  let maxRow = 0;
  let maxCol = 0;
  sheet.cells.forEach((_, key) => {
    const [row, col] = key.split(':').map(Number);
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  });

  // 创建二维数组
  for (let r = 0; r <= maxRow; r++) {
    const rowData: (string | number | null)[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const ref = coordsToCell(r, c);
      const cell = sheet.cells.get(ref);
      if (cell) {
        if (cell.computed !== undefined && cell.computed !== null) {
          rowData.push(cell.computed as string | number);
        } else if (cell.value !== undefined && cell.value !== null) {
          rowData.push(cell.value as string | number);
        } else {
          rowData.push(null);
        }
      } else {
        rowData.push(null);
      }
    }
    data.push(rowData);
  }

  if (data.length === 0) {
    data.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
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

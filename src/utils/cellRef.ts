/**
 * @file utils/cellRef.ts
 * @description 单元格引用与坐标转换工具。
 *              负责 "A1" 形式引用与 {row, col} 零基坐标之间的互转，
 *              以及区域引用（如 A1:B5）的解析与展开。
 *              被 Canvas 渲染、公式引擎、导入导出等模块广泛使用。
 */

/**
 * 将零基列索引转换为 Excel 风格的列字母。
 * 例如：0 -> 'A'，25 -> 'Z'，26 -> 'AA'。
 * @param col 零基列索引
 * @returns 列字母
 */
export function colToLetter(col: number): string {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

/**
 * 将 Excel 风格的列字母转换为零基列索引。
 * 例如：'A' -> 0，'Z' -> 25，'AA' -> 26。
 * @param letter 列字母
 * @returns 零基列索引
 */
export function letterToCol(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}

/**
 * 将 "A1" 形式的单元格引用解析为零基坐标。
 * @param ref 单元格引用，如 "A1"、"AA100"
 * @returns { row, col } 零基坐标对象
 * @throws 当引用格式非法时抛出错误
 */
export function cellToCoords(ref: string): { row: number; col: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error('Invalid cell reference: ' + ref);
  return {
    col: letterToCol(match[1]),
    row: parseInt(match[2], 10) - 1,
  };
}

/**
 * 将零基坐标转换为 "A1" 形式的单元格引用。
 * @param row 零基行索引
 * @param col 零基列索引
 * @returns 单元格引用，如 "A1"
 */
export function coordsToCell(row: number, col: number): string {
  return colToLetter(col) + (row + 1);
}

/**
 * 解析区域引用（如 "A1:B5"）为规范化范围坐标。
 * 会自动处理起始/结束顺序颠倒的情况。
 * @param range 区域引用字符串
 * @returns 规范化后的 { startRow, startCol, endRow, endCol }
 */
export function parseRange(range: string): { startRow: number; startCol: number; endRow: number; endCol: number } {
  const [start, end] = range.split(':');
  const startCoords = cellToCoords(start);
  const endCoords = cellToCoords(end);
  return {
    startRow: Math.min(startCoords.row, endCoords.row),
    startCol: Math.min(startCoords.col, endCoords.col),
    endRow: Math.max(startCoords.row, endCoords.row),
    endCol: Math.max(startCoords.col, endCoords.col),
  };
}

/**
 * 展开区域引用为所有单元格引用数组（按行优先顺序）。
 * @param range 区域引用，如 "A1:B5"
 * @returns 单元格引用数组，如 ['A1', 'A2', ..., 'B5']
 */
export function getCellsInRange(range: string): string[] {
  const { startRow, startCol, endRow, endCol } = parseRange(range);
  const cells: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      cells.push(coordsToCell(r, c));
    }
  }
  return cells;
}

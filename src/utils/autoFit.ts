/**
 * @file utils/autoFit.ts
 * @description 自动调整行高/列宽工具函数。
 *              根据单元格内容长度或自动换行后的行数计算合适的尺寸。
 */

import { FONT_FAMILY, FONT_SIZE, DEFAULT_ROW_HEIGHT, MIN_COL_WIDTH, SHEET_ROW_COUNT, SHEET_COL_COUNT } from './constants';
import { coordsToCell, colToLetter } from './cellRef';
import type { Sheet } from '../types';

export interface AutoFitState {
  getColWidth: (col: number) => number;
  setColWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;
}

/** 自动调整指定列宽 */
export function autoFitCols(sheet: Sheet, state: AutoFitState, cols: number[]): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  for (const c of cols) {
    let maxWidth = MIN_COL_WIDTH;
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    const headerWidth = ctx.measureText(colToLetter(c)).width + 24;
    maxWidth = Math.max(maxWidth, headerWidth);
    for (let r = 0; r < SHEET_ROW_COUNT; r++) {
      const cell = sheet.cells.get(coordsToCell(r, c));
      if (!cell || !cell.value) continue;
      const display = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
      const fontSize = cell.style?.fontSize || FONT_SIZE;
      const fontFamily = cell.style?.fontFamily || FONT_FAMILY;
      ctx.font = `${cell.style?.bold ? 'bold ' : ''}${cell.style?.italic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
      const w = ctx.measureText(display).width + 12;
      if (w > maxWidth) maxWidth = w;
    }
    state.setColWidth(c, Math.min(maxWidth, 600));
  }
}

/** 自动调整指定行高 */
export function autoFitRows(sheet: Sheet, state: AutoFitState, rows: number[]): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  for (const r of rows) {
    let maxHeight = DEFAULT_ROW_HEIGHT;
    for (let c = 0; c < SHEET_COL_COUNT; c++) {
      const cell = sheet.cells.get(coordsToCell(r, c));
      if (!cell || !cell.value) continue;
      if (cell.style?.wrap) {
        const display = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
        const fontSize = cell.style?.fontSize || FONT_SIZE;
        const fontFamily = cell.style?.fontFamily || FONT_FAMILY;
        ctx.font = `${cell.style?.bold ? 'bold ' : ''}${cell.style?.italic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
        const colWidth = state.getColWidth(c);
        const maxTextWidth = Math.max(0, colWidth - 12);
        const chars = String(display).split('');
        let line = '';
        let lines = 1;
        for (const char of chars) {
          const test = line + char;
          if (ctx.measureText(test).width > maxTextWidth && line) {
            lines++;
            line = char;
          } else {
            line = test;
          }
        }
        const h = lines * (fontSize + 3) + 8;
        if (h > maxHeight) maxHeight = h;
      }
    }
    state.setRowHeight(r, Math.min(maxHeight, 400));
  }
}

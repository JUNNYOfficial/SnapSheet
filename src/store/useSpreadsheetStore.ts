import { create } from 'zustand';
import type { Cell, Sheet, Workbook, Selection, CellStyle, NumberFormat, BorderStyle } from '../types';
import { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../utils/constants';
import { coordsToCell, cellToCoords, colToLetter, letterToCol } from '../utils/cellRef';
import { createDefaultFormulaEngine } from '../engine/FormulaEngine';

interface SpreadsheetState {
  workbook: Workbook;
  selection: Selection;
  editing: { row: number; col: number } | null;
  formulaBarValue: string;
  scrollLeft: number;
  scrollTop: number;

  getActiveSheet: () => Sheet;
  setActiveSheet: (id: string) => void;
  addSheet: () => void;
  deleteSheet: (id: string) => void;

  setCellValue: (row: number, col: number, value: string) => void;
  commitEdit: (value: string) => void;
  setCellStyle: (row: number, col: number, style: CellStyle) => void;
  applyStyleToSelection: (style: Partial<CellStyle>) => void;
  clearFormatSelection: () => void;

  setSelection: (selection: Selection) => void;
  setEditing: (row: number, col: number | null) => void;
  setFormulaBarValue: (value: string) => void;
  setScroll: (scrollLeft: number, scrollTop: number) => void;

  setColWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;
  getColWidth: (col: number) => number;
  getRowHeight: (row: number) => number;

  insertRow: (row: number) => void;
  deleteRow: (row: number) => void;
  insertCol: (col: number) => void;
  deleteCol: (col: number) => void;

  fillRange: (
    source: { startRow: number; startCol: number; endRow: number; endCol: number },
    target: { startRow: number; startCol: number; endRow: number; endCol: number }
  ) => void;

  sortByColumn: (col: number, direction: 'asc' | 'desc') => void;
  applyNumberFormat: (format: Partial<NumberFormat> | null) => void;
  applyBorderSelection: (side: 'top' | 'bottom' | 'left' | 'right' | 'all' | 'none', style?: BorderStyle) => void;

  pasteCells: (text: string, startRow: number, startCol: number) => void;
  copySelection: () => string;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  loadWorkbook: (workbook: Workbook) => void;
  newWorkbook: () => void;
}

function createSheet(name: string, id: string): Sheet {
  return {
    id,
    name,
    cells: new Map<string, Cell>(),
    colWidths: new Map<number, number>(),
    rowHeights: new Map<number, number>(),
    frozenRows: 0,
    frozenCols: 0,
    conditionalFormats: [],
  };
}

function createInitialWorkbook(): Workbook {
  const sheet1 = createSheet('设计规范', 'sheet-1');

  const headerData: Record<string, string> = {
    'A1': '设计元素类别',
    'B1': '当前状态',
    'C1': '待完善项目',
    'D1': '具体改进建议',
    'E1': '优先级',
  };

  const contentData: Record<string, string> = {
    'A2': '色彩系统',
    'B2': '部分完善',
    'C2': '色卡标准、对比度测试',
    'D2': '增加三级灰色阶梯，完善色彩命名体系',
    'E2': '高',

    'A3': '排版规范',
    'B3': '待完善',
    'C3': '字重分级、行高定义',
    'D3': '明确正文与标题的行高差异，限制字重范围为细体与标准体',
    'E3': '高',

    'A4': '字体样式',
    'B4': '待完善',
    'C4': '字体层级、特殊字符处理',
    'D4': '正文使用宋体，标题使用黑体，避免装饰性字体',
    'E4': '高',

    'A5': '信息层次',
    'B5': '待完善',
    'C5': '视觉权重分配、留白比例',
    'D5': '通过间距和字号建立清晰信息层次，避免过度装饰',
    'E5': '中',

    'A6': '交互元素',
    'B6': '待完善',
    'C6': '按钮尺寸、状态反馈',
    'D6': '避免闪烁效果，提供稳定的状态切换动画',
    'E6': '中',

    'A7': '神经多样性适配',
    'B7': '待完善',
    'C7': '可读性测试、减少认知负担',
    'D7': '确保文本与背景对比度适中，避免高对比度闪烁元素',
    'E7': '高',

    'A8': '表格样式',
    'B8': '待完善',
    'C8': '边框样式、行高优化',
    'D8': '使用细腻分隔线，保持行高一致，减少视觉干扰',
    'E8': '中',

    'A9': '间距规范',
    'B9': '待完善',
    'C9': '内边距、外边距定义',
    'D9': '建立标准间距倍率，确保元素间呼吸空间充足',
    'E9': '低',

    'A10': '图标系统',
    'B10': '待完善',
    'C10': '线条粗细、风格统一',
    'D10': '使用简洁线条图标，避免复杂图案，保持黑白灰风格',
    'E10': '低',

    'A11': '背景与分隔',
    'B11': '待完善',
    'C11': '背景层次、分隔线使用',
    'D11': '使用浅灰背景区分区域，避免使用彩色边框',
    'E11': '中',

    'A12': '文字可读性',
    'B12': '待完善',
    'C12': '最小字号、行宽控制',
    'D12': '正文不小于14号，行宽保持在60-75字符之间',
    'E12': '高',

    'A13': '动效规范',
    'B13': '待完善',
    'C13': '动画时长、缓动曲线',
    'D13': '避免快速闪烁动画，提供可关闭动效选项',
    'E13': '中',

    'A14': '响应式适配',
    'B14': '待完善',
    'C14': '断点定义、布局调整',
    'D14': '确保不同屏幕尺寸下信息层次保持一致',
    'E14': '低',
  };

  Object.entries(headerData).forEach(([ref, value]) => {
    sheet1.cells.set(ref, { value, style: { bold: true, align: 'center' } });
  });

  Object.entries(contentData).forEach(([ref, value]) => {
    sheet1.cells.set(ref, { value });
  });

  sheet1.colWidths.set(0, 140);
  sheet1.colWidths.set(1, 120);
  sheet1.colWidths.set(2, 200);
  sheet1.colWidths.set(3, 340);
  sheet1.colWidths.set(4, 80);
  sheet1.rowHeights.set(0, 36);

  return {
    sheets: [sheet1],
    activeSheetId: 'sheet-1',
  };
}

export const useSpreadsheetStore = create<SpreadsheetState>()((set, get) => {
  const formulaState = {
    engine: null as ReturnType<typeof createDefaultFormulaEngine>['engine'] | null,
    graph: null as ReturnType<typeof createDefaultFormulaEngine>['graph'] | null,
  };

  interface SheetSnapshot {
    cells: Map<string, Cell>;
    colWidths: Map<number, number>;
  }

  const history: SheetSnapshot[] = [];
  const redoStack: SheetSnapshot[] = [];

  const snapshotActiveSheet = (): SheetSnapshot => {
    const sheet = get().getActiveSheet();
    const cells = new Map<string, Cell>();
    for (const [key, cell] of sheet.cells.entries()) {
      cells.set(key, { ...cell });
    }
    const colWidths = new Map<number, number>();
    for (const [key, width] of sheet.colWidths.entries()) {
      colWidths.set(key, width);
    }
    return { cells, colWidths };
  };

  const pushHistory = () => {
    history.push(snapshotActiveSheet());
    while (history.length > 100) history.shift();
    redoStack.length = 0;
  };

  const restoreFromSnapshot = (snapshot: SheetSnapshot) => {
    const sheet = get().getActiveSheet();
    sheet.cells.clear();
    for (const [key, cell] of snapshot.cells.entries()) {
      sheet.cells.set(key, { ...cell });
    }
    sheet.colWidths.clear();
    for (const [key, width] of snapshot.colWidths.entries()) {
      sheet.colWidths.set(key, width);
    }
    set({ workbook: { ...get().workbook } });
  };

  const getCellFromStore = (ref: string): Cell | undefined => {
    const sheet = get().getActiveSheet();
    return sheet.cells.get(ref);
  };

  const setCellComputedFromStore = (ref: string, value: number | string): void => {
    const state = get();
    const sheet = state.getActiveSheet();
    const cell = sheet.cells.get(ref);
    if (cell) {
      cell.computed = value;
    }
  };

  const initEngine = () => {
    if (!formulaState.engine) {
      const { engine, graph } = createDefaultFormulaEngine(getCellFromStore, setCellComputedFromStore);
      formulaState.engine = engine;
      formulaState.graph = graph;
    }
    return formulaState.engine;
  };

  const shiftFormulaRefs = (formula: string, rowDelta: number, colDelta: number, startRow: number, startCol: number): string => {
    if (!formula.startsWith('=')) return formula;
    return formula.replace(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/g, (match, c1, r1, c2, r2) => {
      const shift = (col: number, row: number) => {
        const newRow = rowDelta > 0 ? (row >= startRow ? row + rowDelta : row) : (row > startRow - 1 ? row + rowDelta : row);
        const newCol = colDelta > 0 ? (col >= startCol ? col + colDelta : col) : (col > startCol - 1 ? col + colDelta : col);
        return colToLetter(newCol) + (newRow + 1);
      };
      const start = shift(letterToCol(c1), parseInt(r1, 10) - 1);
      if (c2 && r2) return start + ':' + shift(letterToCol(c2), parseInt(r2, 10) - 1);
      return start;
    });
  };

  const moveCellRefs = (cell: Cell, rowDelta: number, colDelta: number, startRow: number, startCol: number): Cell => {
    if (!cell.formula) return cell;
    const newFormula = shiftFormulaRefs(cell.formula, rowDelta, colDelta, startRow, startCol);
    if (newFormula === cell.formula) return cell;
    const newCell: Cell = { ...cell, formula: newFormula };
    const engine = initEngine();
    const ref = coordsToCell(0, 0);
    newCell.computed = engine.evaluate(ref, newFormula);
    return newCell;
  };

  return {
    workbook: createInitialWorkbook(),
    selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
    editing: null,
    formulaBarValue: '',
    scrollLeft: 0,
    scrollTop: 0,

    getActiveSheet: () => {
      const state = get();
      return state.workbook.sheets.find((s) => s.id === state.workbook.activeSheetId) || state.workbook.sheets[0];
    },

    setActiveSheet: (id: string) => {
      set((state) => ({
        workbook: { ...state.workbook, activeSheetId: id },
        selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        editing: null,
      }));
    },

    addSheet: () => {
      set((state) => {
        const idx = state.workbook.sheets.length + 1;
        const newSheet = createSheet('Sheet' + idx, 'sheet-' + Date.now());
        return {
          workbook: {
            ...state.workbook,
            sheets: [...state.workbook.sheets, newSheet],
            activeSheetId: newSheet.id,
          },
          selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        };
      });
    },

    deleteSheet: (id: string) => {
      set((state) => {
        if (state.workbook.sheets.length <= 1) return state;
        const remaining = state.workbook.sheets.filter((s) => s.id !== id);
        return {
          workbook: {
            ...state.workbook,
            sheets: remaining,
            activeSheetId: remaining[0].id,
          },
          selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        };
      });
    },

    setCellValue: (row: number, col: number, value: string) => {
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const engine = initEngine();
      const ref = coordsToCell(row, col);
      const sheet = get().getActiveSheet();
      const existing = sheet.cells.get(ref);

      if (existing?.value === value) return;
      pushHistory();

      if (value === '') {
        sheet.cells.delete(ref);
      } else {
        const cell: Cell = { value, style: existing?.style };
        if (value.startsWith('=')) {
          cell.formula = value;
          const result = engine.evaluate(ref, value);
          cell.computed = result;
        }
        sheet.cells.set(ref, cell);
      }

      const recalcResults = engine.recalculate(ref);
      for (const [depRef, val] of recalcResults) {
        const depCell = sheet.cells.get(depRef);
        if (depCell) depCell.computed = val;
      }

      set({ workbook: { ...get().workbook } });
    },

    commitEdit: (value: string) => {
      const state = get();
      if (!state.editing) return;
      const { row, col } = state.editing;
      state.setCellValue(row, col, value);
      set({ editing: null, formulaBarValue: '' });
    },

    setCellStyle: (row: number, col: number, style: CellStyle) => {
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const ref = coordsToCell(row, col);
      const cell = sheet.cells.get(ref) || { value: '' };
      const existingStyle = cell.style || {};
      const needsUpdate = Object.entries(style).some(
        ([k, v]) => (existingStyle as Record<string, unknown>)[k] !== v
      );
      if (!needsUpdate) return;
      pushHistory();
      cell.style = { ...cell.style, ...style };
      sheet.cells.set(ref, cell);
      set({ workbook: { ...get().workbook } });
    },

    applyStyleToSelection: (style: Partial<CellStyle>) => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.min(sel.startRow, sel.endRow)));
      const maxRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.max(sel.startRow, sel.endRow)));
      const minCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.min(sel.startCol, sel.endCol)));
      const maxCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.max(sel.startCol, sel.endCol)));

      let hasChanges = false;
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          const cell = sheet.cells.get(ref) || { value: '' };
          const existingStyle = cell.style || {};
          const needsUpdate = Object.entries(style).some(
            ([k, v]) => (existingStyle as Record<string, unknown>)[k] !== v
          );
          if (needsUpdate) {
            hasChanges = true;
            cell.style = { ...cell.style, ...style };
            sheet.cells.set(ref, cell);
          }
        }
      }
      if (!hasChanges) return;
      pushHistory();
      set({ workbook: { ...get().workbook } });
    },

    clearFormatSelection: () => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.min(sel.startRow, sel.endRow)));
      const maxRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.max(sel.startRow, sel.endRow)));
      const minCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.min(sel.startCol, sel.endCol)));
      const maxCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.max(sel.startCol, sel.endCol)));

      let hasChanges = false;
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          const cell = sheet.cells.get(ref);
          if (cell?.style && Object.keys(cell.style).length > 0) {
            hasChanges = true;
            cell.style = {};
            sheet.cells.set(ref, cell);
          }
        }
      }
      if (!hasChanges) return;
      pushHistory();
      set({ workbook: { ...get().workbook } });
    },

    setSelection: (selection: Selection) => {
      const clamped = {
        startRow: Math.max(0, Math.min(SHEET_ROW_COUNT - 1, selection.startRow)),
        startCol: Math.max(0, Math.min(SHEET_COL_COUNT - 1, selection.startCol)),
        endRow: Math.max(0, Math.min(SHEET_ROW_COUNT - 1, selection.endRow)),
        endCol: Math.max(0, Math.min(SHEET_COL_COUNT - 1, selection.endCol)),
      };
      set({ selection: clamped });
    },

    setEditing: (row: number, col: number | null) => {
      if (col === null) {
        set({ editing: null });
        return;
      }
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const ref = coordsToCell(row, col);
      const cell = sheet.cells.get(ref);
      const value = cell?.formula || cell?.value || '';
      set({ editing: { row, col }, formulaBarValue: value });
    },

    setFormulaBarValue: (value: string) => {
      set({ formulaBarValue: value });
    },

    setScroll: (scrollLeft: number, scrollTop: number) => {
      set({ scrollLeft, scrollTop });
    },

    setColWidth: (col: number, width: number) => {
      if (col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const existing = sheet.colWidths.get(col);
      if (existing === width) return;
      pushHistory();
      sheet.colWidths.set(col, width);
      set({ workbook: { ...get().workbook } });
    },

    setRowHeight: (row: number, height: number) => {
      if (row < 0 || row >= SHEET_ROW_COUNT) return;
      const sheet = get().getActiveSheet();
      const existing = sheet.rowHeights.get(row);
      if (existing === height) return;
      pushHistory();
      sheet.rowHeights.set(row, Math.max(MIN_ROW_HEIGHT, height));
      set({ workbook: { ...get().workbook } });
    },

    getColWidth: (col: number) => {
      const sheet = get().getActiveSheet();
      return sheet.colWidths.get(col) || DEFAULT_COL_WIDTH;
    },

    getRowHeight: (row: number) => {
      const sheet = get().getActiveSheet();
      return sheet.rowHeights.get(row) || DEFAULT_ROW_HEIGHT;
    },

    insertRow: (row: number) => {
      if (row < 0 || row >= SHEET_ROW_COUNT) return;
      pushHistory();
      const sheet = get().getActiveSheet();
      const newCells = new Map<string, Cell>();
      for (const [ref, cell] of sheet.cells.entries()) {
        const coords = cellToCoords(ref);
        if (coords.row < row) {
          newCells.set(ref, cell);
        } else {
          const newRow = coords.row + 1;
          if (newRow >= SHEET_ROW_COUNT) continue;
          const newRef = coordsToCell(newRow, coords.col);
          const movedCell = moveCellRefs(cell, 1, 0, row, 0);
          newCells.set(newRef, movedCell);
        }
      }
      sheet.cells.clear();
      for (const [ref, cell] of newCells.entries()) {
        sheet.cells.set(ref, cell);
      }

      const newRowHeights = new Map<number, number>();
      for (const [r, h] of sheet.rowHeights.entries()) {
        if (r < row) newRowHeights.set(r, h);
        else if (r + 1 < SHEET_ROW_COUNT) newRowHeights.set(r + 1, h);
      }
      sheet.rowHeights.clear();
      for (const [r, h] of newRowHeights.entries()) {
        sheet.rowHeights.set(r, h);
      }

      set({ workbook: { ...get().workbook } });
    },

    deleteRow: (row: number) => {
      if (row < 0 || row >= SHEET_ROW_COUNT) return;
      pushHistory();
      const sheet = get().getActiveSheet();
      const newCells = new Map<string, Cell>();
      for (const [ref, cell] of sheet.cells.entries()) {
        const coords = cellToCoords(ref);
        if (coords.row < row) {
          newCells.set(ref, cell);
        } else if (coords.row > row) {
          const newRow = coords.row - 1;
          const newRef = coordsToCell(newRow, coords.col);
          const movedCell = moveCellRefs(cell, -1, 0, row, 0);
          newCells.set(newRef, movedCell);
        }
      }
      sheet.cells.clear();
      for (const [ref, cell] of newCells.entries()) {
        sheet.cells.set(ref, cell);
      }

      const newRowHeights = new Map<number, number>();
      for (const [r, h] of sheet.rowHeights.entries()) {
        if (r < row) newRowHeights.set(r, h);
        else if (r > row) newRowHeights.set(r - 1, h);
      }
      sheet.rowHeights.clear();
      for (const [r, h] of newRowHeights.entries()) {
        sheet.rowHeights.set(r, h);
      }

      const state = get();
      const sel = state.selection;
      if (sel.startRow >= row) {
        const newRow = Math.max(0, sel.startRow - 1);
        state.setSelection({ startRow: newRow, startCol: sel.startCol, endRow: newRow, endCol: sel.endCol });
      }
      set({ workbook: { ...get().workbook } });
    },

    insertCol: (col: number) => {
      if (col < 0 || col >= SHEET_COL_COUNT) return;
      pushHistory();
      const sheet = get().getActiveSheet();
      const newCells = new Map<string, Cell>();
      for (const [ref, cell] of sheet.cells.entries()) {
        const coords = cellToCoords(ref);
        if (coords.col < col) {
          newCells.set(ref, cell);
        } else {
          const newCol = coords.col + 1;
          if (newCol >= SHEET_COL_COUNT) continue;
          const newRef = coordsToCell(coords.row, newCol);
          const movedCell = moveCellRefs(cell, 0, 1, 0, col);
          newCells.set(newRef, movedCell);
        }
      }
      sheet.cells.clear();
      for (const [ref, cell] of newCells.entries()) {
        sheet.cells.set(ref, cell);
      }

      const newColWidths = new Map<number, number>();
      for (const [c, w] of sheet.colWidths.entries()) {
        if (c < col) newColWidths.set(c, w);
        else if (c + 1 < SHEET_COL_COUNT) newColWidths.set(c + 1, w);
      }
      sheet.colWidths.clear();
      for (const [c, w] of newColWidths.entries()) {
        sheet.colWidths.set(c, w);
      }

      set({ workbook: { ...get().workbook } });
    },

    deleteCol: (col: number) => {
      if (col < 0 || col >= SHEET_COL_COUNT) return;
      pushHistory();
      const sheet = get().getActiveSheet();
      const newCells = new Map<string, Cell>();
      for (const [ref, cell] of sheet.cells.entries()) {
        const coords = cellToCoords(ref);
        if (coords.col < col) {
          newCells.set(ref, cell);
        } else if (coords.col > col) {
          const newCol = coords.col - 1;
          const newRef = coordsToCell(coords.row, newCol);
          const movedCell = moveCellRefs(cell, 0, -1, 0, col);
          newCells.set(newRef, movedCell);
        }
      }
      sheet.cells.clear();
      for (const [ref, cell] of newCells.entries()) {
        sheet.cells.set(ref, cell);
      }

      const newColWidths = new Map<number, number>();
      for (const [c, w] of sheet.colWidths.entries()) {
        if (c < col) newColWidths.set(c, w);
        else if (c > col) newColWidths.set(c - 1, w);
      }
      sheet.colWidths.clear();
      for (const [c, w] of newColWidths.entries()) {
        sheet.colWidths.set(c, w);
      }

      const state = get();
      const sel = state.selection;
      if (sel.startCol >= col) {
        const newCol = Math.max(0, sel.startCol - 1);
        state.setSelection({ startRow: sel.startRow, startCol: newCol, endRow: sel.endRow, endCol: newCol });
      }
      set({ workbook: { ...get().workbook } });
    },

    fillRange: (source, target) => {
      const sHeight = source.endRow - source.startRow + 1;
      const sWidth = source.endCol - source.startCol + 1;
      const tHeight = target.endRow - target.startRow + 1;
      const tWidth = target.endCol - target.startCol + 1;
      if (sHeight <= 0 || sWidth <= 0 || tHeight <= 0 || tWidth <= 0) return;

      pushHistory();
      const sheet = get().getActiveSheet();
      const engine = initEngine();

      const getCellValue = (r: number, c: number): number | string | null => {
        const ref = coordsToCell(r, c);
        const cell = sheet.cells.get(ref);
        if (!cell) return null;
        return cell.computed !== undefined && cell.formula ? cell.computed : cell.value;
      };

      const isSingleRow = sHeight === 1;
      const isSingleCol = sWidth === 1;

      for (let r = target.startRow; r <= target.endRow; r++) {
        for (let c = target.startCol; c <= target.endCol; c++) {
          if (r >= source.startRow && r <= source.endRow && c >= source.startCol && c <= source.endCol) continue;
          const relRow = (r - source.startRow) % sHeight;
          const relCol = (c - source.startCol) % sWidth;
          const srcRow = source.startRow + relRow;
          const srcCol = source.startCol + relCol;
          const srcRef = coordsToCell(srcRow, srcCol);
          const srcCell = sheet.cells.get(srcRef);
          const targetRef = coordsToCell(r, c);

          let value: string | undefined;
          let formula: string | undefined;

          if (isSingleCol && !srcCell?.formula) {
            const nums: number[] = [];
            for (let i = 0; i < sHeight; i++) {
              const v = getCellValue(source.startRow + i, source.startCol);
              const n = typeof v === 'number' ? v : parseFloat(String(v));
              if (!isNaN(n) && String(v).trim() !== '') nums.push(n);
              else break;
            }
            if (nums.length === sHeight && sHeight >= 2) {
              const step = nums[1] - nums[0];
              const idx = r - source.startRow;
              value = String(nums[0] + step * idx);
            }
          } else if (isSingleRow && !srcCell?.formula) {
            const nums: number[] = [];
            for (let i = 0; i < sWidth; i++) {
              const v = getCellValue(source.startRow, source.startCol + i);
              const n = typeof v === 'number' ? v : parseFloat(String(v));
              if (!isNaN(n) && String(v).trim() !== '') nums.push(n);
              else break;
            }
            if (nums.length === sWidth && sWidth >= 2) {
              const step = nums[1] - nums[0];
              const idx = c - source.startCol;
              value = String(nums[0] + step * idx);
            }
          }

          if (srcCell) {
            if (value === undefined && srcCell.formula) {
              formula = shiftFormulaRefs(srcCell.formula, r - srcRow, c - srcCol, 0, 0);
              value = formula;
            } else if (value === undefined) {
              value = srcCell.value;
            }
            const newCell: Cell = { value: value || '', style: srcCell.style };
            if (formula) {
              newCell.formula = formula;
              newCell.computed = engine.evaluate(targetRef, formula);
            }
            sheet.cells.set(targetRef, newCell);
          } else if (value !== undefined) {
            sheet.cells.set(targetRef, { value: String(value) });
          }
        }
      }
      set({ workbook: { ...get().workbook } });
    },

    sortByColumn: (col: number, direction: 'asc' | 'desc') => {
      if (col < 0 || col >= SHEET_COL_COUNT) return;
      const state = get();
      const sheet = state.getActiveSheet();

      const rowValues: { row: number; value: number | string }[] = [];
      for (let r = 0; r < SHEET_ROW_COUNT; r++) {
        const ref = coordsToCell(r, col);
        const cell = sheet.cells.get(ref);
        if (cell) {
          const raw = cell.computed !== undefined && cell.formula ? cell.computed : cell.value;
          rowValues.push({ row: r, value: raw });
        }
      }
      if (rowValues.length === 0) return;

      const parseValue = (v: number | string): number | string => {
        if (typeof v === 'number') return v;
        const n = parseFloat(String(v));
        return isNaN(n) ? String(v) : n;
      };

      rowValues.sort((a, b) => {
        const av = parseValue(a.value);
        const bv = parseValue(b.value);
        if (typeof av === 'number' && typeof bv === 'number') {
          return direction === 'asc' ? av - bv : bv - av;
        }
        return direction === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });

      pushHistory();
      const sortedRows = rowValues.map((rv) => rv.row);
      const newCells = new Map<string, Cell>();
      const newRowHeights = new Map<number, number>();

      for (let i = 0; i < sortedRows.length; i++) {
        const oldRow = sortedRows[i];
        const newRow = i;
        for (let c = 0; c < SHEET_COL_COUNT; c++) {
          const oldRef = coordsToCell(oldRow, c);
          const cell = sheet.cells.get(oldRef);
          if (cell) {
            const newRef = coordsToCell(newRow, c);
            const movedCell = moveCellRefs(cell, newRow - oldRow, 0, 0, 0);
            newCells.set(newRef, movedCell);
          }
        }
        const h = sheet.rowHeights.get(oldRow);
        if (h !== undefined) newRowHeights.set(newRow, h);
      }

      for (const r of sortedRows) {
        for (let c = 0; c < SHEET_COL_COUNT; c++) {
          sheet.cells.delete(coordsToCell(r, c));
        }
        sheet.rowHeights.delete(r);
      }
      for (const [ref, cell] of newCells.entries()) {
        sheet.cells.set(ref, cell);
      }
      for (const [r, h] of newRowHeights.entries()) {
        sheet.rowHeights.set(r, h);
      }
      set({ workbook: { ...get().workbook } });
    },

    applyNumberFormat: (format: Partial<NumberFormat> | null) => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.min(sel.startRow, sel.endRow)));
      const maxRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.max(sel.startRow, sel.endRow)));
      const minCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.min(sel.startCol, sel.endCol)));
      const maxCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.max(sel.startCol, sel.endCol)));

      let hasChanges = false;
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          const cell = sheet.cells.get(ref);
          if (!cell) continue;
          if (format === null) {
            if (cell.numberFormat) {
              hasChanges = true;
              cell.numberFormat = undefined;
            }
            continue;
          }
          const current: NumberFormat = cell.numberFormat || { type: 'general' };
          const next: NumberFormat = { ...current, ...format };
          if (format.decimalPlaces === undefined && current.type === 'number' && format.type === 'number') {
            (next as NumberFormat).decimalPlaces = current.decimalPlaces ?? 2;
          }
          if (JSON.stringify(next) !== JSON.stringify(current)) {
            hasChanges = true;
            cell.numberFormat = next;
          }
        }
      }
      if (!hasChanges) return;
      pushHistory();
      set({ workbook: { ...get().workbook } });
    },

    applyBorderSelection: (side, style = { style: 'thin', color: '#262626' }) => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.min(sel.startRow, sel.endRow)));
      const maxRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.max(sel.startRow, sel.endRow)));
      const minCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.min(sel.startCol, sel.endCol)));
      const maxCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.max(sel.startCol, sel.endCol)));

      const sides: Array<'borderTop' | 'borderBottom' | 'borderLeft' | 'borderRight'> = [];
      if (side === 'all') {
        sides.push('borderTop', 'borderBottom', 'borderLeft', 'borderRight');
      } else if (side === 'top') {
        sides.push('borderTop');
      } else if (side === 'bottom') {
        sides.push('borderBottom');
      } else if (side === 'left') {
        sides.push('borderLeft');
      } else if (side === 'right') {
        sides.push('borderRight');
      }

      let hasChanges = false;
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          let cell = sheet.cells.get(ref);
          if (!cell && side !== 'none') {
            cell = { value: '' };
            sheet.cells.set(ref, cell);
          }
          if (!cell) continue;
          if (!cell.style) cell.style = {};

          if (side === 'none') {
            if (cell.style.borderTop || cell.style.borderBottom || cell.style.borderLeft || cell.style.borderRight) {
              hasChanges = true;
              cell.style.borderTop = undefined;
              cell.style.borderBottom = undefined;
              cell.style.borderLeft = undefined;
              cell.style.borderRight = undefined;
            }
            continue;
          }

          for (const s of sides) {
            let shouldApply = false;
            if (s === 'borderTop' && r === minRow) shouldApply = true;
            if (s === 'borderBottom' && r === maxRow) shouldApply = true;
            if (s === 'borderLeft' && c === minCol) shouldApply = true;
            if (s === 'borderRight' && c === maxCol) shouldApply = true;
            if (shouldApply) {
              const existing = cell.style[s];
              if (!existing || existing.style !== style.style || existing.color !== style.color) {
                hasChanges = true;
                cell.style[s] = { ...style };
              }
            }
          }
        }
      }
      if (!hasChanges) return;
      pushHistory();
      set({ workbook: { ...get().workbook } });
    },

    pasteCells: (text: string, startRow: number, startCol: number) => {
      if (startRow < 0 || startCol < 0 || startRow >= SHEET_ROW_COUNT || startCol >= SHEET_COL_COUNT) return;
      const rows = text.split(/\r?\n/).filter((r) => r.length > 0).map((r) => r.split('\t'));
      if (rows.length === 0) return;
      if (rows.length === 1 && rows[0].length === 1) {
        get().setCellValue(startRow, startCol, rows[0][0]);
        return;
      }
      pushHistory();
      const engine = initEngine();
      const sheet = get().getActiveSheet();
      for (let r = 0; r < rows.length; r++) {
        if (startRow + r >= SHEET_ROW_COUNT) break;
        for (let c = 0; c < rows[r].length; c++) {
          if (startCol + c >= SHEET_COL_COUNT) break;
          const value = rows[r][c];
          const ref = coordsToCell(startRow + r, startCol + c);
          const cell: Cell = { value };
          if (value.startsWith('=')) {
            cell.formula = value;
            const result = engine.evaluate(ref, value);
            cell.computed = result;
          }
          sheet.cells.set(ref, cell);
        }
      }
      set({ workbook: { ...get().workbook } });
    },

    copySelection: () => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);

      const lines: string[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const rowCells: string[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          const cell = sheet.cells.get(ref);
          if (cell) {
            const display = cell.computed !== undefined ? String(cell.computed) : cell.value;
            rowCells.push(display);
          } else {
            rowCells.push('');
          }
        }
        lines.push(rowCells.join('\t'));
      }
      return lines.join('\n');
    },

    clearSelection: () => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.min(sel.startRow, sel.endRow)));
      const maxRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.max(sel.startRow, sel.endRow)));
      const minCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.min(sel.startCol, sel.endCol)));
      const maxCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.max(sel.startCol, sel.endCol)));

      let hasChanges = false;
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          if (sheet.cells.has(ref)) {
            hasChanges = true;
            break;
          }
        }
        if (hasChanges) break;
      }
      if (!hasChanges) return;
      pushHistory();

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          sheet.cells.delete(ref);
        }
      }
      set({ workbook: { ...get().workbook } });
    },

    undo: () => {
      if (history.length === 0) return;
      const current = snapshotActiveSheet();
      redoStack.push(current);
      const previous = history.pop()!;
      restoreFromSnapshot(previous);
    },

    redo: () => {
      if (redoStack.length === 0) return;
      const current = snapshotActiveSheet();
      history.push(current);
      const next = redoStack.pop()!;
      restoreFromSnapshot(next);
    },

    canUndo: () => history.length > 0,
    canRedo: () => redoStack.length > 0,

    loadWorkbook: (workbook: Workbook) => {
      set({
        workbook,
        selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        editing: null,
        formulaBarValue: '',
      });
    },

    newWorkbook: () => {
      set({
        workbook: createInitialWorkbook(),
        selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        editing: null,
        formulaBarValue: '',
      });
    },
  };
});

export { SHEET_ROW_COUNT, SHEET_COL_COUNT };

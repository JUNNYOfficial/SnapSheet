import { create } from 'zustand';
import type { Cell, Sheet, Workbook, Selection, CellStyle } from '../types';
import { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../utils/constants';
import { coordsToCell } from '../utils/cellRef';
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

  setSelection: (selection: Selection) => void;
  setEditing: (row: number, col: number | null) => void;
  setFormulaBarValue: (value: string) => void;
  setScroll: (scrollLeft: number, scrollTop: number) => void;

  setColWidth: (col: number, width: number) => void;
  getColWidth: (col: number) => number;
  getRowHeight: (row: number) => number;

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

    getColWidth: (col: number) => {
      const sheet = get().getActiveSheet();
      return sheet.colWidths.get(col) || DEFAULT_COL_WIDTH;
    },

    getRowHeight: (row: number) => {
      const sheet = get().getActiveSheet();
      return sheet.rowHeights.get(row) || DEFAULT_ROW_HEIGHT;
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

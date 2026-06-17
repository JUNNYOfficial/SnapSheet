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
  const sheet1 = createSheet('Sheet1', 'sheet-1');
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

  const history: Map<string, Cell>[] = [];
  const redoStack: Map<string, Cell>[] = [];

  const snapshotActiveSheetCells = (): Map<string, Cell> => {
    const sheet = get().getActiveSheet();
    const snapshot = new Map<string, Cell>();
    for (const [key, cell] of sheet.cells.entries()) {
      snapshot.set(key, { ...cell });
    }
    return snapshot;
  };

  const pushHistory = () => {
    history.push(snapshotActiveSheetCells());
    while (history.length > 100) history.shift();
    redoStack.length = 0;
  };

  const restoreCellsFromSnapshot = (snapshot: Map<string, Cell>) => {
    const sheet = get().getActiveSheet();
    sheet.cells.clear();
    for (const [key, cell] of snapshot.entries()) {
      sheet.cells.set(key, { ...cell });
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
      const sheet = get().getActiveSheet();
      const ref = coordsToCell(row, col);
      const cell = sheet.cells.get(ref) || { value: '' };
      cell.style = { ...cell.style, ...style };
      sheet.cells.set(ref, cell);
      set({ workbook: { ...get().workbook } });
    },

    applyStyleToSelection: (style: Partial<CellStyle>) => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          const cell = sheet.cells.get(ref) || { value: '' };
          cell.style = { ...cell.style, ...style };
          sheet.cells.set(ref, cell);
        }
      }
      set({ workbook: { ...get().workbook } });
    },

    setSelection: (selection: Selection) => {
      set({ selection });
    },

    setEditing: (row: number, col: number | null) => {
      if (col === null) {
        set({ editing: null });
        return;
      }
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
      const sheet = get().getActiveSheet();
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
        for (let c = 0; c < rows[r].length; c++) {
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
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);

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
      const current = snapshotActiveSheetCells();
      redoStack.push(current);
      const previous = history.pop()!;
      restoreCellsFromSnapshot(previous);
    },

    redo: () => {
      if (redoStack.length === 0) return;
      const current = snapshotActiveSheetCells();
      history.push(current);
      const next = redoStack.pop()!;
      restoreCellsFromSnapshot(next);
    },

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

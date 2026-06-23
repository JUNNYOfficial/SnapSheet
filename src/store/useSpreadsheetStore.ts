/**
 * @file store/useSpreadsheetStore.ts
 * @description 电子表格全局状态管理（基于 Zustand）。
 *              维护工作簿、工作表、选择区域、编辑状态、滚动位置等核心状态，
 *              提供单元格读写、行列操作、公式计算、撤销重做、本地存储等完整 API。
 *              被 Spreadsheet、Toolbar、FormulaBar、SheetTabs 等组件共同使用。
 */

import { create } from 'zustand';
import type { Cell, Sheet, Workbook, Selection, CellStyle, NumberFormat, BorderStyle, MergeRange, ConditionalFormat, ValidationRule, Chart } from '../types';
import { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../utils/constants';
import { coordsToCell, cellToCoords, colToLetter, letterToCol } from '../utils/cellRef';
import { applyTemplateToSheet } from '../templates';
import { createDefaultFormulaEngine, CycleError } from '../engine/FormulaEngine';

/** 电子表格全局状态接口 */
interface SpreadsheetState {
  workbook: Workbook;
  selection: Selection;
  editing: { row: number; col: number } | null;
  /** 进入编辑时保存的原始值，用于 Esc 取消恢复 */
  editOriginalValue: string;
  formulaBarValue: string;
  scrollLeft: number;
  scrollTop: number;
  isDirty: boolean;
  /** 格式刷源样式 */
  formatPainterStyle: CellStyle | null;
  /** 格式刷是否持续模式 */
  formatPainterPersistent: boolean;

  getActiveSheet: () => Sheet;
  setActiveSheet: (id: string) => void;
  addSheet: () => void;
  deleteSheet: (id: string) => void;
  renameSheet: (id: string, name: string) => void;

  setCellValue: (row: number, col: number, value: string) => void;
  setCellsBulk: (cells: { row: number; col: number; value: string }[]) => void;
  commitEdit: (value: string) => void;
  /** 取消当前编辑并恢复原始值 */
  cancelEdit: () => void;
  setCellStyle: (row: number, col: number, style: CellStyle) => void;
  applyStyleToSelection: (style: Partial<CellStyle>) => void;
  clearFormatSelection: () => void;
  copyFormatPainter: () => void;
  applyFormatPainter: () => void;
  clearFormatPainter: () => void;
  /** 隐藏指定行 */
  hideRows: (rows: number[]) => void;
  /** 取消隐藏指定行 */
  unhideRows: (rows: number[]) => void;
  /** 隐藏指定列 */
  hideCols: (cols: number[]) => void;
  /** 取消隐藏指定列 */
  unhideCols: (cols: number[]) => void;
  /** 取消所有隐藏 */
  unhideAll: () => void;
  /** 行是否隐藏 */
  isRowHidden: (row: number) => boolean;
  /** 列是否隐藏 */
  isColHidden: (col: number) => boolean;
  /** 应用/切换自动筛选 */
  applyAutoFilter: () => void;
  /** 设置某列的筛选值 */
  setAutoFilterColumn: (col: number, visibleValues: string[]) => void;
  /** 清除自动筛选 */
  clearAutoFilter: () => void;
  /** 根据自动筛选配置刷新隐藏行（内部使用） */
  refreshAutoFilterHiddenRows: () => void;
  /** 添加图表 */
  addChart: (chart: Omit<Chart, 'id'>) => void;
  /** 删除图表 */
  removeChart: (id: string) => void;
  /** 更新图表 */
  updateChart: (id: string, patch: Partial<Chart>) => void;

  setSelection: (selection: Selection) => void;
  setEditing: (row: number, col: number | null) => void;
  setFormulaBarValue: (value: string) => void;
  setScroll: (scrollLeft: number, scrollTop: number) => void;
  markSaved: () => void;

  insertRow: (row: number) => void;
  deleteRow: (row: number) => void;
  insertCol: (col: number) => void;
  deleteCol: (col: number) => void;

  setColWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;
  getColWidth: (col: number) => number;
  getRowHeight: (row: number) => number;

  setFrozenRows: (rows: number) => void;
  setFrozenCols: (cols: number) => void;

  fillRange: (
    source: { startRow: number; startCol: number; endRow: number; endCol: number },
    target: { startRow: number; startCol: number; endRow: number; endCol: number }
  ) => void;

  sortByColumn: (col: number, direction: 'asc' | 'desc') => void;
  applyNumberFormat: (format: Partial<NumberFormat> | null) => void;
  applyBorderSelection: (side: 'top' | 'bottom' | 'left' | 'right' | 'all' | 'outside' | 'none', style?: BorderStyle) => void;
  mergeCells: () => void;
  unmergeCells: () => void;
  getMergedRange: (row: number, col: number) => MergeRange | null;
  isCellMerged: (row: number, col: number) => boolean;

  addConditionalFormat: (format: ConditionalFormat) => void;
  clearConditionalFormats: () => void;
  setCellComment: (row: number, col: number, comment: string) => void;
  deleteCellComment: (row: number, col: number) => void;
  setCellValidation: (row: number, col: number, rule: ValidationRule) => void;
  clearCellValidation: (row: number, col: number) => void;
  validateCellValue: (value: string, rule?: ValidationRule) => string | true;
  applyTemplate: (templateId: string) => void;

  pasteCells: (text: string, startRow: number, startCol: number) => void;
  copySelection: () => string;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  loadWorkbook: (workbook: Workbook) => void;
  newWorkbook: () => void;
  saveWorkbook: (filename?: string) => boolean;
  loadFromStorage: (filename?: string) => boolean;
  listSavedWorkbooks: () => { name: string; savedAt?: string }[];
}

/**
 * 创建空工作表。
 * @param name 工作表名称
 * @param id 工作表唯一标识
 * @returns 空工作表对象
 */
function createSheet(name: string, id: string): Sheet {
  return {
    id,
    name,
    cells: new Map<string, Cell>(),
    colWidths: new Map<number, number>(),
    rowHeights: new Map<number, number>(),
    frozenRows: 0,
    frozenCols: 0,
    hiddenRows: [],
    hiddenCols: [],
    autoFilter: null,
    conditionalFormats: [],
    mergedCells: new Map<string, MergeRange>(),
    charts: [],
  };
}

/**
 * 创建初始工作簿，默认包含一张名为 Sheet1 的工作表。
 * @returns 初始工作簿对象
 */
function createInitialWorkbook(): Workbook {
  const sheet1 = createSheet('Sheet1', 'sheet-1');
  return {
    sheets: [sheet1],
    activeSheetId: 'sheet-1',
  };
}

export const useSpreadsheetStore = create<SpreadsheetState>()((set, get) => {
  /** 公式引擎与依赖图状态，懒加载并缓存 */
  const formulaState = {
    engine: null as ReturnType<typeof createDefaultFormulaEngine>['engine'] | null,
    graph: null as ReturnType<typeof createDefaultFormulaEngine>['graph'] | null,
    failed: false,
  };

  /** 工作表快照，用于撤销重做 */
  interface SheetSnapshot {
    cells: Map<string, Cell>;
    colWidths: Map<number, number>;
  }

  /** 撤销历史栈 */
  const history: SheetSnapshot[] = [];
  /** 重做栈 */
  const redoStack: SheetSnapshot[] = [];

  /**
   * 对当前工作表生成快照（深拷贝单元格与列宽）。
   * @returns 工作表快照
   */
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

  /**
   * 将当前工作表状态推入撤销栈，并清空重做栈。
   * 历史记录上限为 100 条。
   */
  const pushHistory = () => {
    history.push(snapshotActiveSheet());
    while (history.length > 100) history.shift();
    redoStack.length = 0;
  };

  /**
   * 从快照恢复当前工作表状态。
   * @param snapshot 工作表快照
   */
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
    set({ workbook: { ...get().workbook }, isDirty: true });
  };

  /**
   * 从当前工作表读取单元格数据，供公式引擎使用。
   * @param ref 单元格引用
   * @returns 单元格数据或 undefined
   */
  const getCellFromStore = (ref: string): Cell | undefined => {
    const sheet = get().getActiveSheet();
    return sheet.cells.get(ref);
  };

  /**
   * 将公式计算结果写回单元格，供公式引擎使用。
   * @param ref 单元格引用
   * @param value 计算结果或错误字符串
   */
  const setCellComputedFromStore = (ref: string, value: number | string): void => {
    const state = get();
    const sheet = state.getActiveSheet();
    const cell = sheet.cells.get(ref);
    if (cell) {
      cell.computed = value;
    }
  };

  /**
   * 懒初始化公式引擎。
   * @param silent 初始化失败时是否不弹窗提示
   * @returns 公式引擎实例或 null
   */
  const initEngine = (silent = false) => {
    if (formulaState.failed) return null;
    if (!formulaState.engine) {
      try {
        const { engine, graph } = createDefaultFormulaEngine(getCellFromStore, setCellComputedFromStore);
        formulaState.engine = engine;
        formulaState.graph = graph;
      } catch (err) {
        formulaState.failed = true;
        console.error('公式引擎初始化失败:', err);
        if (!silent) {
          window.alert('公式引擎初始化失败，公式计算功能暂不可用。普通数据导入和编辑仍可继续使用。');
        }
        return null;
      }
    }
    return formulaState.engine;
  };

  /**
   * 在插入/删除行列后，平移公式中的单元格引用。
   * @param formula 原始公式
   * @param rowDelta 行偏移量（插入为正，删除为负）
   * @param colDelta 列偏移量
   * @param startRow 开始平移的行
   * @param startCol 开始平移的列
   * @returns 平移后的公式
   */
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

  /**
   * 移动单元格时同步更新其公式引用并重新计算。
   * @param cell 原始单元格
   * @param rowDelta 行偏移量
   * @param colDelta 列偏移量
   * @param startRow 开始平移的行
   * @param startCol 开始平移的列
   * @returns 更新后的单元格
   */
  const moveCellRefs = (cell: Cell, rowDelta: number, colDelta: number, startRow: number, startCol: number): Cell => {
    if (!cell.formula) return cell;
    const newFormula = shiftFormulaRefs(cell.formula, rowDelta, colDelta, startRow, startCol);
    if (newFormula === cell.formula) return cell;
    const newCell: Cell = { ...cell, formula: newFormula };
    const engine = initEngine();
    if (engine) {
      const ref = coordsToCell(0, 0);
      newCell.computed = engine.evaluate(ref, newFormula);
    }
    return newCell;
  };

  return {
    /** 当前工作簿 */
    workbook: createInitialWorkbook(),
    /** 当前选择区域 */
    selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
    /** 当前正在编辑的单元格 */
    editing: null,
    /** 进入编辑时保存的原始值 */
    editOriginalValue: '',
    /** 公式栏当前值 */
    formulaBarValue: '',
    /** 水平滚动偏移 */
    scrollLeft: 0,
    /** 垂直滚动偏移 */
    scrollTop: 0,
    isDirty: false,
    formatPainterStyle: null,
    formatPainterPersistent: false,

    /** 获取当前激活的工作表 */
    getActiveSheet: () => {
      const state = get();
      return state.workbook.sheets.find((s) => s.id === state.workbook.activeSheetId) || state.workbook.sheets[0];
    },

    /** 切换激活工作表 */
    setActiveSheet: (id: string) => {
      set((state) => ({
        workbook: { ...state.workbook, activeSheetId: id },
        selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        editing: null,
      }));
    },

    /** 新增工作表并切换为激活状态 */
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

    /** 重命名指定工作表 */
    renameSheet: (id: string, name: string) => {
      set((state) => {
        const sheet = state.workbook.sheets.find((s) => s.id === id);
        if (!sheet || !name.trim()) return state;
        sheet.name = name.trim();
        return { workbook: { ...state.workbook } };
      });
    },

    /** 删除指定工作表，至少保留一张工作表 */
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

    /**
     * 设置单个单元格的值。
     * 公式值会触发公式引擎计算并级联重算依赖单元格。
     * @param row 行索引
     * @param col 列索引
     * @param value 单元格值（公式以 = 开头）
     */
    setCellValue: (row: number, col: number, value: string) => {
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const isFormula = value.startsWith('=');
      const ref = coordsToCell(row, col);
      const sheet = get().getActiveSheet();
      const existing = sheet.cells.get(ref);

      if (existing?.value === value) return;
      pushHistory();

      if (value === '') {
        sheet.cells.delete(ref);
      } else {
        const cell: Cell = { value, style: existing?.style };
        if (isFormula) {
          const engine = initEngine();
          if (engine) {
            cell.formula = value;
            const result = engine.evaluate(ref, value);
            cell.computed = result;
          } else {
            cell.formula = value;
            cell.computed = '#ERR';
          }
        }
        sheet.cells.set(ref, cell);
      }

      const engine = formulaState.engine;
      if (engine) {
        try {
          const recalcResults = engine.recalculate(ref);
          for (const [depRef, val] of recalcResults) {
            const depCell = sheet.cells.get(depRef);
            if (depCell) depCell.computed = val;
          }
        } catch (err) {
          if (err instanceof CycleError) {
            const cell = sheet.cells.get(ref);
            if (cell) cell.computed = '#CYCLE!';
          } else {
            console.error('公式重算失败:', err);
          }
        }
      }

      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 批量设置多个单元格的值。
     * 适合 CSV/Excel 导入等场景，会统一触发公式重算。
     * @param cells 单元格数据数组
     */
    setCellsBulk: (cells: { row: number; col: number; value: string }[]) => {
      if (cells.length === 0) return;
      pushHistory();
      const sheet = get().getActiveSheet();
      const engine = initEngine(true);
      const formulaRefs: string[] = [];

      for (const { row, col, value } of cells) {
        if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) continue;
        const ref = coordsToCell(row, col);
        const existing = sheet.cells.get(ref);
        if (value === '') {
          sheet.cells.delete(ref);
          continue;
        }
        const cell: Cell = { value, style: existing?.style };
        if (value.startsWith('=')) {
          cell.formula = value;
          if (engine) {
            cell.computed = engine.evaluate(ref, value);
            formulaRefs.push(ref);
          } else {
            cell.computed = '#ERR';
          }
        }
        sheet.cells.set(ref, cell);
      }

      if (engine && formulaRefs.length > 0) {
        try {
          const recalcResults = engine.recalculateMany(formulaRefs);
          for (const [depRef, val] of recalcResults) {
            const depCell = sheet.cells.get(depRef);
            if (depCell) depCell.computed = val;
          }
        } catch (err) {
          if (err instanceof CycleError) {
            for (const ref of formulaRefs) {
              const cell = sheet.cells.get(ref);
              if (cell) cell.computed = '#CYCLE!';
            }
          } else {
            console.error('批量公式重算失败:', err);
          }
        }
      }

      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 提交当前编辑单元格的值，并进行数据验证。
     * 若当前选择区域包含多个单元格，则将该值批量填充到整个区域。
     * @param value 用户输入值
     */
    commitEdit: (value: string) => {
      const state = get();
      if (!state.editing) return;
      const { row, col } = state.editing;
      const sheet = state.getActiveSheet();
      const ref = coordsToCell(row, col);
      const cell = sheet.cells.get(ref);
      const validation = cell?.validation;
      if (validation) {
        const result = state.validateCellValue(value, validation);
        if (result !== true) {
          window.alert(result);
          return;
        }
      }

      const sel = state.selection;
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);
      const isMultiCell = maxRow > minRow || maxCol > minCol;

      if (isMultiCell && value !== '') {
        const cells: { row: number; col: number; value: string }[] = [];
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            cells.push({ row: r, col: c, value });
          }
        }
        state.setCellsBulk(cells);
      } else {
        state.setCellValue(row, col, value);
      }

      set({ editing: null, formulaBarValue: '', editOriginalValue: '' });
    },

    /**
     * 取消当前编辑并恢复进入编辑前的原始值。
     * 不生成新的撤销点，避免 Esc 成为一次可撤销操作。
     */
    cancelEdit: () => {
      const state = get();
      if (!state.editing) return;
      const { row, col } = state.editing;
      const originalValue = state.editOriginalValue;
      const sheet = state.getActiveSheet();
      const ref = coordsToCell(row, col);

      if (originalValue === '') {
        sheet.cells.delete(ref);
      } else {
        const existing = sheet.cells.get(ref);
        const cell: Cell = { value: originalValue, style: existing?.style };
        if (originalValue.startsWith('=')) {
          const engine = initEngine(true);
          cell.formula = originalValue;
          cell.computed = engine ? engine.evaluate(ref, originalValue) : '#ERR';
        }
        sheet.cells.set(ref, cell);
      }

      set({ workbook: { ...get().workbook }, isDirty: true, editing: null, formulaBarValue: '', editOriginalValue: '' });
    },

    /**
     * 设置单个单元格的完整样式。
     * @param row 行索引
     * @param col 列索引
     * @param style 单元格样式
     */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 将样式应用到当前选择区域的所有单元格。
     * @param style 部分样式属性
     */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 清除当前选择区域的所有单元格样式 */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 复制当前选择区域首个单元格的样式到格式刷 */
    copyFormatPainter: () => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const cell = sheet.cells.get(coordsToCell(r, c));
          if (cell?.style && Object.keys(cell.style).length > 0) {
            set({ formatPainterStyle: { ...cell.style }, formatPainterPersistent: false });
            return;
          }
        }
      }
      set({ formatPainterStyle: {}, formatPainterPersistent: false });
    },

    /** 将格式刷样式应用到当前选择区域，并清空格式刷 */
    applyFormatPainter: () => {
      const state = get();
      if (!state.formatPainterStyle) return;
      state.applyStyleToSelection(state.formatPainterStyle);
      if (!state.formatPainterPersistent) {
        set({ formatPainterStyle: null });
      }
    },

    /** 清空格式刷状态 */
    clearFormatPainter: () => set({ formatPainterStyle: null, formatPainterPersistent: false }),

    /** 隐藏指定行 */
    hideRows: (rows: number[]) => {
      const state = get();
      const sheet = state.getActiveSheet();
      const setHidden = new Set(sheet.hiddenRows);
      for (const r of rows) {
        setHidden.add(r);
        state.setRowHeight(r, 0);
      }
      sheet.hiddenRows = Array.from(setHidden).sort((a, b) => a - b);
      set({ workbook: { ...state.workbook }, isDirty: true });
    },
    /** 取消隐藏指定行 */
    unhideRows: (rows: number[]) => {
      const state = get();
      const sheet = state.getActiveSheet();
      const setHidden = new Set(sheet.hiddenRows);
      for (const r of rows) {
        if (setHidden.has(r)) {
          setHidden.delete(r);
          state.setRowHeight(r, DEFAULT_ROW_HEIGHT);
        }
      }
      sheet.hiddenRows = Array.from(setHidden).sort((a, b) => a - b);
      set({ workbook: { ...state.workbook }, isDirty: true });
    },
    /** 隐藏指定列 */
    hideCols: (cols: number[]) => {
      const state = get();
      const sheet = state.getActiveSheet();
      const setHidden = new Set(sheet.hiddenCols);
      for (const c of cols) {
        setHidden.add(c);
        state.setColWidth(c, 0);
      }
      sheet.hiddenCols = Array.from(setHidden).sort((a, b) => a - b);
      set({ workbook: { ...state.workbook }, isDirty: true });
    },
    /** 取消隐藏指定列 */
    unhideCols: (cols: number[]) => {
      const state = get();
      const sheet = state.getActiveSheet();
      const setHidden = new Set(sheet.hiddenCols);
      for (const c of cols) {
        if (setHidden.has(c)) {
          setHidden.delete(c);
          state.setColWidth(c, DEFAULT_COL_WIDTH);
        }
      }
      sheet.hiddenCols = Array.from(setHidden).sort((a, b) => a - b);
      set({ workbook: { ...state.workbook }, isDirty: true });
    },
    /** 取消所有隐藏 */
    unhideAll: () => {
      const state = get();
      const sheet = state.getActiveSheet();
      for (const r of sheet.hiddenRows) state.setRowHeight(r, DEFAULT_ROW_HEIGHT);
      for (const c of sheet.hiddenCols) state.setColWidth(c, DEFAULT_COL_WIDTH);
      sheet.hiddenRows = [];
      sheet.hiddenCols = [];
      set({ workbook: { ...state.workbook }, isDirty: true });
    },
    /** 行是否隐藏 */
    isRowHidden: (row: number) => get().getActiveSheet().hiddenRows.includes(row),
    /** 列是否隐藏 */
    isColHidden: (col: number) => get().getActiveSheet().hiddenCols.includes(col),

    /** 应用或取消自动筛选，根据当前选择区域确定表头行和列范围 */
    applyAutoFilter: () => {
      const state = get();
      const sheet = state.getActiveSheet();
      const sel = state.selection;
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);

      // 再次点击已存在且范围相同的筛选则清除
      if (sheet.autoFilter && sheet.autoFilter.headerRow === minRow && sheet.autoFilter.startCol === minCol && sheet.autoFilter.endCol === maxCol) {
        state.clearAutoFilter();
        return;
      }

      // 默认以选择区域的首行作为表头
      const filters: Record<number, string[]> = {};
      for (let c = minCol; c <= maxCol; c++) {
        const values = new Set<string>();
        for (let r = minRow + 1; r <= maxRow && r < SHEET_ROW_COUNT; r++) {
          const cell = sheet.cells.get(coordsToCell(r, c));
          values.add(cell ? String(cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : '');
        }
        filters[c] = Array.from(values);
      }
      sheet.autoFilter = { headerRow: minRow, startCol: minCol, endCol: maxCol, filters };
      state.refreshAutoFilterHiddenRows();
      pushHistory();
      set({ workbook: { ...state.workbook }, isDirty: true });
    },

    /** 设置某列的可见值并刷新隐藏行 */
    setAutoFilterColumn: (col: number, visibleValues: string[]) => {
      const state = get();
      const sheet = state.getActiveSheet();
      if (!sheet.autoFilter) return;
      sheet.autoFilter.filters[col] = visibleValues;
      state.refreshAutoFilterHiddenRows();
      pushHistory();
      set({ workbook: { ...state.workbook }, isDirty: true });
    },

    /** 清除自动筛选 */
    clearAutoFilter: () => {
      const state = get();
      const sheet = state.getActiveSheet();
      sheet.autoFilter = null;
      // 恢复所有由筛选导致的隐藏行
      for (const r of sheet.hiddenRows) state.setRowHeight(r, DEFAULT_ROW_HEIGHT);
      sheet.hiddenRows = [];
      set({ workbook: { ...state.workbook }, isDirty: true });
    },

    /** 根据当前自动筛选配置刷新隐藏行 */
    refreshAutoFilterHiddenRows: () => {
      const state = get();
      const sheet = state.getActiveSheet();
      if (!sheet.autoFilter) return;
      const { headerRow, startCol, endCol, filters } = sheet.autoFilter;
      const newHidden = new Set<number>();
      for (let r = headerRow + 1; r < SHEET_ROW_COUNT; r++) {
        let hide = false;
        for (let c = startCol; c <= endCol; c++) {
          const visible = filters[c];
          if (!visible || visible.length === 0) continue;
          const cell = sheet.cells.get(coordsToCell(r, c));
          const value = cell ? String(cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : '';
          if (!visible.includes(value)) {
            hide = true;
            break;
          }
        }
        if (hide) newHidden.add(r);
      }
      // 先取消所有行的隐藏，再重新设置
      for (const r of sheet.hiddenRows) state.setRowHeight(r, DEFAULT_ROW_HEIGHT);
      for (const r of newHidden) state.setRowHeight(r, 0);
      sheet.hiddenRows = Array.from(newHidden).sort((a, b) => a - b);
    },

    /** 添加图表 */
    addChart: (chart: Omit<Chart, 'id'>) => {
      const state = get();
      const sheet = state.getActiveSheet();
      const newChart: Chart = { ...chart, id: crypto.randomUUID() };
      sheet.charts = [...sheet.charts, newChart];
      pushHistory();
      set({ workbook: { ...state.workbook }, isDirty: true });
    },

    /** 删除图表 */
    removeChart: (id: string) => {
      const state = get();
      const sheet = state.getActiveSheet();
      sheet.charts = sheet.charts.filter((c) => c.id !== id);
      pushHistory();
      set({ workbook: { ...state.workbook }, isDirty: true });
    },

    /** 更新图表 */
    updateChart: (id: string, patch: Partial<Chart>) => {
      const state = get();
      const sheet = state.getActiveSheet();
      sheet.charts = sheet.charts.map((c) => (c.id === id ? { ...c, ...patch } : c));
      pushHistory();
      set({ workbook: { ...state.workbook }, isDirty: true });
    },

    /**
     * 设置当前选择区域，并自动限制在工作表边界内。
     * @param selection 选择区域
     */
    setSelection: (selection: Selection) => {
      const clamped = {
        startRow: Math.max(0, Math.min(SHEET_ROW_COUNT - 1, selection.startRow)),
        startCol: Math.max(0, Math.min(SHEET_COL_COUNT - 1, selection.startCol)),
        endRow: Math.max(0, Math.min(SHEET_ROW_COUNT - 1, selection.endRow)),
        endCol: Math.max(0, Math.min(SHEET_COL_COUNT - 1, selection.endCol)),
      };
      set({ selection: clamped });
    },

    /**
     * 设置当前正在编辑的单元格。
     * @param row 行索引
     * @param col 列索引，传 null 表示退出编辑
     */
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
      set({ editing: { row, col }, formulaBarValue: value, editOriginalValue: value });
    },

    /** 设置公式栏显示值 */
    setFormulaBarValue: (value: string) => {
      set({ formulaBarValue: value });
    },

    /** 设置滚动偏移 */
    setScroll: (scrollLeft: number, scrollTop: number) => {
      set({ scrollLeft, scrollTop });
    },

    /** 标记当前工作簿已保存，清除脏状态 */
    markSaved: () => {
      set({ isDirty: false });
    },

    /**
     * 设置列宽。
     * @param col 列索引
     * @param width 宽度（px）
     */
    setColWidth: (col: number, width: number) => {
      if (col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const existing = sheet.colWidths.get(col);
      if (existing === width) return;
      pushHistory();
      sheet.colWidths.set(col, width);
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 设置行高。
     * @param row 行索引
     * @param height 高度（px）
     */
    setRowHeight: (row: number, height: number) => {
      if (row < 0 || row >= SHEET_ROW_COUNT) return;
      const sheet = get().getActiveSheet();
      const existing = sheet.rowHeights.get(row);
      if (existing === height) return;
      pushHistory();
      sheet.rowHeights.set(row, Math.max(MIN_ROW_HEIGHT, height));
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 获取列宽，未设置时返回默认值 */
    getColWidth: (col: number) => {
      const sheet = get().getActiveSheet();
      return sheet.colWidths.get(col) || DEFAULT_COL_WIDTH;
    },

    /** 获取行高，未设置时返回默认值 */
    getRowHeight: (row: number) => {
      const sheet = get().getActiveSheet();
      return sheet.rowHeights.get(row) || DEFAULT_ROW_HEIGHT;
    },

    /** 设置冻结行数 */
    setFrozenRows: (rows: number) => {
      const sheet = get().getActiveSheet();
      const value = Math.max(0, Math.min(rows, SHEET_ROW_COUNT));
      if (sheet.frozenRows === value) return;
      pushHistory();
      sheet.frozenRows = value;
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 设置冻结列数 */
    setFrozenCols: (cols: number) => {
      const sheet = get().getActiveSheet();
      const value = Math.max(0, Math.min(cols, SHEET_COL_COUNT));
      if (sheet.frozenCols === value) return;
      pushHistory();
      sheet.frozenCols = value;
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 在指定行前插入新行，并平移后续单元格与公式引用。
     * @param row 插入位置的行索引
     */
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

      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 删除指定行，并平移后续单元格与公式引用。
     * @param row 要删除的行索引
     */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 在指定列前插入新列，并平移后续单元格与公式引用。
     * @param col 插入位置的列索引
     */
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

      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 删除指定列，并平移后续单元格与公式引用。
     * @param col 要删除的列索引
     */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 按源区域向目标区域填充数据。
     * @param source 源区域
     * @param target 目标区域
     */
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
              newCell.computed = engine ? engine.evaluate(targetRef, formula) : '#ERR';
            }
            sheet.cells.set(targetRef, newCell);
          } else if (value !== undefined) {
            sheet.cells.set(targetRef, { value: String(value) });
          }
        }
      }
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 按指定列对选择区域或整表排序。
     * @param col 排序依据列索引
     * @param direction 升序/降序
     */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 对选择区域应用或清除数字格式。
     * @param format 数字格式配置，null 表示清除
     */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 对选择区域应用边框样式。
     * @param side 边框位置：top/bottom/left/right/all/none
     * @param style 边框样式
     */
    applyBorderSelection: (side, style = { style: 'thin', color: '#262626' }) => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.min(sel.startRow, sel.endRow)));
      const maxRow = Math.max(0, Math.min(SHEET_ROW_COUNT - 1, Math.max(sel.startRow, sel.endRow)));
      const minCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.min(sel.startCol, sel.endCol)));
      const maxCol = Math.max(0, Math.min(SHEET_COL_COUNT - 1, Math.max(sel.startCol, sel.endCol)));

      const sides: Array<'borderTop' | 'borderBottom' | 'borderLeft' | 'borderRight'> = [];
      if (side === 'all' || side === 'outside') {
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 合并当前选择区域的单元格 */
    mergeCells: () => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);
      if (minRow === maxRow && minCol === maxCol) return;

      // Unmerge any overlapping ranges first
      const overlapping: string[] = [];
      for (const [ref, range] of sheet.mergedCells.entries()) {
        if (
          range.startRow <= maxRow &&
          range.endRow >= minRow &&
          range.startCol <= maxCol &&
          range.endCol >= minCol
        ) {
          overlapping.push(ref);
        }
      }
      for (const ref of overlapping) sheet.mergedCells.delete(ref);

      const mainRef = coordsToCell(minRow, minCol);
      sheet.mergedCells.set(mainRef, { startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol });
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 拆分当前选择区域中的合并单元格 */
    unmergeCells: () => {
      const state = get();
      const sel = state.selection;
      const sheet = state.getActiveSheet();
      const row = Math.min(sel.startRow, sel.endRow);
      const col = Math.min(sel.startCol, sel.endCol);
      const ref = coordsToCell(row, col);
      if (!sheet.mergedCells.has(ref)) return;
      sheet.mergedCells.delete(ref);
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 获取指定单元格所在的合并范围。
     * @param row 行索引
     * @param col 列索引
     * @returns 合并范围或 null
     */
    getMergedRange: (row: number, col: number) => {
      const sheet = get().getActiveSheet();
      for (const range of sheet.mergedCells.values()) {
        if (row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol) {
          return range;
        }
      }
      return null;
    },

    /** 判断指定单元格是否处于合并范围内 */
    isCellMerged: (row: number, col: number) => {
      return get().getMergedRange(row, col) !== null;
    },

    /** 添加条件格式规则 */
    addConditionalFormat: (format: ConditionalFormat) => {
      const sheet = get().getActiveSheet();
      sheet.conditionalFormats.push(format);
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 清除当前工作表的所有条件格式 */
    clearConditionalFormats: () => {
      const sheet = get().getActiveSheet();
      if (sheet.conditionalFormats.length === 0) return;
      sheet.conditionalFormats = [];
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 设置单元格批注。
     * @param row 行索引
     * @param col 列索引
     * @param comment 批注内容
     */
    setCellComment: (row: number, col: number, comment: string) => {
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const ref = coordsToCell(row, col);
      let cell = sheet.cells.get(ref);
      if (!cell) {
        cell = { value: '' };
        sheet.cells.set(ref, cell);
      }
      if (cell.comment === comment) return;
      cell.comment = comment;
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 删除单元格批注。
     * @param row 行索引
     * @param col 列索引
     */
    deleteCellComment: (row: number, col: number) => {
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const ref = coordsToCell(row, col);
      const cell = sheet.cells.get(ref);
      if (!cell || !cell.comment) return;
      cell.comment = undefined;
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 设置单元格数据验证规则。
     * @param row 行索引
     * @param col 列索引
     * @param rule 验证规则
     */
    setCellValidation: (row: number, col: number, rule: ValidationRule) => {
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const ref = coordsToCell(row, col);
      let cell = sheet.cells.get(ref);
      if (!cell) {
        cell = { value: '' };
        sheet.cells.set(ref, cell);
      }
      cell.validation = rule;
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 清除单元格数据验证规则。
     * @param row 行索引
     * @param col 列索引
     */
    clearCellValidation: (row: number, col: number) => {
      if (row < 0 || row >= SHEET_ROW_COUNT || col < 0 || col >= SHEET_COL_COUNT) return;
      const sheet = get().getActiveSheet();
      const ref = coordsToCell(row, col);
      const cell = sheet.cells.get(ref);
      if (!cell || !cell.validation) return;
      cell.validation = undefined;
      pushHistory();
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /**
     * 根据验证规则校验输入值。
     * @param value 输入值
     * @param rule 验证规则
     * @returns true 表示通过，否则返回错误提示
     */
    validateCellValue: (value: string, rule?: ValidationRule) => {
      if (!rule) return true;
      if (value === '' && rule.allowBlank !== false) return true;

      if (rule.type === 'number') {
        const num = parseFloat(value);
        if (isNaN(num)) return rule.errorMessage || '请输入数字';
        const v1 = rule.formula1 !== undefined ? parseFloat(rule.formula1) : NaN;
        const v2 = rule.formula2 !== undefined ? parseFloat(rule.formula2) : NaN;
        switch (rule.operator) {
          case 'between':
            if (!isNaN(v1) && !isNaN(v2) && (num < v1 || num > v2)) {
              return rule.errorMessage || `数值必须在 ${v1} 和 ${v2} 之间`;
            }
            break;
          case 'greaterThan':
            if (!isNaN(v1) && num <= v1) return rule.errorMessage || `数值必须大于 ${v1}`;
            break;
          case 'lessThan':
            if (!isNaN(v1) && num >= v1) return rule.errorMessage || `数值必须小于 ${v1}`;
            break;
          case 'equal':
            if (!isNaN(v1) && num !== v1) return rule.errorMessage || `数值必须等于 ${v1}`;
            break;
          case 'greaterThanOrEqual':
            if (!isNaN(v1) && num < v1) return rule.errorMessage || `数值必须大于或等于 ${v1}`;
            break;
          case 'lessThanOrEqual':
            if (!isNaN(v1) && num > v1) return rule.errorMessage || `数值必须小于或等于 ${v1}`;
            break;
        }
      }

      if (rule.type === 'list' && rule.list && rule.list.length > 0) {
        if (!rule.list.includes(value)) {
          return rule.errorMessage || `请输入以下值之一：${rule.list.join('、')}`;
        }
      }

      if (rule.type === 'textLength' && rule.formula1 !== undefined) {
        const len = value.length;
        const target = parseInt(rule.formula1, 10);
        if (!isNaN(target)) {
          switch (rule.operator) {
            case 'equal':
              if (len !== target) return rule.errorMessage || `文本长度必须等于 ${target}`;
              break;
            case 'greaterThan':
              if (len <= target) return rule.errorMessage || `文本长度必须大于 ${target}`;
              break;
            case 'lessThan':
              if (len >= target) return rule.errorMessage || `文本长度必须小于 ${target}`;
              break;
          }
        }
      }

      return true;
    },

    /**
     * 应用预设模板到当前工作表。
     * @param templateId 模板标识
     */
    applyTemplate: (templateId: string) => {
      const sheet = get().getActiveSheet();
      applyTemplateToSheet(sheet, templateId);
      pushHistory();
      set({
        workbook: { ...get().workbook },
        selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      });
    },

    /**
     * 从制表符分隔文本粘贴单元格数据。
     * @param text 粘贴文本
     * @param startRow 起始行
     * @param startCol 起始列
     */
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
            cell.computed = engine ? engine.evaluate(ref, value) : '#ERR';
          }
          sheet.cells.set(ref, cell);
        }
      }
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 复制当前选择区域为制表符分隔文本 */
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

    /** 清空当前选择区域的单元格内容 */
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
      set({ workbook: { ...get().workbook }, isDirty: true });
    },

    /** 撤销上一次操作 */
    undo: () => {
      if (history.length === 0) return;
      const current = snapshotActiveSheet();
      redoStack.push(current);
      const previous = history.pop()!;
      restoreFromSnapshot(previous);
    },

    /** 重做上一次撤销的操作 */
    redo: () => {
      if (redoStack.length === 0) return;
      const current = snapshotActiveSheet();
      history.push(current);
      const next = redoStack.pop()!;
      restoreFromSnapshot(next);
    },

    /** 是否可以撤销 */
    canUndo: () => history.length > 0,
    /** 是否可以重做 */
    canRedo: () => redoStack.length > 0,

    /**
     * 加载外部工作簿数据。
     * @param workbook 工作簿对象
     */
    loadWorkbook: (workbook: Workbook) => {
      set({
        workbook,
        selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        editing: null,
        formulaBarValue: '',
        isDirty: false,
      });
    },

    /** 创建新工作簿 */
    newWorkbook: () => {
      set({
        workbook: createInitialWorkbook(),
        selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
        editing: null,
        formulaBarValue: '',
        isDirty: false,
      });
    },

    /**
     * 将工作簿保存到 localStorage。
     * @param filename 保存名称
     */
    saveWorkbook: (filename: string = 'snapsheet') => {
      const state = get();
      const data = JSON.stringify(state.workbook);
      localStorage.setItem(filename, data);
      return true;
    },

    /**
     * 从 localStorage 加载工作簿。
     * @param filename 保存名称
     */
    loadFromStorage: (filename: string = 'snapsheet') => {
      const data = localStorage.getItem(filename);
      if (data) {
        try {
          const workbook = JSON.parse(data);
          set({
            workbook,
            selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
            editing: null,
            formulaBarValue: '',
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    },

    /** 列出 localStorage 中保存的工作簿列表 */
    listSavedWorkbooks: () => {
      const keys = Object.keys(localStorage);
      const workbooks: { name: string; savedAt?: string }[] = [];
      keys.forEach((key) => {
        if (key.startsWith('snapsheet') || key.endsWith('.json')) {
          workbooks.push({ name: key });
        }
      });
      return workbooks;
    },
  };
});

export { SHEET_ROW_COUNT, SHEET_COL_COUNT };

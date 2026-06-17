#!/usr/bin/env python3
import os

full_content = '''import { useState, useRef, useEffect, useCallback } from 'react';
import { Lexer } from '@/engine/Lexer';
import { Parser } from '@/engine/Parser';
import { evaluate } from '@/engine/Evaluator';
import { coordsToCell, cellToCoords } from '@/utils/cellRef';
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  HEADER_ROW_HEIGHT,
  HEADER_COL_WIDTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  GRID_COLOR,
  HEADER_BG,
  HEADER_TEXT,
  CELL_TEXT,
  SELECTED_BORDER,
  SELECTED_BG,
  FONT_FAMILY,
  CELL_FONT,
  SHEET_ROW_COUNT,
  SHEET_COL_COUNT,
} from '@/utils/constants';
import type { Cell, CellStyle, Selection, Sheet, NumberFormat, ConditionalFormat } from '@/types';

const createEmptySheet = (id: string, name: string): Sheet => ({
  id,
  name,
  cells: new Map(),
  colWidths: new Map(),
  rowHeights: new Map(),
  frozenRows: 0,
  frozenCols: 0,
  conditionalFormats: [],
});

interface HistoryState {
  sheets: Sheet[];
  activeSheetId: string;
  selection: Selection;
}

export default function Home() {
  const [sheets, setSheets] = useState<Sheet[]>([createEmptySheet('sheet1', 'Sheet1')]);
  const [activeSheetId, setActiveSheetId] = useState('sheet1');
  const [selection, setSelection] = useState<Selection>({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isDraggingCol, setIsDraggingCol] = useState(false);
  const [dragColIndex, setDragColIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const [dragRowIndex, setDragRowIndex] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showFindPanel, setShowFindPanel] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findResults, setFindResults] = useState<{ ref: string; row: number; col: number }[]>([]);
  const [currentFindIndex, setCurrentFindIndex] = useState(-1);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isAutoFill, setIsAutoFill] = useState(false);
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [showConditionalPanel, setShowConditionalPanel] = useState(false);
  const [newNumberFormat, setNewNumberFormat] = useState<NumberFormat>({ type: 'general' });
  const [newConditionalFormat, setNewConditionalFormat] = useState<ConditionalFormat>({
    type: 'value',
    condition: 'greaterThan',
    value: 0,
    bgColor: '#f8f9fa',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
  const cells = activeSheet.cells;
  const colWidths = activeSheet.colWidths;
  const rowHeights = activeSheet.rowHeights;
  const frozenRows = activeSheet.frozenRows;
  const frozenCols = activeSheet.frozenCols;
  const conditionalFormats = activeSheet.conditionalFormats;

  const getColWidth = useCallback((col: number) => colWidths.get(col) ?? DEFAULT_COL_WIDTH, [colWidths]);
  const getRowHeight = useCallback((row: number) => rowHeights.get(row) ?? DEFAULT_ROW_HEIGHT, [rowHeights]);

  const getCell = useCallback((ref: string) => cells.get(ref), [cells]);

  const saveHistory = useCallback(() => {
    const newState: HistoryState = {
      sheets: sheets.map(s => ({
        ...s,
        cells: new Map(s.cells),
        colWidths: new Map(s.colWidths),
        rowHeights: new Map(s.rowHeights),
      })),
      activeSheetId,
      selection: { ...selection },
    };
    setHistory(prev => prev.slice(0, historyIndex + 1).concat([newState]));
    setHistoryIndex(prev => prev + 1);
  }, [sheets, activeSheetId, selection, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevState = history[historyIndex - 1];
    setSheets(prevState.sheets);
    setActiveSheetId(prevState.activeSheetId);
    setSelection(prevState.selection);
    setHistoryIndex(prev => prev - 1);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextState = history[historyIndex + 1];
    setSheets(nextState.sheets);
    setActiveSheetId(nextState.activeSheetId);
    setSelection(nextState.selection);
    setHistoryIndex(prev => prev + 1);
  }, [history, historyIndex]);

  const updateSheet = useCallback((updates: Partial<Sheet>) => {
    setSheets(prev => prev.map(s => s.id === activeSheetId ? { ...s, ...updates } : s));
  }, [activeSheetId]);

  const getConditionalStyle = useCallback((row: number, col: number): Partial<CellStyle> | null => {
    const cellRef = coordsToCell(row, col);
    const cell = cells.get(cellRef);
    if (!cell || cell.value === undefined || cell.value === null) return null;

    const cellValue = parseFloat(cell.value);
    if (isNaN(cellValue)) return null;

    for (const format of conditionalFormats) {
      let matches = false;
      switch (format.condition) {
        case 'greaterThan':
          matches = cellValue > (typeof format.value === 'number' ? format.value : parseFloat(String(format.value)));
          break;
        case 'lessThan':
          matches = cellValue < (typeof format.value === 'number' ? format.value : parseFloat(String(format.value)));
          break;
        case 'equalTo':
          matches = cellValue === (typeof format.value === 'number' ? format.value : parseFloat(String(format.value)));
          break;
        case 'between':
          const min = typeof format.value === 'number' ? format.value : parseFloat(String(format.value));
          const max = typeof format.value2 === 'number' ? format.value2 : parseFloat(String(format.value2));
          matches = cellValue >= min && cellValue <= max;
          break;
        case 'topN':
          const topN = typeof format.value === 'number' ? format.value : parseInt(String(format.value));
          const colValues = [];
          for (let r = 0; r < SHEET_ROW_COUNT; r++) {
            const ref = coordsToCell(r, col);
            const c = cells.get(ref);
            if (c && c.value !== undefined) {
              const v = parseFloat(c.value);
              if (!isNaN(v)) colValues.push(v);
            }
          }
          colValues.sort((a, b) => b - a);
          const threshold = colValues[topN - 1];
          matches = cellValue >= threshold;
          break;
        case 'bottomN':
          const bottomN = typeof format.value === 'number' ? format.value : parseInt(String(format.value));
          const colValues2 = [];
          for (let r = 0; r < SHEET_ROW_COUNT; r++) {
            const ref = coordsToCell(r, col);
            const c = cells.get(ref);
            if (c && c.value !== undefined) {
              const v = parseFloat(c.value);
              if (!isNaN(v)) colValues2.push(v);
            }
          }
          colValues2.sort((a, b) => a - b);
          const threshold2 = colValues2[bottomN - 1];
          matches = cellValue <= threshold2;
          break;
        case 'aboveAverage':
          let sum = 0;
          let count = 0;
          for (let r = 0; r < SHEET_ROW_COUNT; r++) {
            const ref = coordsToCell(r, col);
            const c = cells.get(ref);
            if (c && c.value !== undefined) {
              const v = parseFloat(c.value);
              if (!isNaN(v)) {
                sum += v;
                count++;
              }
            }
          }
          matches = count > 0 && cellValue > sum / count;
          break;
        case 'belowAverage':
          let sum2 = 0;
          let count2 = 0;
          for (let r = 0; r < SHEET_ROW_COUNT; r++) {
            const ref = coordsToCell(r, col);
            const c = cells.get(ref);
            if (c && c.value !== undefined) {
              const v = parseFloat(c.value);
              if (!isNaN(v)) {
                sum2 += v;
                count2++;
              }
            }
          }
          matches = count2 > 0 && cellValue < sum2 / count2;
          break;
        case 'containsText':
          matches = String(cell.value).toLowerCase().includes(String(format.value).toLowerCase());
          break;
        default:
          break;
      }
      if (matches) {
        return {
          bgColor: format.bgColor,
          color: format.color,
        };
      }
    }
    return null;
  }, [cells, conditionalFormats]);

  const applyNumberFormat = useCallback((format: NumberFormat) => {
    saveHistory();
    const newCells = new Map(cells);
    for (let row = selection.startRow; row <= selection.endRow; row++) {
      for (let col = selection.startCol; col <= selection.endCol; col++) {
        const ref = coordsToCell(row, col);
        const cell = newCells.get(ref);
        if (cell) {
          newCells.set(ref, { ...cell, numberFormat: format });
        }
      }
    }
    updateSheet({ cells: newCells });
  }, [cells, selection, updateSheet, saveHistory]);

  const addConditionalFormat = useCallback(() => {
    saveHistory();
    const newFormats = [...conditionalFormats, newConditionalFormat];
    updateSheet({ conditionalFormats: newFormats });
  }, [conditionalFormats, newConditionalFormat, updateSheet, saveHistory]);

  const insertRow = useCallback(() => {
    saveHistory();
    const insertAt = selection.startRow;
    const newCells = new Map(cells);
    const newRowHeights = new Map(rowHeights);

    const oldCells = Array.from(newCells.entries());
    for (const [ref, cell] of oldCells) {
      const coords = cellToCoords(ref);
      if (coords.row >= insertAt) {
        newCells.delete(ref);
        const newRef = coordsToCell(coords.row + 1, coords.col);
        newCells.set(newRef, cell);
      }
    }

    for (let r = SHEET_ROW_COUNT - 1; r >= insertAt; r--) {
      const height = newRowHeights.get(r);
      if (height !== undefined) {
        newRowHeights.delete(r);
        newRowHeights.set(r + 1, height);
      }
    }

    updateSheet({ cells: newCells, rowHeights: newRowHeights });
    setSelection(prev => ({
      ...prev,
      startRow: prev.startRow + 1,
      endRow: prev.endRow + 1,
    }));
  }, [cells, rowHeights, selection.startRow, updateSheet, saveHistory]);

  const insertCol = useCallback(() => {
    saveHistory();
    const insertAt = selection.startCol;
    const newCells = new Map(cells);
    const newColWidths = new Map(colWidths);

    const oldCells = Array.from(newCells.entries());
    for (const [ref, cell] of oldCells) {
      const coords = cellToCoords(ref);
      if (coords.col >= insertAt) {
        newCells.delete(ref);
        const newRef = coordsToCell(coords.row, coords.col + 1);
        newCells.set(newRef, cell);
      }
    }

    for (let c = SHEET_COL_COUNT - 1; c >= insertAt; c--) {
      const width = newColWidths.get(c);
      if (width !== undefined) {
        newColWidths.delete(c);
        newColWidths.set(c + 1, width);
      }
    }

    updateSheet({ cells: newCells, colWidths: newColWidths });
    setSelection(prev => ({
      ...prev,
      startCol: prev.startCol + 1,
      endCol: prev.endCol + 1,
    }));
  }, [cells, colWidths, selection.startCol, updateSheet, saveHistory]);

  const deleteRow = useCallback(() => {
    saveHistory();
    const deleteAt = selection.startRow;
    const newCells = new Map(cells);
    const newRowHeights = new Map(rowHeights);

    const oldCells = Array.from(newCells.entries());
    for (const [ref, cell] of oldCells) {
      const coords = cellToCoords(ref);
      if (coords.row === deleteAt) {
        newCells.delete(ref);
      } else if (coords.row > deleteAt) {
        newCells.delete(ref);
        const newRef = coordsToCell(coords.row - 1, coords.col);
        newCells.set(newRef, cell);
      }
    }

    for (let r = deleteAt + 1; r < SHEET_ROW_COUNT; r++) {
      const height = newRowHeights.get(r);
      if (height !== undefined) {
        newRowHeights.delete(r);
        newRowHeights.set(r - 1, height);
      }
    }
    newRowHeights.delete(SHEET_ROW_COUNT - 1);

    updateSheet({ cells: newCells, rowHeights: newRowHeights });
    setSelection(prev => ({
      ...prev,
      startRow: Math.min(prev.startRow, SHEET_ROW_COUNT - 2),
      endRow: Math.min(prev.endRow, SHEET_ROW_COUNT - 2),
    }));
  }, [cells, rowHeights, selection.startRow, updateSheet, saveHistory]);

  const deleteCol = useCallback(() => {
    saveHistory();
    const deleteAt = selection.startCol;
    const newCells = new Map(cells);
    const newColWidths = new Map(colWidths);

    const oldCells = Array.from(newCells.entries());
    for (const [ref, cell] of oldCells) {
      const coords = cellToCoords(ref);
      if (coords.col === deleteAt) {
        newCells.delete(ref);
      } else if (coords.col > deleteAt) {
        newCells.delete(ref);
        const newRef = coordsToCell(coords.row, coords.col - 1);
        newCells.set(newRef, cell);
      }
    }

    for (let c = deleteAt + 1; c < SHEET_COL_COUNT; c++) {
      const width = newColWidths.get(c);
      if (width !== undefined) {
        newColWidths.delete(c);
        newColWidths.set(c - 1, width);
      }
    }
    newColWidths.delete(SHEET_COL_COUNT - 1);

    updateSheet({ cells: newCells, colWidths: newColWidths });
    setSelection(prev => ({
      ...prev,
      startCol: Math.min(prev.startCol, SHEET_COL_COUNT - 2),
      endCol: Math.min(prev.endCol, SHEET_COL_COUNT - 2),
    }));
  }, [cells, colWidths, selection.startCol, updateSheet, saveHistory]);

  const sortColumn = useCallback((ascending: boolean) => {
    saveHistory();
    const sortCol = selection.startCol;
    const startRow = selection.startRow;
    const endRow = selection.endRow;

    const rowsToSort: { row: number; value: string | undefined; cell: Cell | undefined }[] = [];
    for (let row = startRow; row <= endRow; row++) {
      const ref = coordsToCell(row, sortCol);
      const cell = cells.get(ref);
      rowsToSort.push({ row, value: cell?.value, cell });
    }

    rowsToSort.sort((a, b) => {
      const valA = parseFloat(a.value || '');
      const valB = parseFloat(b.value || '');
      if (!isNaN(valA) && !isNaN(valB)) {
        return ascending ? valA - valB : valB - valA;
      }
      return ascending
        ? String(a.value).localeCompare(String(b.value))
        : String(b.value).localeCompare(String(a.value));
    });

    const rowMap = new Map<number, number>();
    rowsToSort.forEach((item, index) => {
      rowMap.set(item.row, startRow + index);
    });

    const newCells = new Map(cells);
    const tempCells: Map<string, Cell> = new Map();

    for (const [ref, cell] of newCells.entries()) {
      const coords = cellToCoords(ref);
      if (coords.row >= startRow && coords.row <= endRow) {
        tempCells.set(ref, cell);
      }
    }

    for (const [ref, cell] of tempCells.entries()) {
      const coords = cellToCoords(ref);
      newCells.delete(ref);
      const newRow = rowMap.get(coords.row)!;
      const newRef = coordsToCell(newRow, coords.col);
      newCells.set(newRef, cell);
    }

    updateSheet({ cells: newCells });
  }, [cells, selection, updateSheet, saveHistory]);

  const handleNewSheet = () => {
    const newId = `sheet${Date.now()}`;
    setSheets(prev => [...prev, createEmptySheet(newId, `Sheet${prev.length + 1}`)]);
    setActiveSheetId(newId);
    setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  };

  const handleDeleteSheet = () => {
    if (sheets.length <= 1) return;
    setSheets(prev => prev.filter(s => s.id !== activeSheetId));
    setActiveSheetId(sheets[0].id);
  };

  const handleExport = (type: 'csv' | 'json') => {
    const data: Record<string, any> = {};
    cells.forEach((cell, ref) => {
      data[ref] = {
        value: cell.value,
        formula: cell.formula,
        style: cell.style,
        numberFormat: cell.numberFormat,
      };
    });

    if (type === 'csv') {
      const rows: string[][] = [];
      const maxRow = Math.max(...Array.from(cells.keys()).map(k => cellToCoords(k).row), 0);
      const maxCol = Math.max(...Array.from(cells.keys()).map(k => cellToCoords(k).col), 0);

      for (let row = 0; row <= maxRow; row++) {
        const rowData: string[] = [];
        for (let col = 0; col <= maxCol; col++) {
          const ref = coordsToCell(row, col);
          const cell = cells.get(ref);
          rowData.push(cell?.value || '');
        }
        rows.push(rowData);
      }

      const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${activeSheet.name}.csv`;
      link.click();
    } else {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${activeSheet.name}.json`;
      link.click();
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newCells = new Map<string, Cell>();

      if (file.name.endsWith('.csv')) {
        const rows = content.split('\n');
        rows.forEach((row, rowIndex) => {
          const cells = row.split(',');
          cells.forEach((cell, colIndex) => {
            const value = cell.replace(/^"|"$/g, '').replace(/""/g, '"');
            if (value) {
              newCells.set(coordsToCell(rowIndex, colIndex), { value });
            }
          });
        });
      } else if (file.name.endsWith('.json')) {
        const data = JSON.parse(content);
        Object.entries(data).forEach(([ref, cellData]: [string, any]) => {
          newCells.set(ref, cellData);
        });
      }

      updateSheet({ cells: newCells });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const analyzeSelection = () => {
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    let values: number[] = [];

    for (let row = selection.startRow; row <= selection.endRow; row++) {
      for (let col = selection.startCol; col <= selection.endCol; col++) {
        const ref = coordsToCell(row, col);
        const cell = cells.get(ref);
        if (cell && cell.value !== undefined) {
          const numValue = parseFloat(cell.value);
          if (!isNaN(numValue)) {
            sum += numValue;
            count++;
            min = Math.min(min, numValue);
            max = Math.max(max, numValue);
            values.push(numValue);
          }
        }
      }
    }

    if (count === 0) return null;

    const avg = sum / count;
    const range = max - min;

    let trend = '稳定';
    if (count >= 2) {
      const firstHalf = values.slice(0, Math.floor(count / 2)).reduce((a, b) => a + b, 0) / Math.floor(count / 2);
      const secondHalf = values.slice(Math.floor(count / 2)).reduce((a, b) => a + b, 0) / Math.ceil(count / 2);
      if (secondHalf > firstHalf * 1.1) trend = '上升';
      else if (secondHalf < firstHalf * 0.9) trend = '下降';
    }

    return { sum, count, avg, min, max, range, trend };
  };

  const setCellValue = useCallback((ref: string, value: string, formula?: string) => {
    saveHistory();
    const cell: Cell = { value, formula };

    if (formula && formula.startsWith('=')) {
      try {
        const lexer = new Lexer(formula.substring(1));
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        cell.value = String(evaluate(ast, getCell));
      } catch {
        cell.value = '#ERROR!';
      }
    }

    const newCells = new Map(cells);
    newCells.set(ref, cell);

    updateSheet({ cells: newCells });
  }, [cells, updateSheet, saveHistory, getCell]);

  const toggleBold = () => {
    const ref = coordsToCell(selection.startRow, selection.startCol);
    const cell = cells.get(ref);
    const currentBold = cell?.style?.bold || false;
    saveHistory();
    const newCells = new Map(cells);
    newCells.set(ref, { ...(cell || { value: '' }), style: { ...cell?.style, bold: !currentBold } });
    updateSheet({ cells: newCells });
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    const ref = coordsToCell(selection.startRow, selection.startCol);
    const cell = cells.get(ref);
    saveHistory();
    const newCells = new Map(cells);
    newCells.set(ref, { ...(cell || { value: '' }), style: { ...cell?.style, align } });
    updateSheet({ cells: newCells });
  };

  const setColor = (color: string) => {
    saveHistory();
    const newCells = new Map(cells);
    for (let row = selection.startRow; row <= selection.endRow; row++) {
      for (let col = selection.startCol; col <= selection.endCol; col++) {
        const ref = coordsToCell(row, col);
        const cell = newCells.get(ref);
        newCells.set(ref, { ...(cell || { value: '' }), style: { ...cell?.style, color } });
      }
    }
    updateSheet({ cells: newCells });
  };

  const setBgColor = (bgColor: string) => {
    saveHistory();
    const newCells = new Map(cells);
    for (let row = selection.startRow; row <= selection.endRow; row++) {
      for (let col = selection.startCol; col <= selection.endCol; col++) {
        const ref = coordsToCell(row, col);
        const cell = newCells.get(ref);
        newCells.set(ref, { ...(cell || { value: '' }), style: { ...cell?.style, bgColor } });
      }
    }
    updateSheet({ cells: newCells });
  };

  const commitEdit = () => {
    if (editValue !== '') {
      setCellValue(currentCellRef, editValue, editValue.startsWith('=') ? editValue : undefined);
    }
    setIsEditing(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    let col = 0;
    let colWidth = HEADER_COL_WIDTH;
    while (colWidth <= x && col < SHEET_COL_COUNT) {
      colWidth += getColWidth(col);
      col++;
    }
    col--;

    let row = 0;
    let rowHeight = HEADER_ROW_HEIGHT;
    while (rowHeight <= y && row < SHEET_ROW_COUNT) {
      rowHeight += getRowHeight(row);
      row++;
    }
    row--;

    if (col < 0 || row < 0) return;

    const colRightEdge = HEADER_COL_WIDTH + Array.from({ length: col + 1 }, (_, i) => getColWidth(i)).reduce((a, b) => a + b, 0);
    const rowBottomEdge = HEADER_ROW_HEIGHT + Array.from({ length: row + 1 }, (_, i) => getRowHeight(i)).reduce((a, b) => a + b, 0);

    if (Math.abs(x - colRightEdge) < 5 && col < SHEET_COL_COUNT - 1) {
      setIsDraggingCol(true);
      setDragColIndex(col);
      setDragStartX(e.clientX);
      setDragStartWidth(getColWidth(col));
    } else if (Math.abs(y - rowBottomEdge) < 5 && row < SHEET_ROW_COUNT - 1) {
      setIsDraggingRow(true);
      setDragRowIndex(row);
      setDragStartY(e.clientY);
      setDragStartHeight(getRowHeight(row));
    } else {
      const activeCell = coordsToCell(row, col);
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      setIsEditing(false);
      setCurrentFindIndex(-1);
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    let col = 0;
    let colWidth = HEADER_COL_WIDTH;
    while (colWidth <= x && col < SHEET_COL_COUNT) {
      colWidth += getColWidth(col);
      col++;
    }
    col--;

    let row = 0;
    let rowHeight = HEADER_ROW_HEIGHT;
    while (rowHeight <= y && row < SHEET_ROW_COUNT) {
      rowHeight += getRowHeight(row);
      row++;
    }
    row--;

    if (col >= 0 && row >= 0) {
      const cell = cells.get(coordsToCell(row, col));
      setEditValue(cell?.formula || cell?.value || '');
      setIsEditing(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingCol) {
        const delta = e.clientX - dragStartX;
        const newWidth = Math.max(MIN_COL_WIDTH, dragStartWidth + delta);
        updateSheet({ colWidths: new Map(colWidths).set(dragColIndex, newWidth) });
      } else if (isDraggingRow) {
        const delta = e.clientY - dragStartY;
        const newHeight = Math.max(MIN_ROW_HEIGHT, dragStartHeight + delta);
        updateSheet({ rowHeights: new Map(rowHeights).set(dragRowIndex, newHeight) });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingCol(false);
      setIsDraggingRow(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCol, isDraggingRow, dragStartX, dragStartWidth, dragColIndex, dragStartY, dragStartHeight, colWidths, rowHeights, updateSheet]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (isEditing) return;

    const { startRow, startCol, endRow, endCol } = selection;

    if (e.key === 'ArrowUp' && startRow > 0) {
      e.preventDefault();
      setSelection({ ...selection, startRow: startRow - 1, endRow: endRow - 1 });
    } else if (e.key === 'ArrowDown' && endRow < SHEET_ROW_COUNT - 1) {
      e.preventDefault();
      setSelection({ ...selection, startRow: startRow + 1, endRow: endRow + 1 });
    } else if (e.key === 'ArrowLeft' && startCol > 0) {
      e.preventDefault();
      setSelection({ ...selection, startCol: startCol - 1, endCol: endCol - 1 });
    } else if (e.key === 'ArrowRight' && endCol < SHEET_COL_COUNT - 1) {
      e.preventDefault();
      setSelection({ ...selection, startCol: startCol + 1, endCol: endCol + 1 });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cell = cells.get(coordsToCell(startRow, startCol));
      setEditValue(cell?.formula || cell?.value || '');
      setIsEditing(true);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey && startCol > 0) {
        setSelection({ ...selection, startCol: startCol - 1, endCol: endCol - 1 });
      } else if (!e.shiftKey && endCol < SHEET_COL_COUNT - 1) {
        setSelection({ ...selection, startCol: startCol + 1, endCol: endCol + 1 });
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      saveHistory();
      const newCells = new Map(cells);
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          newCells.delete(coordsToCell(row, col));
        }
      }
      updateSheet({ cells: newCells });
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      setShowFindPanel(true);
      setTimeout(() => findInputRef.current?.focus(), 100);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollLeft(target.scrollLeft);
    setScrollTop(target.scrollTop);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.altKey) {
      e.preventDefault();
      const target = e.target as HTMLDivElement;
      target.scrollLeft += e.deltaY;
    }
  };

  const findTextInCells = () => {
    if (!findText) {
      setFindResults([]);
      setCurrentFindIndex(-1);
      return;
    }

    const results: { ref: string; row: number; col: number }[] = [];
    cells.forEach((cell, ref) => {
      if (cell.value && String(cell.value).toLowerCase().includes(findText.toLowerCase())) {
        const coords = cellToCoords(ref);
        results.push({ ref, row: coords.row, col: coords.col });
      }
    });

    setFindResults(results);
    setCurrentFindIndex(results.length > 0 ? 0 : -1);
  };

  const findNext = () => {
    if (findResults.length === 0) return;
    const nextIndex = (currentFindIndex + 1) % findResults.length;
    setCurrentFindIndex(nextIndex);
    const result = findResults[nextIndex];
    setSelection({ startRow: result.row, startCol: result.col, endRow: result.row, endCol: result.col });
  };

  const findPrev = () => {
    if (findResults.length === 0) return;
    const prevIndex = (currentFindIndex - 1 + findResults.length) % findResults.length;
    setCurrentFindIndex(prevIndex);
    const result = findResults[prevIndex];
    setSelection({ startRow: result.row, startCol: result.col, endRow: result.row, endCol: result.col });
  };

  const replaceCurrent = () => {
    if (currentFindIndex < 0 || !replaceText) return;
    const result = findResults[currentFindIndex];
    const cell = cells.get(result.ref);
    if (cell) {
      const newValue = String(cell.value).replace(findText, replaceText);
      saveHistory();
      const newCells = new Map(cells);
      newCells.set(result.ref, { ...cell, value: newValue });
      updateSheet({ cells: newCells });
      findTextInCells();
    }
  };

  const replaceAll = () => {
    if (findResults.length === 0 || !replaceText) return;
    saveHistory();
    const newCells = new Map(cells);
    findResults.forEach(result => {
      const cell = newCells.get(result.ref);
      if (cell) {
        const newValue = String(cell.value).replace(new RegExp(findText, 'g'), replaceText);
        newCells.set(result.ref, { ...cell, value: newValue });
      }
    });
    updateSheet({ cells: newCells });
    findTextInCells();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    let totalWidth = HEADER_COL_WIDTH;
    for (let col = 0; col < SHEET_COL_COUNT; col++) {
      totalWidth += getColWidth(col);
    }

    let totalHeight = HEADER_ROW_HEIGHT;
    for (let row = 0; row < SHEET_ROW_COUNT; row++) {
      totalHeight += getRowHeight(row);
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();

    let startCol = 0;
    let colX = HEADER_COL_WIDTH;
    while (colX < scrollLeft + rect.width && startCol < SHEET_COL_COUNT) {
      colX += getColWidth(startCol);
      startCol++;
    }
    startCol = Math.max(0, startCol - 1);

    let endCol = startCol;
    colX = HEADER_COL_WIDTH;
    for (let i = 0; i <= startCol; i++) colX += getColWidth(i);
    while (colX < scrollLeft + rect.width && endCol < SHEET_COL_COUNT) {
      colX += getColWidth(endCol);
      endCol++;
    }

    let startRow = 0;
    let rowY = HEADER_ROW_HEIGHT;
    while (rowY < scrollTop + rect.height && startRow < SHEET_ROW_COUNT) {
      rowY += getRowHeight(startRow);
      startRow++;
    }
    startRow = Math.max(0, startRow - 1);

    let endRow = startRow;
    rowY = HEADER_ROW_HEIGHT;
    for (let i = 0; i <= startRow; i++) rowY += getRowHeight(i);
    while (rowY < scrollTop + rect.height && endRow < SHEET_ROW_COUNT) {
      rowY += getRowHeight(endRow);
      endRow++;
    }

    ctx.fillStyle = HEADER_BG;
    ctx.fillRect(0, 0, HEADER_COL_WIDTH, HEADER_ROW_HEIGHT);
    ctx.fillStyle = HEADER_TEXT;
    ctx.font = `bold ${CELL_FONT} ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('', HEADER_COL_WIDTH / 2, HEADER_ROW_HEIGHT / 2);

    ctx.fillStyle = HEADER_BG;
    let x = HEADER_COL_WIDTH;
    for (let col = startCol; col < endCol; col++) {
      const width = getColWidth(col);
      ctx.fillRect(x - scrollLeft, 0, width, HEADER_ROW_HEIGHT);
      ctx.fillStyle = HEADER_TEXT;
      ctx.fillText(String.fromCharCode(65 + col), x - scrollLeft + width / 2, HEADER_ROW_HEIGHT / 2);
      ctx.fillStyle = GRID_COLOR;
      ctx.fillRect(x - scrollLeft + width - 1, 0, 1, HEADER_ROW_HEIGHT);
      x += width;
    }

    ctx.fillStyle = HEADER_BG;
    let y = HEADER_ROW_HEIGHT;
    for (let row = startRow; row < endRow; row++) {
      const height = getRowHeight(row);
      ctx.fillRect(0, y - scrollTop, HEADER_COL_WIDTH, height);
      ctx.fillStyle = HEADER_TEXT;
      ctx.fillText(String(row + 1), HEADER_COL_WIDTH / 2, y - scrollTop + height / 2);
      ctx.fillStyle = GRID_COLOR;
      ctx.fillRect(0, y - scrollTop + height - 1, HEADER_COL_WIDTH, 1);
      y += height;
    }

    ctx.fillStyle = GRID_COLOR;
    ctx.fillRect(HEADER_COL_WIDTH - 1, 0, 1, HEADER_ROW_HEIGHT);
    ctx.fillRect(0, HEADER_ROW_HEIGHT - 1, HEADER_COL_WIDTH, 1);

    x = HEADER_COL_WIDTH;
    for (let col = startCol; col < endCol; col++) {
      const width = getColWidth(col);
      y = HEADER_ROW_HEIGHT;
      for (let row = startRow; row < endRow; row++) {
        const height = getRowHeight(row);
        const cellRef = coordsToCell(row, col);
        const cell = cells.get(cellRef);
        const conditionalStyle = getConditionalStyle(row, col);

        if (conditionalStyle?.bgColor) {
          ctx.fillStyle = conditionalStyle.bgColor;
        } else if (cell?.style?.bgColor) {
          ctx.fillStyle = cell.style.bgColor;
        } else if (row >= frozenRows && col >= frozenCols) {
          ctx.fillStyle = '#fff';
        } else {
          ctx.fillStyle = '#fafafa';
        }
        ctx.fillRect(x - scrollLeft, y - scrollTop, width, height);

        ctx.strokeStyle = GRID_COLOR;
        ctx.strokeRect(x - scrollLeft, y - scrollTop, width, height);

        if (row >= frozenRows && col === frozenCols) {
          ctx.strokeStyle = '#ccc';
          ctx.strokeRect(x - scrollLeft, y - scrollTop, width, height);
        }
        if (col >= frozenCols && row === frozenRows) {
          ctx.strokeStyle = '#ccc';
          ctx.strokeRect(x - scrollLeft, y - scrollTop, width, height);
        }

        if (cell) {
          let displayValue = cell.value;
          if (cell.numberFormat) {
            const numValue = parseFloat(String(cell.value));
            if (!isNaN(numValue)) {
              switch (cell.numberFormat.type) {
                case 'number':
                  displayValue = numValue.toFixed(cell.numberFormat.decimalPlaces || 2);
                  break;
                case 'currency':
                  displayValue = `${cell.numberFormat.currencySymbol || '¥'}${numValue.toFixed(cell.numberFormat.decimalPlaces || 2)}`;
                  break;
                case 'percentage':
                  displayValue = `${(numValue * 100).toFixed(cell.numberFormat.decimalPlaces || 0)}%`;
                  break;
              }
            }
          }

          ctx.fillStyle = conditionalStyle?.color || cell.style?.color || CELL_TEXT;
          ctx.font = `${cell.style?.bold ? 'bold ' : ''}${CELL_FONT} ${FONT_FAMILY}`;

          const align = cell.style?.align || 'left';
          ctx.textAlign = align;
          ctx.textBaseline = 'middle';

          const padding = 4;
          let textX: number;
          if (align === 'left') textX = x - scrollLeft + padding;
          else if (align === 'center') textX = x - scrollLeft + width / 2;
          else textX = x - scrollLeft + width - padding;
          const textY = y - scrollTop + height / 2;

          ctx.fillText(displayValue || '', textX, textY);
        }

        if (row >= selection.startRow && row <= selection.endRow && col >= selection.startCol && col <= selection.endCol) {
          ctx.fillStyle = SELECTED_BG;
          ctx.fillRect(x - scrollLeft, y - scrollTop, width, height);
          ctx.strokeStyle = SELECTED_BORDER;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - scrollLeft, y - scrollTop, width, height);
          ctx.lineWidth = 1;
        }

        y += height;
      }
      x += width;
    }

    ctx.restore();
  }, [cells, colWidths, rowHeights, selection, scrollLeft, scrollTop, getColWidth, getRowHeight, frozenRows, frozenCols, getConditionalStyle]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

  const aiAnalysis = analyzeSelection();
  const currentCellRef = coordsToCell(selection.startRow, selection.startCol);
  const currentCell = cells.get(currentCellRef);

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center h-12 px-4 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            撤销
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重做
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <button
            onClick={handleNewSheet}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            新建
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            导入
          </button>
          <div className="relative group">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              导出 ▾
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-50">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                导出 CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                导出 JSON
              </button>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center gap-1">
          <button
            onClick={toggleBold}
            className={`px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded ${currentCell?.style?.bold ? 'bg-gray-200' : ''}`}
            style={{ fontWeight: 'bold' }}
          >
            B
          </button>
          <button
            onClick={() => setAlign('left')}
            className={`px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded ${currentCell?.style?.align === 'left' ? 'bg-gray-200' : ''}`}
          >
            ←
          </button>
          <button
            onClick={() => setAlign('center')}
            className={`px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded ${currentCell?.style?.align === 'center' ? 'bg-gray-200' : ''}`}
          >
            ↔
          </button>
          <button
            onClick={() => setAlign('right')}
            className={`px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded ${currentCell?.style?.align === 'right' ? 'bg-gray-200' : ''}`}
          >
            →
          </button>
          <div className="relative group">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              插入 ▾
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-50">
              <button onClick={insertRow} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                插入行
              </button>
              <button onClick={insertCol} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                插入列
              </button>
              <div className="border-t border-gray-200 my-1" />
              <button onClick={deleteRow} className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                删除行
              </button>
              <button onClick={deleteCol} className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                删除列
              </button>
            </div>
          </div>
          <div className="relative group">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              格式 ▾
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-50 p-2">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => applyNumberFormat({ type: 'general' })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  常规
                </button>
                <button onClick={() => applyNumberFormat({ type: 'number', decimalPlaces: 2 })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  数字 (2位)
                </button>
                <button onClick={() => applyNumberFormat({ type: 'currency', currencySymbol: '¥' })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  货币
                </button>
                <button onClick={() => applyNumberFormat({ type: 'percentage' })} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded">
                  百分比
                </button>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="w-4 h-4 bg-red-500 rounded" />
                  <button onClick={() => setColor('#d93025')} className="text-xs text-gray-700 hover:bg-gray-50 rounded">
                    红色字体
                  </button>
                </div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="w-4 h-4 bg-green-200 rounded" />
                  <button onClick={() => setBgColor('#d4edda')} className="text-xs text-gray-700 hover:bg-gray-50 rounded">
                    绿色背景
                  </button>
                </div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="w-4 h-4 bg-yellow-200 rounded" />
                  <button onClick={() => setBgColor('#fff3cd')} className="text-xs text-gray-700 hover:bg-gray-50 rounded">
                    黄色背景
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              数据 ▾
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-50">
              <button onClick={() => sortColumn(true)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                升序排序
              </button>
              <button onClick={() => sortColumn(false)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                降序排序
              </button>
              <div className="border-t border-gray-200 my-1" />
              <button onClick={() => setFrozenRows(frozenRows === 0 ? 1 : 0)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                {frozenRows > 0 ? '取消冻结首行' : '冻结首行'}
              </button>
              <button onClick={() => setFrozenCols(frozenCols === 0 ? 1 : 0)} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                {frozenCols > 0 ? '取消冻结首列' : '冻结首列'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormatPanel(!showFormatPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showFormatPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            数字格式
          </button>
          <button
            onClick={() => setShowConditionalPanel(!showConditionalPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showConditionalPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            条件格式
          </button>
          <button
            onClick={() => setShowFindPanel(!showFindPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showFindPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            查找替换
          </button>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`px-3 py-1.5 text-sm font-medium rounded ${showAIPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            AI 分析
          </button>
          <span className="text-sm text-gray-500">SnapSheet</span>
        </div>
      </div>

      <div className="flex items-center h-9 px-4 border-b border-gray-200 bg-gray-50 gap-4">
        <div className="flex items-center justify-center w-16 font-mono text-sm font-medium text-gray-600">
          {currentCellRef}
        </div>
        <div className="flex-1 relative">
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              className="w-full h-7 px-2 text-sm font-mono border-2 border-blue-500 rounded outline-none"
              autoFocus
            />
          ) : (
            <div
              onClick={() => {
                setEditValue(currentCell?.formula || currentCell?.value || '');
                setIsEditing(true);
                setTimeout(() => editInputRef.current?.focus(), 0);
              }}
              className="w-full h-7 px-2 text-sm font-mono border border-transparent hover:border-gray-300 rounded cursor-text flex items-center truncate"
            >
              {currentCell?.formula || currentCell?.value || ''}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 overflow-auto relative"
          onScroll={handleScroll}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onDoubleClick={handleCanvasDoubleClick}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className={`absolute inset-0 outline-none ${isDraggingCol ? 'cursor-col-resize' : isDraggingRow ? 'cursor-row-resize' : ''}`}
          />
        </div>

        {showAIPanel && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">AI 数据分析</h3>
            <div className="text-sm text-gray-600 mb-2">
              选中区域: {coordsToCell(selection.startRow, selection.startCol)} - {coordsToCell(selection.endRow, selection.endCol)}
            </div>

            {aiAnalysis ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">数量:</span> {aiAnalysis.count}</div>
                    <div><span className="text-gray-500">总和:</span> {aiAnalysis.sum.toFixed(2)}</div>
                    <div><span className="text-gray-500">平均:</span> {aiAnalysis.avg.toFixed(2)}</div>
                    <div><span className="text-gray-500">最大:</span> {aiAnalysis.max.toFixed(2)}</div>
                    <div><span className="text-gray-500">最小:</span> {aiAnalysis.min.toFixed(2)}</div>
                    <div><span className="text-gray-500">范围:</span> {aiAnalysis.range.toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded p-3">
                  <div className="text-sm font-medium text-blue-700 mb-1">趋势分析</div>
                  <div className="text-sm text-blue-600">
                    数据整体{aiAnalysis.trend}，平均值位于区间{aiAnalysis.avg > aiAnalysis.max * 0.7 ? '上' : aiAnalysis.avg < aiAnalysis.min * 1.3 ? '下' : '中'}部。
                  </div>
                </div>

                <div className="bg-green-50 rounded p-3">
                  <div className="text-sm font-medium text-green-700 mb-1">建议公式</div>
                  <div className="text-xs text-green-600 space-y-1">
                    <div>=SUM({coordsToCell(selection.startRow, selection.startCol)}:{coordsToCell(selection.endRow, selection.endCol)})</div>
                    <div>=AVG({coordsToCell(selection.startRow, selection.startCol)}:{coordsToCell(selection.endRow, selection.endCol)})</div>
                    <div>=MAX({coordsToCell(selection.startRow, selection.startCol)}:{coordsToCell(selection.endRow, selection.endCol)})</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                选中包含数值的单元格以查看分析结果
              </div>
            )}
          </div>
        )}

        {showFormatPanel && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">数字格式</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">格式类型</label>
                <select
                  value={newNumberFormat.type}
                  onChange={e => setNewNumberFormat(prev => ({ ...prev, type: e.target.value as NumberFormat['type'] }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="general">常规</option>
                  <option value="number">数字</option>
                  <option value="currency">货币</option>
                  <option value="percentage">百分比</option>
                </select>
              </div>
              {(newNumberFormat.type === 'number' || newNumberFormat.type === 'currency' || newNumberFormat.type === 'percentage') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">小数位数</label>
                  <input
                    type="number"
                    value={newNumberFormat.decimalPlaces || 0}
                    onChange={e => setNewNumberFormat(prev => ({ ...prev, decimalPlaces: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    min="0"
                    max="10"
                  />
                </div>
              )}
              {newNumberFormat.type === 'currency' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">货币符号</label>
                  <input
                    type="text"
                    value={newNumberFormat.currencySymbol || '¥'}
                    onChange={e => setNewNumberFormat(prev => ({ ...prev, currencySymbol: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <button
                onClick={() => {
                  applyNumberFormat(newNumberFormat);
                  setShowFormatPanel(false);
                }}
                className="w-full px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                应用格式
              </button>
            </div>
          </div>
        )}

        {showConditionalPanel && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">条件格式</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">条件类型</label>
                <select
                  value={newConditionalFormat.condition}
                  onChange={e => setNewConditionalFormat(prev => ({ ...prev, condition: e.target.value as ConditionalFormat['condition'] }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="greaterThan">大于</option>
                  <option value="lessThan">小于</option>
                  <option value="equalTo">等于</option>
                  <option value="between">介于</option>
                  <option value="containsText">包含文本</option>
                  <option value="topN">Top N</option>
                  <option value="bottomN">Bottom N</option>
                  <option value="aboveAverage">高于平均值</option>
                  <option value="belowAverage">低于平均值</option>
                </select>
              </div>
              {(newConditionalFormat.condition === 'greaterThan' || 
                newConditionalFormat.condition === 'lessThan' || 
                newConditionalFormat.condition === 'equalTo'
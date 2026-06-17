#!/usr/bin/env python3

content = '''import { useState, useRef, useEffect, useCallback } from 'react';
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
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setSheets(prevState.sheets);
      setActiveSheetId(prevState.activeSheetId);
      setSelection(prevState.selection);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSheets(nextState.sheets);
      setActiveSheetId(nextState.activeSheetId);
      setSelection(nextState.selection);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  const updateSheet = useCallback((updates: Partial<Sheet> | ((prev: Sheet) => Partial<Sheet>)) => {
    saveHistory();
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newUpdates = typeof updates === 'function' ? updates(s) : updates;
      return { ...s, ...newUpdates };
    }));
  }, [activeSheetId, saveHistory]);

  const formatCellValue = useCallback((cell: Cell): string => {
    const { computed, numberFormat } = cell;
    if (computed === undefined) return '';
    
    const val = typeof computed === 'number' ? computed : parseFloat(String(computed)) || computed;
    
    if (typeof val === 'number') {
      if (numberFormat) {
        switch (numberFormat.type) {
          case 'currency':
            return (numberFormat.currencySymbol || '¥') + val.toFixed(numberFormat.decimalPlaces || 2);
          case 'percentage':
            return (val * 100).toFixed(numberFormat.decimalPlaces || 0) + '%';
          case 'number':
            return val.toFixed(numberFormat.decimalPlaces || 2);
          default:
            return String(val);
        }
      }
    }
    return String(val);
  }, []);

  const getConditionalStyle = useCallback((cell: Cell | undefined): Partial<CellStyle> => {
    if (!cell || !conditionalFormats.length) return {};
    
    const val = cell.computed !== undefined ? cell.computed : cell.value;
    const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    
    for (const cf of conditionalFormats) {
      let matches = false;
      switch (cf.condition) {
        case 'greaterThan':
          matches = numVal > (cf.value as number);
          break;
        case 'lessThan':
          matches = numVal < (cf.value as number);
          break;
        case 'equalTo':
          matches = val === cf.value;
          break;
        case 'between':
          matches = numVal >= (cf.value as number) && numVal <= (cf.value2 as number);
          break;
        case 'containsText':
          matches = String(val).includes(cf.value as string);
          break;
        case 'topN':
        case 'bottomN': {
          const rangeVals: number[] = [];
          for (let r = selection.startRow; r <= selection.endRow; r++) {
            for (let c = selection.startCol; c <= selection.endCol; c++) {
              const ref = coordsToCell(r, c);
              const cCell = cells.get(ref);
              if (cCell) {
                const v = typeof cCell.computed === 'number' ? cCell.computed : parseFloat(String(cCell.computed)) || 0;
                rangeVals.push(v);
              }
            }
          }
          const sorted = [...rangeVals].sort((a, b) => b - a);
          const n = cf.value as number;
          const threshold = cf.condition === 'topN' ? sorted[n - 1] : sorted[sorted.length - n];
          matches = cf.condition === 'topN' ? numVal >= threshold : numVal <= threshold;
          break;
        }
        case 'aboveAverage':
        case 'belowAverage': {
          const rangeVals: number[] = [];
          for (let r = selection.startRow; r <= selection.endRow; r++) {
            for (let c = selection.startCol; c <= selection.endCol; c++) {
              const ref = coordsToCell(r, c);
              const cCell = cells.get(ref);
              if (cCell) {
                const v = typeof cCell.computed === 'number' ? cCell.computed : parseFloat(String(cCell.computed)) || 0;
                rangeVals.push(v);
              }
            }
          }
          const avg = rangeVals.length > 0 ? rangeVals.reduce((a, b) => a + b, 0) / rangeVals.length : 0;
          matches = cf.condition === 'aboveAverage' ? numVal > avg : numVal < avg;
          break;
        }
      }
      
      if (matches) {
        return { color: cf.color, bgColor: cf.bgColor };
      }
    }
    
    return {};
  }, [conditionalFormats, selection, cells]);

  const recomputeAll = useCallback(() => {
    const newCells = new Map<string, Cell>();
    const visited = new Set<string>();

    const recompute = (ref: string): Cell | undefined => {
      if (visited.has(ref)) return newCells.get(ref);
      visited.add(ref);

      const cell = cells.get(ref);
      if (!cell) return undefined;

      let computed: string | number = cell.value;
      if (cell.formula && cell.formula.startsWith('=')) {
        try {
          const lexer = new Lexer(cell.formula);
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          const ast = parser.parse();
          computed = evaluate(ast, getCell);
        } catch {
          computed = '#ERROR!';
        }
      } else {
        const num = parseFloat(cell.value);
        computed = isNaN(num) ? cell.value : num;
      }

      const newCell = { ...cell, computed };
      newCells.set(ref, newCell);
      return newCell;
    };

    cells.forEach((_, ref) => {
      recompute(ref);
    });

    updateSheet({ cells: newCells });
  }, [cells, getCell, updateSheet]);

  useEffect(() => {
    recomputeAll();
  }, [recomputeAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = HEADER_BG;
    ctx.fillRect(0, 0, width, HEADER_ROW_HEIGHT);
    ctx.fillRect(0, 0, HEADER_COL_WIDTH, height);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    let x = 0;
    const startCol = Math.floor(scrollLeft / HEADER_COL_WIDTH);
    const startRow = Math.floor(scrollTop / HEADER_ROW_HEIGHT);

    for (let col = startCol; col <= SHEET_COL_COUNT; col++) {
      const colX = x - scrollLeft + HEADER_COL_WIDTH;
      if (colX > width) break;
      const colW = getColWidth(col);

      ctx.fillStyle = HEADER_TEXT;
      ctx.font = '600 12px ' + FONT_FAMILY;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const colLetter = coordsToCell(0, col).replace(/\\d+/, '');
      if (colX + colW > 0) {
        ctx.fillText(colLetter, colX + colW / 2, HEADER_ROW_HEIGHT / 2);
      }

      ctx.beginPath();
      ctx.moveTo(colX + colW, 0);
      ctx.lineTo(colX + colW, height);
      ctx.stroke();

      x += colW;
    }

    let y = 0;
    for (let row = startRow; row <= SHEET_ROW_COUNT; row++) {
      const rowY = y - scrollTop + HEADER_ROW_HEIGHT;
      if (rowY > height) break;
      const rowH = getRowHeight(row);

      ctx.fillStyle = HEADER_TEXT;
      ctx.font = '600 12px ' + FONT_FAMILY;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (rowY + rowH > 0) {
        ctx.fillText(String(row + 1), HEADER_COL_WIDTH / 2, rowY + rowH / 2);
      }

      ctx.beginPath();
      ctx.moveTo(0, rowY + rowH);
      ctx.lineTo(width, rowY + rowH);
      ctx.stroke();

      y += rowH;
    }

    const viewLeft = HEADER_COL_WIDTH - scrollLeft;
    const viewTop = HEADER_ROW_HEIGHT - scrollTop;
    const viewWidth = width - HEADER_COL_WIDTH;
    const viewHeight = height - HEADER_ROW_HEIGHT;

    ctx.save();
    ctx.beginPath();
    ctx.rect(viewLeft, viewTop, viewWidth, viewHeight);
    ctx.clip();

    x = HEADER_COL_WIDTH - scrollLeft;
    for (let col = 0; col <= SHEET_COL_COUNT; col++) {
      const colW = getColWidth(col);
      ctx.beginPath();
      ctx.moveTo(x + colW, viewTop);
      ctx.lineTo(x + colW, viewTop + viewHeight);
      ctx.stroke();
      x += colW;
    }

    y = HEADER_ROW_HEIGHT - scrollTop;
    for (let row = 0; row <= SHEET_ROW_COUNT; row++) {
      const rowH = getRowHeight(row);
      ctx.beginPath();
      ctx.moveTo(viewLeft, y + rowH);
      ctx.lineTo(viewLeft + viewWidth, y + rowH);
      ctx.stroke();
      y += rowH;
    }

    const isFrozen = frozenRows > 0 || frozenCols > 0;
    if (isFrozen) {
      let frozenWidth = HEADER_COL_WIDTH;
      for (let c = 0; c < frozenCols; c++) {
        frozenWidth += getColWidth(c);
      }
      let frozenHeight = HEADER_ROW_HEIGHT;
      for (let r = 0; r < frozenRows; r++) {
        frozenHeight += getRowHeight(r);
      }

      ctx.fillStyle = 'rgba(248, 249, 250, 0.95)';
      ctx.fillRect(HEADER_COL_WIDTH, HEADER_ROW_HEIGHT, frozenWidth - HEADER_COL_WIDTH, frozenHeight - HEADER_ROW_HEIGHT);

      ctx.strokeStyle = '#dadce0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(frozenWidth, HEADER_ROW_HEIGHT);
      ctx.lineTo(frozenWidth, frozenHeight);
      ctx.lineTo(HEADER_COL_WIDTH, frozenHeight);
      ctx.stroke();
    }

    const selStartX = HEADER_COL_WIDTH + (() => {
      let sx = 0;
      for (let c = 0; c < selection.startCol; c++) sx += getColWidth(c);
      return sx;
    })() - scrollLeft;

    const selStartY = HEADER_ROW_HEIGHT + (() => {
      let sy = 0;
      for (let r = 0; r < selection.startRow; r++) sy += getRowHeight(r);
      return sy;
    })() - scrollTop;

    const selEndX = HEADER_COL_WIDTH + (() => {
      let sx = 0;
      for (let c = 0; c <= selection.endCol; c++) sx += getColWidth(c);
      return sx;
    })() - scrollLeft;

    const selEndY = HEADER_ROW_HEIGHT + (() => {
      let sy = 0;
      for (let r = 0; r <= selection.endRow; r++) sy += getRowHeight(r);
      return sy;
    })() - scrollTop;

    ctx.fillStyle = SELECTED_BG;
    ctx.fillRect(selStartX, selStartY, selEndX - selStartX, selEndY - selStartY);

    ctx.strokeStyle = SELECTED_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(selStartX, selStartY, selEndX - selStartX, selEndY - selStartY);

    const fillHandleSize = 8;
    const fillHandleX = selEndX - fillHandleSize;
    const fillHandleY = selEndY - fillHandleSize;
    if (fillHandleX > HEADER_COL_WIDTH && fillHandleY > HEADER_ROW_HEIGHT) {
      ctx.fillStyle = '#1a73e8';
      ctx.fillRect(fillHandleX, fillHandleY, fillHandleSize, fillHandleSize);
    }

    for (let row = startRow; row <= SHEET_ROW_COUNT; row++) {
      let totalRowY = 0;
      for (let r = 0; r < row; r++) totalRowY += getRowHeight(r);
      const cellY = HEADER_ROW_HEIGHT + totalRowY - scrollTop;

      if (cellY + getRowHeight(row) < HEADER_ROW_HEIGHT) continue;
      if (cellY > height) break;

      for (let col = startCol; col <= SHEET_COL_COUNT; col++) {
        let totalColX = 0;
        for (let c = 0; c < col; c++) totalColX += getColWidth(c);
        const cellXPos = HEADER_COL_WIDTH + totalColX - scrollLeft;

        if (cellXPos + getColWidth(col) < HEADER_COL_WIDTH) continue;
        if (cellXPos > width) break;

        const ref = coordsToCell(row, col);
        const cell = cells.get(ref);
        if (cell) {
          const displayValue = formatCellValue(cell);
          const cellPadding = 4;
          const maxWidth = getColWidth(col) - cellPadding * 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(cellXPos, cellY, getColWidth(col), getRowHeight(row));
          ctx.clip();

          const conditionalStyle = getConditionalStyle(cell);
          const bgColor = conditionalStyle.bgColor || cell.style?.bgColor;
          if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(cellXPos, cellY, getColWidth(col), getRowHeight(row));
          }

          ctx.fillStyle = conditionalStyle.color || cell.style?.color || CELL_TEXT;
          ctx.font = (cell.style?.bold ? 'bold ' : '') + CELL_FONT;
          ctx.textAlign = cell.style?.align || 'left';
          ctx.textBaseline = 'middle';

          const alignX = cell.style?.align === 'right' ? cellXPos + getColWidth(col) - cellPadding :
                         cell.style?.align === 'center' ? cellXPos + getColWidth(col) / 2 :
                         cellXPos + cellPadding;

          ctx.fillText(
            displayValue,
            alignX,
            cellY + getRowHeight(row) / 2,
            maxWidth
          );

          ctx.restore();
        }
      }
    }

    ctx.restore();
  }, [cells, selection, scrollLeft, scrollTop, colWidths, rowHeights, getColWidth, getRowHeight, frozenRows, frozenCols, formatCellValue, getConditionalStyle]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isEditing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const selEndX = HEADER_COL_WIDTH + (() => {
      let sx = 0;
      for (let c = 0; c <= selection.endCol; c++) sx += getColWidth(c);
      return sx;
    })() - scrollLeft;

    const selEndY = HEADER_ROW_HEIGHT + (() => {
      let sy = 0;
      for (let r = 0; r <= selection.endRow; r++) sy += getRowHeight(r);
      return sy;
    })() - scrollTop;

    const fillHandleSize = 8;
    if (x >= selEndX - fillHandleSize && x <= selEndX + fillHandleSize &&
        y >= selEndY - fillHandleSize && y <= selEndY + fillHandleSize) {
      setIsAutoFill(true);
      setDragStartX(e.clientX);
      setDragStartY(e.clientY);
      return;
    }

    if (x < HEADER_COL_WIDTH) {
      let row = 0;
      let rowY = HEADER_ROW_HEIGHT - scrollTop;
      while (rowY < y && row < SHEET_ROW_COUNT) {
        if (Math.abs(y - rowY) < 3) {
          setIsDraggingRow(true);
          setDragRowIndex(row);
          setDragStartY(e.clientY);
          setDragStartHeight(getRowHeight(row));
          return;
        }
        rowY += getRowHeight(row);
        row++;
      }
    }

    let col = 0;
    let colX = HEADER_COL_WIDTH - scrollLeft;
    while (colX < x && col < SHEET_COL_COUNT) {
      if (Math.abs(x - colX) < 3) {
        setIsDraggingCol(true);
        setDragColIndex(col);
        setDragStartX(e.clientX);
        setDragStartWidth(getColWidth(col));
        return;
      }
      colX += getColWidth(col);
      col++;
    }
    col = Math.max(0, col - 1);

    let row = 0;
    let rowY = HEADER_ROW_HEIGHT - scrollTop;
    while (rowY < y && row < SHEET_ROW_COUNT) {
      rowY += getRowHeight(row);
      row++;
    }
    row = Math.max(0, row - 1);

    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    setEditValue('');
    setIsEditing(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingCol) {
        const delta = e.clientX - dragStartX;
        const newWidth = Math.max(MIN_COL_WIDTH, dragStartWidth + delta);
        const newColWidths = new Map(colWidths);
        newColWidths.set(dragColIndex, newWidth);
        updateSheet({ colWidths: newColWidths });
      } else if (isDraggingRow) {
        const delta = e.clientY - dragStartY;
        const newHeight = Math.max(MIN_ROW_HEIGHT, dragStartHeight + delta);
        const newRowHeights = new Map(rowHeights);
        newRowHeights.set(dragRowIndex, newHeight);
        updateSheet({ rowHeights: newRowHeights });
      } else if (isAutoFill) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let col = 0;
        let colX = HEADER_COL_WIDTH - scrollLeft;
        while (colX < x && col < SHEET_COL_COUNT) {
          colX += getColWidth(col);
          col++;
        }
        col = Math.max(0, col - 1);

        let row = 0;
        let rowY = HEADER_ROW_HEIGHT - scrollTop;
        while (rowY < y && row < SHEET_ROW_COUNT) {
          rowY += getRowHeight(row);
          row++;
        }
        row = Math.max(0, row - 1);

        setSelection({
          startRow: selection.startRow,
          startCol: selection.startCol,
          endRow: Math.max(selection.startRow, row),
          endCol: Math.max(selection.startCol, col),
        });
      }
    };

    const handleMouseUp = () => {
      if (isAutoFill) {
        performAutoFill();
      }
      setIsDraggingCol(false);
      setIsDraggingRow(false);
      setIsAutoFill(false);
    };

    if (isDraggingCol || isDraggingRow || isAutoFill) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCol, isDraggingRow, isAutoFill, dragStartX, dragStartY, dragStartWidth, dragStartHeight, dragColIndex, dragRowIndex, colWidths, rowHeights, updateSheet, selection, getColWidth, getRowHeight]);

  const performAutoFill = useCallback(() => {
    if (selection.startRow === selection.endRow && selection.startCol === selection.endCol) return;

    const isHorizontal = selection.endCol > selection.endRow;
    const sourceCells: Cell[] = [];
    const sourceValues: (string | number)[] = [];

    if (isHorizontal) {
      for (let c = selection.startCol; c <= Math.min(selection.endCol, selection.startCol + 10); c++) {
        const ref = coordsToCell(selection.startRow, c);
        const cell = cells.get(ref);
        if (cell) {
          sourceCells.push(cell);
          sourceValues.push(cell.computed !== undefined ? cell.computed : cell.value);
        }
      }
    } else {
      for (let r = selection.startRow; r <= Math.min(selection.endRow, selection.startRow + 10); r++) {
        const ref = coordsToCell(r, selection.startCol);
        const cell = cells.get(ref);
        if (cell) {
          sourceCells.push(cell);
          sourceValues.push(cell.computed !== undefined ? cell.computed : cell.value);
        }
      }
    }

    if (sourceCells.length < 2) return;

    const newCells = new Map(cells);
    let hasFormula = sourceCells.some(c => c.formula);

    if (hasFormula) {
      const firstCell = sourceCells[0];
      if (firstCell.formula) {
        const formula = firstCell.formula;

        if (isHorizontal) {
          for (let c = selection.startCol; c <= selection.endCol; c++) {
            const ref = coordsToCell(selection.startRow, c);
            const colOffset = c - selection.startCol;
            let newFormula = formula;
            
            const cellRefRegex = /([A-Z]+)(\\d+)/g;
            newFormula = newFormula.replace(cellRefRegex, (match, letters, num) => {
              const col = letters.charCodeAt(0) - 'A'.charCodeAt(0) + colOffset;
              const row = parseInt(num);
              let newLetters = '';
              let n = col;
              while (n >= 0) {
                newLetters = String.fromCharCode(n % 26 + 'A'.charCodeAt(0)) + newLetters;
                n = Math.floor(n / 26) - 1;
              }
              return newLetters + row;
            });

            const lexer = new Lexer(newFormula);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            try {
              const ast = parser.parse();
              const computed = evaluate(ast, (r) => newCells.get(r));
              newCells.set(ref, {
                value: newFormula,
                formula: newFormula,
                computed,
                style: firstCell.style,
                numberFormat: firstCell.numberFormat,
              });
            } catch {
              newCells.set(ref, {
                value: newFormula,
                formula: newFormula,
                computed: '#ERROR!',
                style: firstCell.style,
                numberFormat: firstCell.numberFormat,
              });
            }
          }
        } else {
          for (let r = selection.startRow; r <= selection.endRow; r++) {
            const ref = coordsToCell(r, selection.startCol);
            const rowOffset = r - selection.startRow;
            let newFormula = formula;

            const cellRefRegex = /([A-Z]+)(\\d+)/g;
            newFormula = newFormula.replace(cellRefRegex, (match, letters, num) => {
              const row = parseInt(num) + rowOffset;
              return letters + row;
            });

            const lexer = new Lexer(newFormula);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            try {
              const ast = parser.parse();
              const computed = evaluate(ast, (r) => newCells.get(r));
              newCells.set(ref, {
                value: newFormula,
                formula: newFormula,
                computed,
                style: firstCell.style,
                numberFormat: firstCell.numberFormat,
              });
            } catch {
              newCells.set(ref, {
                value: newFormula,
                formula: newFormula,
                computed: '#ERROR!',
                style: firstCell.style,
                numberFormat: firstCell.numberFormat,
              });
            }
          }
        }
      }
    } else {
      const numericValues = sourceValues.filter(v => typeof v === 'number') as number[];
      if (numericValues.length >= 2) {
        const step = numericValues[1] - numericValues[0];
        let nextVal = (numericValues[numericValues.length - 1] as number) + step;

        if (isHorizontal) {
          for (let c = selection.startCol + sourceCells.length; c <= selection.endCol; c++) {
            const ref = coordsToCell(selection.startRow, c);
            const strVal = String(nextVal);
            const num = parseFloat(strVal);
            newCells.set(ref, {
              value: strVal,
              computed: isNaN(num) ? strVal : num,
              style: sourceCells[0].style,
              numberFormat: sourceCells[0].numberFormat,
            });
            nextVal += step;
          }
        } else {
          for (let r = selection.startRow + sourceCells.length; r <= selection.endRow; r++) {
            const ref = coordsToCell(r, selection.startCol);
            const strVal = String(nextVal);
            const num = parseFloat(strVal);
            newCells.set(ref, {
              value: strVal,
              computed: isNaN(num) ? strVal : num,
              style: sourceCells[0].style,
              numberFormat: sourceCells[0].numberFormat,
            });
            nextVal += step;
          }
        }
      } else {
        const firstCell = sourceCells[0];
        if (isHorizontal) {
          for (let c = selection.startCol + 1; c <= selection.endCol; c++) {
            const ref = coordsToCell(selection.startRow, c);
            newCells.set(ref, {
              value: firstCell.value,
              computed: firstCell.computed,
              style: firstCell.style,
              numberFormat: firstCell.numberFormat,
            });
          }
        } else {
          for (let r = selection.startRow + 1; r <= selection.endRow; r++) {
            const ref = coordsToCell(r, selection.startCol);
            newCells.set(ref, {
              value: firstCell.value,
              computed: firstCell.computed,
              style: firstCell.style,
              numberFormat: firstCell.numberFormat,
            });
          }
        }
      }
    }

    updateSheet({ cells: newCells });
  }, [selection, cells, updateSheet]);

  const handleCanvasDoubleClick = () => {
    const ref = coordsToCell(selection.startRow, selection.startCol);
    const cell = cells.get(ref);
    setEditValue(cell?.formula || cell?.value || '');
    setIsEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue('');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        moveSelection(0, 1);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowFindPanel(true);
      setTimeout(() => findInputRef.current?.focus(), 0);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      copyCells();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      pasteCells();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      cutCells();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleExport('json');
      return;
    }

    const ref = coordsToCell(selection.startRow, selection.startCol);
    const cell = cells.get(ref);

    if (e.key === 'Enter' || e.key === 'F2') {
      if (cell) {
        setEditValue(cell.formula || cell.value || '');
        setIsEditing(true);
        setTimeout(() => editInputRef.current?.focus(), 0);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelectedCells();
      recomputeAll();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setEditValue(e.key);
      setIsEditing(true);
      setTimeout(() => editInputRef.current?.focus(), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1, 0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveSelection(0, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveSelection(0, 1);
    } else if (e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      setSelection(prev => ({
        ...prev,
        startRow: Math.max(0, prev.startRow - 1),
      }));
    } else if (e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      setSelection(prev => ({
        ...prev,
        endRow: Math.min(SHEET_ROW_COUNT - 1, prev.endRow + 1),
      }));
    } else if (e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelection(prev => ({
        ...prev,
        startCol: Math.max(0, prev.startCol - 1),
      }));
    } else if (e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault();
      setSelection(prev => ({
        ...prev,
        endCol: Math.min(SHEET_COL_COUNT - 1, prev.endCol + 1),
      }));
    }
  };

  const moveSelection = (deltaRow: number, deltaCol: number) => {
    setSelection(prev => ({
      startRow: Math.max(0, Math.min(SHEET_ROW_COUNT - 1, prev.startRow + deltaRow)),
      startCol: Math.max(0, Math.min(SHEET_COL_COUNT - 1, prev.startCol + deltaCol)),
      endRow: Math.max(0, Math.min(SHEET_ROW_COUNT - 1, prev.endRow + deltaRow)),
      endCol: Math.max(0, Math.min(SHEET_COL_COUNT - 1, prev.endCol + deltaCol)),
    }));
  };

  const commitEdit = () => {
    const ref = coordsToCell(selection.startRow, selection.startCol);
    const value = editValue.trim();

    if (!value) {
      const newCells = new Map(cells);
      newCells.delete(ref);
      updateSheet({ cells: newCells });
    } else {
      const isFormula = value.startsWith('=');
      const cell = cells.get(ref);
      const newCell: Cell = {
        value,
        formula: isFormula ? value : undefined,
        style: cell?.style,
        numberFormat: cell?.numberFormat,
      };

      const newCells = new Map(cells);
      newCells.set(ref, newCell);
      updateSheet({ cells: newCells });

      if (isFormula) {
        try {
          const lexer = new Lexer(value);
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          const ast = parser.parse();

          const compute = () => {
            updateSheet(prev => {
              const cellMap = prev.cells;
              const cell = cellMap.get(ref);
              if (!cell) return prev;
              try {
                const computed = evaluate(ast, (r) => cellMap.get(r));
                const newCellMap = new Map(cellMap);
                newCellMap.set(ref, { ...cell, computed });
                return { ...prev, cells: newCellMap };
              } catch {
                const newCellMap = new Map(cellMap);
                newCellMap.set(ref, { ...cell, computed: '#ERROR!' });
                return { ...prev, cells: newCellMap };
              }
            });
          };
          compute();
        } catch {
          const newCells2 = new Map(cells);
          newCells2.set(ref, { ...newCell, computed: '#ERROR!' });
          updateSheet({ cells: newCells2 });
        }
      } else {
        const num = parseFloat(value);
        const newCells2 = new Map(cells);
        newCells2.set(ref, { ...newCell, computed: isNaN(num) ? value : num });
        updateSheet({ cells: newCells2 });
      }
    }

    setIsEditing(false);
    setEditValue('');
  };

  const deleteSelectedCells = () => {
    const newCells = new Map(cells);
    for (let r = selection.startRow; r <= selection.endRow; r++) {
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        newCells.delete(coordsToCell(r, c));
      }
    }
    updateSheet({ cells: newCells });
  };

  const copyCells = () => {
    const data: Cell[][] = [];
    for (let r = selection.startRow; r <= selection.endRow; r++) {
      const row: Cell[] = [];
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        const ref = coordsToCell(r, c);
        row.push(cells.get(ref) || { value: '', computed: '' });
      }
      data.push(row);
    }
    navigator.clipboard.writeText(JSON.stringify(data));
  };

  const cutCells = () => {
    copyCells();
    deleteSelectedCells();
    recomputeAll();
  };

  const pasteCells = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text) as Cell[][];
      if (!Array.isArray(data) || data.length === 0) return;

      const newCells = new Map(cells);
      const offsetRow = selection.startRow;
      const offsetCol = selection.startCol;

      for (let r = 0; r < data.length; r++) {
        for (let c = 0; c < data[r].length; c++) {
          const targetRow = offsetRow + r;
          const targetCol = offsetCol + c;
          if (targetRow >= SHEET_ROW_COUNT || targetCol >= SHEET_COL_COUNT) continue;

          const ref = coordsToCell(targetRow, targetCol);
          const cell = data[r][c];

          if (cell.formula) {
            const newCell: Cell = { ...cell };
            newCells.set(ref, newCell);

            try {
              const lexer = new Lexer(cell.formula);
              const tokens = lexer.tokenize();
              const parser = new Parser(tokens);
              const ast = parser.parse();
              const computed = evaluate(ast, (r) => newCells.get(r));
              newCells.set(ref, { ...newCell, computed });
            } catch {
              newCells.set(ref, { ...newCell, computed: '#ERROR!' });
            }
          } else {
            newCells.set(ref, cell);
          }
        }
      }

      updateSheet({ cells: newCells });
      setSelection({
        startRow: offsetRow,
        startCol: offsetCol,
        endRow: Math.min(SHEET_ROW_COUNT - 1, offsetRow + data.length - 1),
        endCol: Math.min(SHEET_COL_COUNT - 1, offsetCol + (data[0]?.length || 0) - 1),
      });
    } catch {
      alert('无法粘贴数据');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollLeft(target.scrollLeft);
    setScrollTop(target.scrollTop);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
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
      const text = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            const newCells = new Map<string, Cell>();
            data.forEach((row: (string | number)[], rowIdx: number) => {
              row.forEach((val, colIdx) => {
                const ref = coordsToCell(rowIdx, colIdx);
                const strVal = String(val);
                const num = parseFloat(strVal);
                newCells.set(ref, {
                  value: strVal,
                  computed: isNaN(num) ? strVal : num,
                });
              });
            });
            updateSheet({ cells: newCells });
          }
        } catch {
          alert('Invalid JSON file');
        }
      } else {
        const lines = text.split('\\n').filter(line => line.trim());
        const newCells = new Map<string, Cell>();
        lines.forEach((line, rowIdx) => {
          const values = line.split(',');
          values.forEach((val, colIdx) => {
            const ref = coordsToCell(rowIdx, colIdx);
            const trimmed = val.trim().replace(/^"|"$/g, '');
            const num = parseFloat(trimmed);
            newCells.set(ref, {
              value: trimmed,
              computed: isNaN(num) ? trimmed : num,
            });
          });
        });
        updateSheet({ cells: newCells });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = (format: 'csv' | 'json') => {
    const maxRow = Math.max(...Array.from(cells.keys()).map(ref => cellToCoords(ref).row), 0);
    const maxCol = Math.max(...Array.from(cells.keys()).map(ref => cellToCoords(ref).col), 0);

    if (format === 'json') {
      const data: (string | number)[][] = [];
      for (let r = 0; r <= maxRow; r++) {
        const row: (string | number)[] = [];
        for (let c = 0; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          const cell = cells.get(ref);
          row.push(cell?.computed !== undefined ? cell.computed : '');
        }
        data.push(row);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'snapsheet.json');
    } else {
      const lines: string[] = [];
      for (let r = 0; r <= maxRow; r++) {
        const row: string[] = [];
        for (let c = 0; c <= maxCol; c++) {
          const ref = coordsToCell(r, c);
          const cell = cells.get(ref);
          const val = cell?.computed !== undefined ? String(cell.computed) : '';
          row.push(val.includes(',') ? `"${val}"` : val);
        }
        lines.push(row.join(','));
      }
      const blob = new Blob([lines.join('\\n')], { type: 'text/csv' });
      downloadBlob(blob, 'snapsheet.csv');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewSheet = () => {
    const newId = 'sheet' + Date.now();
    const newName = 'Sheet' + (sheets.length + 1);
    setSheets(prev => [...prev, createEmptySheet(newId, newName)]);
    setActiveSheetId(newId);
    setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    setScrollLeft(0);
    setScrollTop(0);
  };

  const handleDeleteSheet = () => {
    if (sheets.length <= 1) {
      alert('至少保留一个工作表');
      return;
    }
    setSheets(prev => prev.filter(s => s.id !== activeSheetId));
    setActiveSheetId(sheets[0].id === activeSheetId ? sheets[1].id : sheets[0].id);
  };

  const applyStyle = (style: Partial<CellStyle>) => {
    const newCells = new Map(cells);
    for (let r = selection.startRow; r <= selection.endRow; r++) {
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        const ref = coordsToCell(r, c);
        const cell = newCells.get(ref) || { value: '', computed: '' };
        newCells.set(ref, {
          ...cell,
          style: { ...cell.style, ...style },
        });
      }
    }
    updateSheet({ cells: newCells });
  };

  const applyNumberFormat = (format: NumberFormat) => {
    const newCells = new Map(cells);
    for (let r = selection.startRow; r <= selection.endRow; r++) {
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        const ref = coordsToCell(r, c);
        const cell = newCells.get(ref) || { value: '', computed: '' };
        newCells.set(ref, {
          ...cell,
          numberFormat: format,
        });
      }
    }
    updateSheet({ cells: newCells });
  };

  const addConditionalFormat = () => {
    updateSheet(prev => ({
      ...prev,
      conditionalFormats: [...prev.conditionalFormats, newConditionalFormat],
    }));
  };

  const toggleBold = () => {
    const ref = coordsToCell(selection.startRow, selection.startCol);
    const cell = cells.get(ref);
    applyStyle({ bold: !(cell?.style?.bold) });
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    applyStyle({ align });
  };

  const setColor = (color: string) => {
    applyStyle({ color });
  };

  const setBgColor = (color: string) => {
    applyStyle({ bgColor });
  };

  const insertRow = () => {
    const newCells = new Map(cells);
    const newRowHeights = new Map(rowHeights);

    for (let r = SHEET_ROW_COUNT - 1; r > selection.startRow; r--) {
      for (let c = 0; c < SHEET_COL_COUNT; c++) {
        const oldRef = coordsToCell(r - 1, c);
        const newRef = coordsToCell(r, c);
        const cell = newCells.get(oldRef);
        if (cell) {
          newCells.set(newRef, cell);
          newCells.delete(oldRef);
        }
      }
      newRowHeights.set(r, newRowHeights.get(r - 1) || DEFAULT_ROW_HEIGHT);
    }

    updateSheet({ cells: newCells, rowHeights: newRowHeights });
    setSelection(prev => ({
      ...prev,
      startRow: prev.startRow + 1,
      endRow: prev.endRow + 1,
    }));
  };

  const insertCol = () => {
    const newCells = new Map(cells);
    const newColWidths = new Map(colWidths);

    for (let c = SHEET_COL_COUNT - 1; c > selection.startCol; c--) {
      for (let r = 0; r < SHEET_ROW_COUNT; r++) {
        const oldRef = coordsToCell(r, c - 1);
        const newRef = coordsToCell(r, c);
        const cell = newCells.get(oldRef);
        if (cell) {
          newCells.set(newRef, cell);
          newCells.delete(oldRef);
        }
      }
      newColWidths.set(c, newColWidths.get(c - 1) || DEFAULT_COL_WIDTH);
    }

    updateSheet({ cells: newCells, colWidths: newColWidths });
    setSelection(prev => ({
      ...prev,
      startCol: prev.startCol + 1,
      endCol: prev.endCol + 1,
    }));
  };

  const deleteRow = () => {
    const newCells = new Map(cells);

    for (let r = selection.startRow; r < SHEET_ROW_COUNT - 1; r++) {
      for (let c = 0; c < SHEET_COL_COUNT; c++) {
        const oldRef = coordsToCell(r + 1, c);
        const newRef = coordsToCell(r, c);
        const cell = newCells.get(oldRef);
        if (cell) {
          newCells.set(newRef, cell);
        }
        newCells.delete(oldRef);
      }
    }

    updateSheet({ cells: newCells });
  };

  const deleteCol = () => {
    const newCells = new Map(cells);

    for (let c = selection.startCol; c < SHEET_COL_COUNT - 1; c++) {
      for (let r = 0; r < SHEET_ROW_COUNT; r++) {
        const oldRef = coordsToCell(r, c + 1);
        const newRef = coordsToCell(r, c);
        const cell = newCells.get(oldRef);
        if (cell) {
          newCells.set(newRef, cell);
        }
        newCells.delete(oldRef);
      }
    }

    updateSheet({ cells: newCells });
  };

  const sortColumn = (ascending: boolean = true) => {
    const col = selection.startCol;
    const startRow = selection.startRow;
    const endRow = selection.endRow;

    const rows: { row: number; val: number | string }[] = [];
    for (let r = startRow; r <= endRow; r++) {
      const ref = coordsToCell(r, col);
      const cell = cells.get(ref);
      const val = cell?.computed !== undefined ? cell?.computed : cell?.value || '';
      rows.push({ row: r, val });
    }

    rows.sort((a, b) => {
      const aVal = typeof a.val === 'number' ? a.val : parseFloat(String(a.val)) || -Infinity;
      const bVal = typeof b.val === 'number' ? b.val : parseFloat(String(b.val)) || -Infinity;
      return ascending ? aVal - bVal : bVal - aVal;
    });

    const newCells = new Map(cells);
    const uniqueRows = [...new Set(rows.map(r => r.row))];
    const tempCells: Map<string, Cell> = new Map();

    uniqueRows.forEach(row => {
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        const ref = coordsToCell(row, c);
        const cell = cells.get(ref);
        if (cell) {
          tempCells.set(`${row}-${c}`, cell);
        }
      }
    });

    uniqueRows.forEach((row, idx) => {
      const targetRow = startRow + idx;
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        const ref = coordsToCell(targetRow, c);
        const cell = tempCells.get(`${row}-${c}`);
        if (cell) {
          newCells.set(ref, { ...cell });
        }
      }
    });

    updateSheet({ cells: newCells });
  };

  const setFrozenRows = (count: number) => {
    updateSheet({ frozenRows: count });
  };

  const setFrozenCols = (count: number) => {
    updateSheet({ frozenCols: count });
  };

  const analyzeSelection = () => {
    const values: number[] = [];
    for (let r = selection.startRow; r <= selection.endRow; r++) {
      for (let c = selection.startCol; c <= selection.endCol; c++) {
        const ref = coordsToCell(r, c);
        const cell = cells.get(ref);
        if (cell?.computed !== undefined) {
          const num = parseFloat(String(cell.computed));
          if (!isNaN(num)) values.push(num);
        }
      }
    }

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;

    return {
      count: values.length,
      sum,
      avg,
      max,
      min,
      range,
      trend: avg > (max + min) / 2 ? '偏高' : '偏低',
    };
  };

  const findTextInCells = () => {
    if (!findText.trim()) {
      setFindResults([]);
      setCurrentFindIndex(-1);
      return;
    }

    const results: { ref: string; row: number; col: number }[] = [];
    cells.forEach((cell, ref) => {
      const value = cell.value || cell.computed;
      if (String(value).toLowerCase().includes(findText.toLowerCase())) {
        const coords = cellToCoords(ref);
        results.push({ ref, row: coords.row, col: coords.col });
      }
    });

    setFindResults(results);
    setCurrentFindIndex(results.length > 0 ? 0 : -1);
    if (results.length > 0) {
      setSelection({
        startRow: results[0].row,
        startCol: results[0].col,
        endRow: results[0].row,
        endCol: results[0].col,
      });
    }
  };

  const findNext = () => {
    if (findResults.length === 0) return;
    const nextIndex = (currentFindIndex + 1) % findResults.length;
    setCurrentFindIndex(nextIndex);
    const result = findResults[nextIndex];
    setSelection({
      startRow: result.row,
      startCol: result.col,
      endRow: result.row,
      endCol: result.col,
    });
  };

  const findPrev = () => {
    if (findResults.length === 0) return;
    const prevIndex = (currentFindIndex - 1 + findResults.length) % findResults.length;
    setCurrentFindIndex(prevIndex);
    const result = findResults[prevIndex];
    setSelection({
      startRow: result.row,
      startCol: result.col,
      endRow: result.row,
      endCol: result.col,
    });
  };

  const replaceCurrent = () => {
    if (currentFindIndex < 0 || !replaceText) return;
    const result = findResults[currentFindIndex];
    const cell = cells.get(result.ref);
    if (cell) {
      const newValue = String(cell.value).replace(findText, replaceText);
      const newCells = new Map(cells);
      newCells.set(result.ref, { ...cell, value: newValue });
      updateSheet({ cells: newCells });
      findNext();
    }
  };

  const replaceAll = () => {
    if (!findText || !replaceText || findResults.length === 0) return;
    const newCells = new Map(cells);
    findResults.forEach(result => {
      const cell = newCells.get(result.ref);
      if (cell) {
        const newValue = String(cell.value).replace(findText, replaceText);
        newCells.set(result.ref, { ...cell, value: newValue });
      }
    });
    updateSheet({ cells: newCells });
    findTextInCells();
  };

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
                <button onClick={() => applyNumberFormat({ type: 'number', decimalPlaces: 2 })} className="
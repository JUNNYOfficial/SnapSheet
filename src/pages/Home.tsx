import { useState, useRef, useEffect, useCallback } from 'react';
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
import type { Cell, CellStyle, Selection, Sheet } from '@/types';

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
  const [showAIPanel, setShowAIPanel] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
  const cells = activeSheet.cells;
  const colWidths = activeSheet.colWidths;
  const rowHeights = activeSheet.rowHeights;

  const getColWidth = useCallback((col: number) => colWidths.get(col) ?? DEFAULT_COL_WIDTH, [colWidths]);
  const getRowHeight = useCallback((row: number) => rowHeights.get(row) ?? DEFAULT_ROW_HEIGHT, [rowHeights]);

  const getCell = useCallback((ref: string) => cells.get(ref), [cells]);

  const updateSheet = useCallback((updates: Partial<Sheet> | ((prev: Sheet) => Partial<Sheet>)) => {
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newUpdates = typeof updates === 'function' ? updates(s) : updates;
      return { ...s, ...newUpdates };
    }));
  }, [activeSheetId]);

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

      const colLetter = coordsToCell(0, col).replace(/\d+/, '');
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
          const displayValue = cell.computed !== undefined ? String(cell.computed) : cell.value;
          const cellPadding = 4;
          const maxWidth = getColWidth(col) - cellPadding * 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(cellXPos, cellY, getColWidth(col), getRowHeight(row));
          ctx.clip();

          ctx.fillStyle = CELL_TEXT;
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
  }, [cells, selection, scrollLeft, scrollTop, colWidths, rowHeights, getColWidth, getRowHeight]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isEditing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
      if (!isDraggingCol) return;
      const delta = e.clientX - dragStartX;
      const newWidth = Math.max(MIN_COL_WIDTH, dragStartWidth + delta);
      const newColWidths = new Map(colWidths);
      newColWidths.set(dragColIndex, newWidth);
      updateSheet({ colWidths: newColWidths });
    };

    const handleMouseUp = () => {
      setIsDraggingCol(false);
    };

    if (isDraggingCol) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCol, dragStartX, dragStartWidth, dragColIndex, colWidths, updateSheet]);

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
        const lines = text.split('\n').filter(line => line.trim());
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
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
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

  const toggleBold = () => {
    const ref = coordsToCell(selection.startRow, selection.startCol);
    const cell = cells.get(ref);
    applyStyle({ bold: !(cell?.style?.bold) });
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    applyStyle({ align });
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

  const aiAnalysis = analyzeSelection();
  const currentCellRef = coordsToCell(selection.startRow, selection.startCol);
  const currentCell = cells.get(currentCellRef);

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center h-12 px-4 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-1">
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
              导出
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
            左
          </button>
          <button
            onClick={() => setAlign('center')}
            className={`px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded ${currentCell?.style?.align === 'center' ? 'bg-gray-200' : ''}`}
          >
            中
          </button>
          <button
            onClick={() => setAlign('right')}
            className={`px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded ${currentCell?.style?.align === 'right' ? 'bg-gray-200' : ''}`}
          >
            右
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
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
            className={`absolute inset-0 outline-none ${isDraggingCol ? 'cursor-col-resize' : ''}`}
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
      </div>

      <div className="flex items-center h-8 px-4 border-t border-gray-200 bg-gray-50 gap-2">
        <div className="flex items-center gap-1">
          {sheets.map(sheet => (
            <button
              key={sheet.id}
              onClick={() => setActiveSheetId(sheet.id)}
              className={`px-3 py-1 text-xs font-medium rounded ${activeSheetId === sheet.id ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            >
              {sheet.name}
            </button>
          ))}
          <button
            onClick={handleNewSheet}
            className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded"
          >
            +
          </button>
          {sheets.length > 1 && (
            <button
              onClick={handleDeleteSheet}
              className="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded"
            >
              x
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

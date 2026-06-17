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
import type { Cell, Selection } from '@/types';

export default function Home() {
  const [cells, setCells] = useState<Map<string, Cell>>(new Map());
  const [selection, setSelection] = useState<Selection>({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [colWidths] = useState<Map<number, number>>(new Map());
  const [rowHeights] = useState<Map<number, number>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getColWidth = useCallback((col: number) => colWidths.get(col) ?? DEFAULT_COL_WIDTH, [colWidths]);
  const getRowHeight = useCallback((row: number) => rowHeights.get(row) ?? DEFAULT_ROW_HEIGHT, [rowHeights]);

  const getCell = useCallback((ref: string) => cells.get(ref), [cells]);

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

    setCells(newCells);
  }, [cells, getCell]);

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

    x = HEADER_COL_WIDTH - scrollLeft;
    for (let col = 0; col <= SHEET_COL_COUNT; col++) {
      x += getColWidth(col);
    }

    y = HEADER_ROW_HEIGHT - scrollTop;
    for (let row = 0; row <= SHEET_ROW_COUNT; row++) {
      y += getRowHeight(row);
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

    ctx.fillStyle = CELL_TEXT;
    ctx.font = CELL_FONT;
    ctx.textBaseline = 'middle';

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
          ctx.textAlign = 'left';
          ctx.fillText(
            displayValue,
            cellXPos + cellPadding,
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

    const ref = coordsToCell(selection.startRow, selection.startCol);
    const cell = cells.get(ref);

    if (e.key === 'Enter' || e.key === 'F2') {
      if (cell) {
        setEditValue(cell.formula || cell.value || '');
        setIsEditing(true);
        setTimeout(() => editInputRef.current?.focus(), 0);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      setCells(prev => {
        const next = new Map(prev);
        next.delete(ref);
        return next;
      });
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
      setCells(prev => {
        const next = new Map(prev);
        next.delete(ref);
        return next;
      });
    } else {
      const isFormula = value.startsWith('=');
      const newCell: Cell = {
        value,
        formula: isFormula ? value : undefined,
      };

      setCells(prev => {
        const next = new Map(prev);
        next.set(ref, newCell);
        return next;
      });

      if (isFormula) {
        try {
          const lexer = new Lexer(value);
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          const ast = parser.parse();

          const compute = () => {
            setCells(prev => {
              const cell = prev.get(ref);
              if (!cell) return prev;
              try {
                const computed = evaluate(ast, (r) => prev.get(r));
                return new Map(prev).set(ref, { ...cell, computed });
              } catch {
                return new Map(prev).set(ref, { ...cell, computed: '#ERROR!' });
              }
            });
          };
          compute();
        } catch {
          setCells(prev => new Map(prev).set(ref, { ...newCell, computed: '#ERROR!' }));
        }
      } else {
        const num = parseFloat(value);
        setCells(prev => new Map(prev).set(ref, { ...newCell, computed: isNaN(num) ? value : num }));
      }
    }

    setIsEditing(false);
    setEditValue('');
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
            setCells(newCells);
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
        setCells(newCells);
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
    setCells(new Map());
    setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    setScrollLeft(0);
    setScrollTop(0);
  };

  const currentCellRef = coordsToCell(selection.startRow, selection.startCol);
  const currentCell = cells.get(currentCellRef);

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center h-12 px-4 border-b border-gray-200 gap-2">
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

        <div className="flex-1" />

        <div className="flex items-center gap-2">
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
          className="absolute inset-0 outline-none"
        />
      </div>

      <div className="flex items-center h-8 px-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Sheet1</span>
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

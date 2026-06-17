import { useEffect, useRef } from 'react';
import { CanvasRenderer } from '../canvas/CanvasRenderer';
import { useSpreadsheetStore, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../store/useSpreadsheetStore';
import { coordsToCell, colToLetter } from '../utils/cellRef';
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  HEADER_COL_WIDTH,
  HEADER_ROW_HEIGHT,
} from '../utils/constants';

export default function Spreadsheet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const store = useSpreadsheetStore;
  const selection = store((s) => s.selection);
  const editing = store((s) => s.editing);
  const formulaBarValue = store((s) => s.formulaBarValue);
  const scrollLeft = store((s) => s.scrollLeft);
  const scrollTop = store((s) => s.scrollTop);

  useEffect(() => {
    if (!canvasRef.current) return;

    const getCell = (row: number, col: number) => {
      const sheet = store.getState().getActiveSheet();
      const ref = coordsToCell(row, col);
      return sheet.cells.get(ref);
    };

    const renderer = new CanvasRenderer({
      canvas: canvasRef.current,
      getCell,
      getColWidth: (col) => store.getState().getColWidth(col),
      getRowHeight: (row) => store.getState().getRowHeight(row),
      setColWidth: (col, width) => store.getState().setColWidth(col, width),
      onSelect: (row, col) => {
        store.getState().setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      },
      onSelection: (sel) => store.getState().setSelection(sel),
      onEdit: (row, col) => store.getState().setEditing(row, col),
      onEditWithChar: (row, col, ch) => {
        store.getState().setEditing(row, col);
        store.getState().setFormulaBarValue(ch);
      },
      onClearSelection: () => store.getState().clearSelection(),
      onCopy: () => store.getState().copySelection(),
      onPaste: (text) => {
        const sel = store.getState().selection;
        store.getState().pasteCells(text, sel.startRow, sel.startCol);
      },
      onUndo: () => store.getState().undo(),
      onRedo: () => store.getState().redo(),
      onScrollChange: (left, top) => store.getState().setScroll(left, top),
      maxRows: SHEET_ROW_COUNT,
      maxCols: SHEET_COL_COUNT,
      selection: store.getState().selection,
    });

    rendererRef.current = renderer;
    renderer.render();

    const handleResize = () => {
      renderer.resize();
      renderer.render();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setScroll(scrollLeft, scrollTop);
      rendererRef.current.render();
    }
  }, [scrollLeft, scrollTop]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSelection(selection);
      rendererRef.current.scrollIntoView(selection.startRow, selection.startCol);
      rendererRef.current.render();
    }
  }, [selection]);

  useEffect(() => {
    if (editing && editInputRef.current) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 10);
    }
  }, [editing]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.render();
  });

  const getEditInputStyle = () => {
    if (!editing) return {};
    const colWidths: number[] = [];
    for (let c = 0; c < editing.col; c++) {
      colWidths.push(store.getState().getColWidth(c));
    }
    const x = HEADER_COL_WIDTH - scrollLeft + colWidths.reduce((a, b) => a + b, 0);
    const rowHeights: number[] = [];
    for (let r = 0; r < editing.row; r++) {
      rowHeights.push(store.getState().getRowHeight(r));
    }
    const y = HEADER_ROW_HEIGHT - scrollTop + rowHeights.reduce((a, b) => a + b, 0);
    const width = store.getState().getColWidth(editing.col);
    const height = store.getState().getRowHeight(editing.row);
    return {
      left: x + 'px',
      top: y + 'px',
      width: width + 'px',
      height: height + 'px',
    };
  };

  return (
    <div className="relative flex-1 overflow-hidden bg-white">
      <canvas ref={canvasRef} className="w-full h-full cursor-cell" style={{ display: 'block' }} />
      {editing && (
        <input
          ref={editInputRef}
          type="text"
          className="absolute z-10 border-2 border-neutral-800 bg-white px-1.5 outline-none"
          style={{
            ...getEditInputStyle(),
            fontFamily: 'SimSun, 宋体, SimHei, 黑体, monospace',
            fontSize: '13px',
            lineHeight: String(DEFAULT_ROW_HEIGHT) + 'px',
          }}
          value={formulaBarValue}
          onChange={(e) => store.getState().setFormulaBarValue(e.target.value)}
          onBlur={(e) => store.getState().commitEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const curEditing = store.getState().editing;
              (e.target as HTMLInputElement).blur();
              if (curEditing) {
                const newRow = curEditing.row + 1;
                const newCol = curEditing.col;
                store.getState().setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              store.getState().setEditing(0, null);
            } else if (e.key === 'Tab') {
              e.preventDefault();
              const curEditing = store.getState().editing;
              (e.target as HTMLInputElement).blur();
              if (curEditing) {
                const newRow = curEditing.row;
                const newCol = curEditing.col + 1;
                store.getState().setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
              }
            }
          }}
        />
      )}
    </div>
  );
}

export { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT, HEADER_COL_WIDTH, HEADER_ROW_HEIGHT, colToLetter };

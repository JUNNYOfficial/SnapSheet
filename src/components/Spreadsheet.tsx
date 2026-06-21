/**
 * @file components/Spreadsheet.tsx
 * @description 电子表格主组件。
 *              负责挂载 Canvas 渲染器、绑定编辑输入框、处理滚动/主题/选择变化，
 *              并作为 CanvasRenderer 与全局状态之间的桥接层。
 */

import { useEffect, useRef, useState } from 'react';
import { CanvasRenderer } from '../canvas/CanvasRenderer';
import { useSpreadsheetStore, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../store/useSpreadsheetStore';
import { coordsToCell } from '../utils/cellRef';
import {
  DEFAULT_ROW_HEIGHT,
  HEADER_COL_WIDTH,
  HEADER_ROW_HEIGHT,
} from '../utils/constants';
import ContextMenu from './ContextMenu';

interface SpreadsheetProps {
  isDark?: boolean;
}

export default function Spreadsheet({ isDark = false }: SpreadsheetProps) {
  /** Canvas DOM 引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 单元格编辑输入框引用 */
  const editInputRef = useRef<HTMLInputElement>(null);
  /** CanvasRenderer 实例引用 */
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const store = useSpreadsheetStore;
  const selection = store((s) => s.selection);
  const editing = store((s) => s.editing);
  const formulaBarValue = store((s) => s.formulaBarValue);
  const scrollLeft = store((s) => s.scrollLeft);
  const scrollTop = store((s) => s.scrollTop);
  const workbook = store((s) => s.workbook);
  /** 右键菜单位置状态，null 表示未打开 */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  /**
   * 初始化 CanvasRenderer，并绑定单元格读取、选择、编辑、粘贴、滚动等回调。
   * 只在组件挂载时执行一次。
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    const getCell = (row: number, col: number) => {
      const sheet = store.getState().getActiveSheet();
      const ref = coordsToCell(row, col);
      return sheet.cells.get(ref);
    };

    const renderer = new CanvasRenderer({
      canvas: canvasRef.current,
      isDark,
      getCell,
      getColWidth: (col) => store.getState().getColWidth(col),
      getRowHeight: (row) => store.getState().getRowHeight(row),
      setColWidth: (col, width) => store.getState().setColWidth(col, width),
      setRowHeight: (row, height) => store.getState().setRowHeight(row, height),
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
      onFill: (source, target) => store.getState().fillRange(source, target),
      onContextMenu: (row, col, x, y) => {
        void row;
        void col;
        setContextMenu({ x, y });
      },
      getMergedRange: (row, col) => store.getState().getMergedRange(row, col),
      getConditionalFormats: () => store.getState().getActiveSheet().conditionalFormats,
      onScrollChange: (left, top) => store.getState().setScroll(left, top),
      maxRows: SHEET_ROW_COUNT,
      maxCols: SHEET_COL_COUNT,
      frozenRows: store.getState().getActiveSheet().frozenRows,
      frozenCols: store.getState().getActiveSheet().frozenCols,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 滚动变化时通知渲染器重绘 */
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setScroll(scrollLeft, scrollTop);
      rendererRef.current.render();
    }
  }, [scrollLeft, scrollTop]);

  /** 选择区域变化时通知渲染器重绘 */
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSelection(selection);
      rendererRef.current.render();
    }
  }, [selection]);

  /** 进入编辑状态时聚焦并全选输入框内容 */
  useEffect(() => {
    if (editing && editInputRef.current) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 10);
    }
  }, [editing]);

  /** 主题切换时通知渲染器更新 */
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTheme(isDark);
      rendererRef.current.render();
    }
  }, [isDark]);

  /** 激活工作表变化时同步冻结窗格配置 */
  useEffect(() => {
    if (rendererRef.current) {
      const sheet = store.getState().getActiveSheet();
      rendererRef.current.setFrozenPanes(sheet.frozenRows, sheet.frozenCols);
      rendererRef.current.render();
    }
  }, [workbook.activeSheetId, store]);

  /** 获取当前编辑单元格的数据 */
  const getEditCell = () => {
    if (!editing) return undefined;
    const sheet = store.getState().getActiveSheet();
    return sheet.cells.get(coordsToCell(editing.row, editing.col));
  };

  /**
   * 计算编辑输入框在 Canvas 上的绝对定位样式。
   * 基于行高、列宽与滚动偏移定位到对应单元格位置。
   */
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

  /** 从系统剪贴板读取文本并粘贴到当前选择区域 */
  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    const sel = store.getState().selection;
    store.getState().pasteCells(text, sel.startRow, sel.startCol);
  };

  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: 'var(--ss-bg)' }}>
      <canvas ref={canvasRef} className="w-full h-full cursor-cell" style={{ display: 'block' }} />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCopy={() => {
            const text = store.getState().copySelection();
            if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
          }}
          onPaste={handlePaste}
          onClear={() => store.getState().clearSelection()}
          onClearFormat={() => store.getState().clearFormatSelection()}
          onInsertRow={() => store.getState().insertRow(selection.startRow)}
          onDeleteRow={() => store.getState().deleteRow(selection.startRow)}
          onInsertCol={() => store.getState().insertCol(selection.startCol)}
          onDeleteCol={() => store.getState().deleteCol(selection.startCol)}
        />
      )}
      {editing && (
        <input
          ref={editInputRef}
          type="text"
          className="absolute z-10 border-2 px-1.5 outline-none"
          style={{
            ...getEditInputStyle(),
            borderColor: 'var(--ss-selected-border)',
            background: 'var(--ss-bg)',
            color: 'var(--ss-text-primary)',
            fontFamily: getEditCell()?.style?.fontFamily || 'monospace',
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
                const delta = e.shiftKey ? -1 : 1;
                const newRow = curEditing.row + delta;
                const newCol = curEditing.col;
                if (newRow >= 0 && newRow < SHEET_ROW_COUNT) {
                  store.getState().setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
                }
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              store.getState().setEditing(0, null);
            } else if (e.key === 'Tab') {
              e.preventDefault();
              const curEditing = store.getState().editing;
              (e.target as HTMLInputElement).blur();
              if (curEditing) {
                const delta = e.shiftKey ? -1 : 1;
                const newRow = curEditing.row;
                const newCol = curEditing.col + delta;
                if (newCol >= 0 && newCol < SHEET_COL_COUNT) {
                  store.getState().setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}

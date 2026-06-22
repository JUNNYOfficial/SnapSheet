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
  FONT_SIZE,
  HEADER_COL_WIDTH,
  HEADER_ROW_HEIGHT,
} from '../utils/constants';
import ContextMenu from './ContextMenu';
import HeaderContextMenu from './HeaderContextMenu';
import { requestDeleteConfirmation } from '../utils/deleteConfirmation';

/** 测量文本渲染宽度，用于编辑框自适应 */
function measureTextWidth(text: string, font: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

interface SpreadsheetProps {
  isDark?: boolean;
}

export default function Spreadsheet({ isDark = false }: SpreadsheetProps) {
  /** Canvas DOM 引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 单元格编辑输入框引用 */
  const editInputRef = useRef<HTMLTextAreaElement>(null);
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
  /** 表头右键菜单状态 */
  const [headerContextMenu, setHeaderContextMenu] = useState<{ type: 'row' | 'col'; index: number; x: number; y: number } | null>(null);
  /** 编辑输入框自适应宽度 */
  const [editInputWidth, setEditInputWidth] = useState<number>(0);

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
        const current = store.getState().editing;
        if (current && current.row === row && current.col === col) {
          // 输入框尚未获得焦点时，后续字符仍可能由 Canvas 派发，直接追加
          store.getState().setFormulaBarValue(store.getState().formulaBarValue + ch);
        } else {
          store.getState().setEditing(row, col);
          store.getState().setFormulaBarValue(ch);
        }
      },
      onClearSelection: () =>
        requestDeleteConfirmation(() => store.getState().clearSelection(), '清除内容'),
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
      onHeaderContextMenu: (type, index, x, y) => {
        void index;
        setHeaderContextMenu({ type, index, x, y });
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
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
      rendererRef.current = null;
    };
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

  /**
   * 进入编辑状态时聚焦输入框并设置光标位置。
   * - 双击 / F2 / Delete 进入编辑：全选已有内容。
   * - 直接输入字符进入编辑：光标放到末尾，避免第二个字符覆盖第一个字符。
   */
  useEffect(() => {
    if (editing && editInputRef.current) {
      setEditInputWidth(0);
      const input = editInputRef.current;
      input.focus();
      const original = store.getState().editOriginalValue;
      const current = store.getState().formulaBarValue;
      if (current === original && current !== '') {
        input.select();
      } else {
        input.setSelectionRange(current.length, current.length);
      }
    }
  }, [editing, store]);

  /** 编辑内容变化时自适应输入框宽度 */
  useEffect(() => {
    if (!editing) return;
    const sheet = store.getState().getActiveSheet();
    const cell = sheet.cells.get(coordsToCell(editing.row, editing.col));
    const font = `${cell?.style?.fontSize || FONT_SIZE}px ${cell?.style?.fontFamily || 'monospace'}`;
    const textWidth = measureTextWidth(formulaBarValue || ' ', font);
    setEditInputWidth(textWidth + 24);
  }, [formulaBarValue, editing, store]);

  /** 主题切换时通知渲染器更新 */
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTheme(isDark);
      rendererRef.current.render();
    }
  }, [isDark]);

  /**
   * 工作簿数据变化（单元格、样式、行列尺寸、冻结窗格等）时重绘。
   * 依赖整个 workbook 对象，确保单元格内容更新后表格立即刷新。
   */
  useEffect(() => {
    if (rendererRef.current) {
      const sheet = store.getState().getActiveSheet();
      rendererRef.current.setFrozenPanes(sheet.frozenRows, sheet.frozenCols);
      rendererRef.current.render();
    }
  }, [workbook, store]);

  /** 获取当前编辑单元格的数据 */
  const getEditCell = () => {
    if (!editing) return undefined;
    const sheet = store.getState().getActiveSheet();
    return sheet.cells.get(coordsToCell(editing.row, editing.col));
  };

  /**
   * 计算编辑输入框在 Canvas 上的绝对定位样式。
   * 支持合并单元格覆盖整个合并区域，并随滚动实时跟随，宽度随内容自适应。
   */
  const getEditInputStyle = () => {
    if (!editing) return {};
    const state = store.getState();
    const merged = state.getMergedRange(editing.row, editing.col);
    const startRow = merged ? merged.startRow : editing.row;
    const startCol = merged ? merged.startCol : editing.col;
    const endRow = merged ? merged.endRow : editing.row;
    const endCol = merged ? merged.endCol : editing.col;

    let x = HEADER_COL_WIDTH - scrollLeft;
    for (let c = 0; c < startCol; c++) x += state.getColWidth(c);

    let y = HEADER_ROW_HEIGHT - scrollTop;
    for (let r = 0; r < startRow; r++) y += state.getRowHeight(r);

    let width = 0;
    for (let c = startCol; c <= endCol; c++) width += state.getColWidth(c);
    width = Math.max(width, editInputWidth);

    let height = 0;
    for (let r = startRow; r <= endRow; r++) height += state.getRowHeight(r);

    return {
      left: x + 'px',
      top: y + 'px',
      width: width + 'px',
      height: height + 'px',
      lineHeight: height + 'px',
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
          onClear={() =>
            requestDeleteConfirmation(() => store.getState().clearSelection(), '清除内容')
          }
          onClearFormat={() => store.getState().clearFormatSelection()}
          onInsertRow={() => store.getState().insertRow(selection.startRow)}
          onDeleteRow={() =>
            requestDeleteConfirmation(() => store.getState().deleteRow(selection.startRow), '删除行')
          }
          onInsertCol={() => store.getState().insertCol(selection.startCol)}
          onDeleteCol={() =>
            requestDeleteConfirmation(() => store.getState().deleteCol(selection.startCol), '删除列')
          }
        />
      )}
      {headerContextMenu && (
        <HeaderContextMenu
          type={headerContextMenu.type}
          index={headerContextMenu.index}
          x={headerContextMenu.x}
          y={headerContextMenu.y}
          onClose={() => setHeaderContextMenu(null)}
        />
      )}
      {editing && (
        <textarea
          ref={editInputRef}
          className="absolute z-10 border-2 px-1.5 py-0 outline-none resize-none"
          style={{
            ...getEditInputStyle(),
            borderColor: 'var(--ss-selected-border)',
            background: 'var(--ss-bg)',
            color: 'var(--ss-text-primary)',
            fontFamily: getEditCell()?.style?.fontFamily || 'monospace',
            fontSize: `${getEditCell()?.style?.fontSize || FONT_SIZE}px`,
            lineHeight: `${(getEditCell()?.style?.fontSize || FONT_SIZE) + 3}px`,
            whiteSpace: 'pre',
            overflow: 'hidden',
          }}
          value={formulaBarValue}
          onChange={(e) => store.getState().setFormulaBarValue(e.target.value)}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = 'auto';
            el.style.height = `${Math.max(el.scrollHeight, el.offsetHeight)}px`;
          }}
          onBlur={(e) => {
            // 若 Esc 已取消编辑，则失焦不再提交
            if (store.getState().editing) {
              store.getState().commitEdit(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.altKey && !e.shiftKey) {
              e.preventDefault();
              const curEditing = store.getState().editing;
              (e.target as HTMLTextAreaElement).blur();
              if (curEditing) {
                const newRow = curEditing.row + 1;
                const newCol = curEditing.col;
                if (newRow >= 0 && newRow < SHEET_ROW_COUNT) {
                  store.getState().setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
                }
              }
            } else if (e.key === 'Enter' && e.shiftKey && !e.altKey) {
              e.preventDefault();
              const curEditing = store.getState().editing;
              (e.target as HTMLTextAreaElement).blur();
              if (curEditing) {
                const newRow = curEditing.row - 1;
                const newCol = curEditing.col;
                if (newRow >= 0 && newRow < SHEET_ROW_COUNT) {
                  store.getState().setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
                }
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              store.getState().cancelEdit();
            } else if (e.key === 'Tab') {
              e.preventDefault();
              const curEditing = store.getState().editing;
              (e.target as HTMLTextAreaElement).blur();
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

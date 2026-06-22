/**
 * @file components/HeaderContextMenu.tsx
 * @description 行/列表头右键菜单组件。
 *              支持插入、删除、自动调整尺寸等行列级操作。
 */

import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { autoFitCols, autoFitRows } from '../utils/autoFit';

interface HeaderContextMenuProps {
  type: 'row' | 'col';
  index: number;
  x: number;
  y: number;
  onClose: () => void;
}

export default function HeaderContextMenu({ type, index, x, y, onClose }: HeaderContextMenuProps) {
  const store = useSpreadsheetStore;
  const isRow = type === 'row';

  const handleInsert = () => {
    if (isRow) store.getState().insertRow(index);
    else store.getState().insertCol(index);
    onClose();
  };

  const handleInsertAfter = () => {
    if (isRow) store.getState().insertRow(index + 1);
    else store.getState().insertCol(index + 1);
    onClose();
  };

  const handleDelete = () => {
    if (isRow) store.getState().deleteRow(index);
    else store.getState().deleteCol(index);
    onClose();
  };

  const handleAutoFit = () => {
    const state = store.getState();
    if (isRow) {
      autoFitRows(state.getActiveSheet(), state, [index]);
    } else {
      autoFitCols(state.getActiveSheet(), state, [index]);
    }
    onClose();
  };

  const handleHide = () => {
    const state = store.getState();
    if (isRow) state.hideRows([index]);
    else state.hideCols([index]);
    onClose();
  };

  const handleUnhideAdjacent = () => {
    const state = store.getState();
    const sheet = state.getActiveSheet();
    if (isRow) {
      const hidden = new Set(sheet.hiddenRows);
      const toUnhide: number[] = [];
      if (hidden.has(index - 1)) toUnhide.push(index - 1);
      if (hidden.has(index + 1)) toUnhide.push(index + 1);
      state.unhideRows(toUnhide);
    } else {
      const hidden = new Set(sheet.hiddenCols);
      const toUnhide: number[] = [];
      if (hidden.has(index - 1)) toUnhide.push(index - 1);
      if (hidden.has(index + 1)) toUnhide.push(index + 1);
      state.unhideCols(toUnhide);
    }
    onClose();
  };

  const handleUnhideAll = () => {
    store.getState().unhideAll();
    onClose();
  };

  const hasAdjacentHidden = () => {
    const state = store.getState();
    const sheet = state.getActiveSheet();
    if (isRow) {
      const hidden = new Set(sheet.hiddenRows);
      return hidden.has(index - 1) || hidden.has(index + 1);
    }
    const hidden = new Set(sheet.hiddenCols);
    return hidden.has(index - 1) || hidden.has(index + 1);
  };

  return (
    <div
      className="fixed z-50 min-w-[140px] rounded-lg border py-1 shadow-xl"
      style={{ left: x, top: y, borderColor: 'var(--ss-border)', background: 'var(--ss-panel-bg)' }}
    >
      <button
        onClick={handleInsert}
        className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
        style={{ color: 'var(--ss-text-primary)' }}
      >
        在{type === 'row' ? '上' : '左'}方插入
      </button>
      <button
        onClick={handleInsertAfter}
        className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
        style={{ color: 'var(--ss-text-primary)' }}
      >
        在{type === 'row' ? '下' : '右'}方插入
      </button>
      <div className="my-1 h-px" style={{ background: 'var(--ss-border-light)' }} />
      <button
        onClick={handleDelete}
        className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
        style={{ color: 'var(--ss-text-primary)' }}
      >
        删除{type === 'row' ? '行' : '列'}
      </button>
      <button
        onClick={handleAutoFit}
        className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
        style={{ color: 'var(--ss-text-primary)' }}
      >
        自动调整{type === 'row' ? '行高' : '列宽'}
      </button>
      <div className="my-1 h-px" style={{ background: 'var(--ss-border-light)' }} />
      <button
        onClick={handleHide}
        className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
        style={{ color: 'var(--ss-text-primary)' }}
      >
        隐藏{type === 'row' ? '行' : '列'}
      </button>
      {hasAdjacentHidden() && (
        <button
          onClick={handleUnhideAdjacent}
          className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
          style={{ color: 'var(--ss-text-primary)' }}
        >
          取消隐藏相邻{type === 'row' ? '行' : '列'}
        </button>
      )}
      <button
        onClick={handleUnhideAll}
        className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
        style={{ color: 'var(--ss-text-primary)' }}
      >
        取消所有隐藏
      </button>
    </div>
  );
}

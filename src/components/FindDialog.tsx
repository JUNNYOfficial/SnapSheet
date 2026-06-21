/**
 * @file components/FindDialog.tsx
 * @description 查找/替换对话框组件。
 *              支持在当前工作表中查找文本、跳转到上一个/下一个匹配项，并替换单元格内容。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell, cellToCoords } from '../utils/cellRef';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface FindDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function FindDialog({ open, onClose }: FindDialogProps) {
  const store = useSpreadsheetStore;
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [message, setMessage] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setMessage('');
      setCurrentMatch(0);
      setTotalMatches(0);
    }
  }, [open]);

  const getMatches = useCallback((): { row: number; col: number; value: string }[] => {
    const sheet = store.getState().getActiveSheet();
    const q = query.trim();
    if (!q) return [];

    const matches: { row: number; col: number; value: string }[] = [];
    for (const [ref, cell] of sheet.cells.entries()) {
      const value = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
      if (String(value).toLowerCase().includes(q.toLowerCase())) {
        const coords = cellToCoords(ref);
        if (coords) matches.push({ row: coords.row, col: coords.col, value: String(value) });
      }
    }
    matches.sort((a, b) => (a.row - b.row) || (a.col - b.col));
    return matches;
  }, [query, store]);

  useEffect(() => {
    if (open) {
      const matches = getMatches();
      setTotalMatches(matches.length);
    }
  }, [query, open, getMatches]);

  if (!open) return null;

  const findNext = (direction: 1 | -1) => {
    const matches = getMatches();
    if (matches.length === 0) {
      setMessage('未找到匹配内容');
      setCurrentMatch(0);
      return;
    }

    const sel = store.getState().selection;
    let startIdx = 0;
    if (direction === 1) {
      startIdx = matches.findIndex((m) => m.row > sel.startRow || (m.row === sel.startRow && m.col > sel.startCol));
      if (startIdx === -1) startIdx = 0;
    } else {
      const reversed = [...matches].reverse();
      const idx = reversed.findIndex((m) => m.row < sel.startRow || (m.row === sel.startRow && m.col < sel.startCol));
      startIdx = idx === -1 ? matches.length - 1 : matches.length - 1 - idx;
    }

    const match = matches[startIdx];
    store.getState().setSelection({ startRow: match.row, startCol: match.col, endRow: match.row, endCol: match.col });
    setCurrentMatch(startIdx + 1);
    setTotalMatches(matches.length);
    setMessage(`第 ${startIdx + 1} / ${matches.length} 个匹配`);
  };

  const handleReplace = () => {
    const sel = store.getState().selection;
    const ref = coordsToCell(sel.startRow, sel.startCol);
    const sheet = store.getState().getActiveSheet();
    const cell = sheet.cells.get(ref);
    if (!cell) return;
    const value = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
    const q = query.trim();
    if (!q || !String(value).toLowerCase().includes(q.toLowerCase())) return;

    const newValue = String(value).replace(new RegExp(escapeRegExp(q), 'gi'), replaceText);
    store.getState().setCellValue(sel.startRow, sel.startCol, newValue);
    setMessage('已替换当前单元格');
  };

  const handleReplaceAll = () => {
    const matches = getMatches();
    if (matches.length === 0) {
      setMessage('未找到匹配内容');
      return;
    }
    const q = query.trim();
    const sheet = store.getState().getActiveSheet();
    for (const match of matches) {
      const ref = coordsToCell(match.row, match.col);
      const cell = sheet.cells.get(ref);
      if (!cell) continue;
      const value = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
      const newValue = String(value).replace(new RegExp(escapeRegExp(q), 'gi'), replaceText);
      store.getState().setCellValue(match.row, match.col, newValue);
    }
    setMessage(`已替换 ${matches.length} 个单元格`);
  };

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return (
    <div
      className="absolute right-4 top-20 z-50 w-80 rounded-xl border p-4 shadow-2xl transition-all duration-200"
      style={{
        borderColor: 'var(--ss-border)',
        background: 'var(--ss-panel-bg)',
      }}
    >
      {/* 标题栏 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} style={{ color: 'var(--ss-text-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--ss-text-primary)' }}>查找和替换</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--ss-hover-bg)]"
          style={{ color: 'var(--ss-header-text)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* 查找输入 */}
      <div className="mb-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ss-header-text)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') findNext(1);
              else if (e.key === 'Escape') onClose();
            }}
            placeholder="查找内容"
            className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm outline-none transition-colors focus:border-[var(--ss-text-primary)]"
            style={{ borderColor: 'var(--ss-border-strong)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-primary)' }}
          />
        </div>
      </div>

      {/* 替换输入 */}
      <div className="mb-3">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: 'var(--ss-header-text)' }}>替</span>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleReplace(); }}
            placeholder="替换为"
            className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm outline-none transition-colors focus:border-[var(--ss-text-primary)]"
            style={{ borderColor: 'var(--ss-border-strong)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-primary)' }}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button
          onClick={() => findNext(-1)}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
          style={{ borderColor: 'var(--ss-border-strong)', color: 'var(--ss-text-secondary)' }}
        >
          <ChevronLeft size={12} /> 上一个
        </button>
        <button
          onClick={() => findNext(1)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-opacity hover:opacity-90"
          style={{ background: 'var(--ss-text-primary)', color: 'var(--ss-bg)' }}
        >
          下一个 <ChevronRight size={12} />
        </button>
        <button
          onClick={handleReplace}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
          style={{ borderColor: 'var(--ss-border-strong)', color: 'var(--ss-text-secondary)' }}
        >
          替换
        </button>
        <button
          onClick={handleReplaceAll}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
          style={{ borderColor: 'var(--ss-border-strong)', color: 'var(--ss-text-secondary)' }}
        >
          全部替换
        </button>
      </div>

      {/* 状态信息 */}
      <div className="flex items-center justify-between">
        {message && (
          <div className="text-xs" style={{ color: 'var(--ss-header-text)' }}>
            {message}
          </div>
        )}
        {totalMatches > 0 && (
          <div className="ml-auto text-xs tabular-nums" style={{ color: 'var(--ss-header-text)' }}>
            {currentMatch} / {totalMatches}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell, cellToCoords } from '../utils/cellRef';

interface FindDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function FindDialog({ open, onClose }: FindDialogProps) {
  const store = useSpreadsheetStore;
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setMessage('');
    }
  }, [open]);

  if (!open) return null;

  const getMatches = (): { row: number; col: number; value: string }[] => {
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
  };

  const findNext = (direction: 1 | -1) => {
    const matches = getMatches();
    if (matches.length === 0) {
      setMessage('未找到匹配内容');
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
    <div className="absolute right-4 top-16 z-50 w-80 rounded border p-3 shadow-lg" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif', borderColor: 'var(--ss-panel-border)', background: 'var(--ss-panel-bg)' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--ss-cell-text)' }}>查找和替换</span>
        <button onClick={onClose} style={{ color: 'var(--ss-header-text)' }} className="hover:opacity-80">×</button>
      </div>
      <div className="mb-2">
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
          className="w-full rounded border px-2 py-1 text-sm outline-none"
          style={{ borderColor: 'var(--ss-input-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-input-text)' }}
        />
      </div>
      <div className="mb-3">
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleReplace(); }}
          placeholder="替换为"
          className="w-full rounded border px-2 py-1 text-sm outline-none"
          style={{ borderColor: 'var(--ss-input-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-input-text)' }}
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button onClick={() => findNext(1)} className="rounded px-3 py-1 text-xs hover:opacity-90" style={{ background: 'var(--ss-cell-text)', color: 'var(--ss-bg)' }}>查找下一个</button>
        <button onClick={() => findNext(-1)} className="rounded border px-3 py-1 text-xs hover:opacity-80" style={{ borderColor: 'var(--ss-input-border)', color: 'var(--ss-toolbar-text)' }}>查找上一个</button>
        <button onClick={handleReplace} className="rounded border px-3 py-1 text-xs hover:opacity-80" style={{ borderColor: 'var(--ss-input-border)', color: 'var(--ss-toolbar-text)' }}>替换</button>
        <button onClick={handleReplaceAll} className="rounded border px-3 py-1 text-xs hover:opacity-80" style={{ borderColor: 'var(--ss-input-border)', color: 'var(--ss-toolbar-text)' }}>全部替换</button>
      </div>
      {message && <div className="text-xs" style={{ color: 'var(--ss-header-text)' }}>{message}</div>}
    </div>
  );
}

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
    <div className="absolute right-4 top-16 z-50 w-80 rounded border border-neutral-300 bg-white p-3 shadow-lg" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-800">查找和替换</span>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-800">×</button>
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
          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-600"
        />
      </div>
      <div className="mb-3">
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleReplace(); }}
          placeholder="替换为"
          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-600"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button onClick={() => findNext(1)} className="rounded bg-neutral-800 px-3 py-1 text-xs text-white hover:bg-neutral-700">查找下一个</button>
        <button onClick={() => findNext(-1)} className="rounded border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">查找上一个</button>
        <button onClick={handleReplace} className="rounded border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">替换</button>
        <button onClick={handleReplaceAll} className="rounded border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">全部替换</button>
      </div>
      {message && <div className="text-xs text-neutral-500">{message}</div>}
    </div>
  );
}

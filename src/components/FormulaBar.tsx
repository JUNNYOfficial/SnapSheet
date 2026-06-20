import { useEffect, useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { colToLetter, coordsToCell } from '../utils/cellRef';
import { FONT_FAMILY_MONO } from '../utils/constants';
import { FunctionSquare } from 'lucide-react';

const FUNCTIONS = [
  'SUM', 'AVG', 'MAX', 'MIN', 'COUNT',
  'IF', 'AND', 'OR', 'NOT',
  'ABS', 'SQRT', 'POWER', 'ROUND', 'CEIL', 'FLOOR',
  'CONCAT', 'LEN', 'UPPER', 'LOWER', 'TRIM',
];

export default function FormulaBar() {
  const store = useSpreadsheetStore;
  const selection = store((s) => s.selection);
  const editing = store((s) => s.editing);
  const formulaBarValue = store((s) => s.formulaBarValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cellRef = coordsToCell(selection.startRow, selection.startCol);

  useEffect(() => {
    if (!editing) {
      const sheet = store.getState().getActiveSheet();
      const cell = sheet.cells.get(cellRef);
      const val = cell?.formula || cell?.value || '';
      if (val !== formulaBarValue) store.getState().setFormulaBarValue(val);
    }
  }, [cellRef, editing, formulaBarValue, store]);

  useEffect(() => {
    if (!formulaBarValue.startsWith('=') || !inputRef.current) {
      setSuggestions([]);
      return;
    }
    const cursor = inputRef.current.selectionStart ?? formulaBarValue.length;
    const beforeCursor = formulaBarValue.slice(0, cursor);
    const match = beforeCursor.match(/[=(+,\-*/]([A-Za-z][A-Za-z0-9]*)$/);
    if (!match) { setSuggestions([]); return; }
    const prefix = match[1].toUpperCase();
    const filtered = FUNCTIONS.filter((f) => f.startsWith(prefix) && f !== prefix);
    setSuggestions(filtered.slice(0, 8));
    setSelectedIndex(0);
  }, [formulaBarValue]);

  const applySuggestion = (fn: string) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart ?? formulaBarValue.length;
    const beforeCursor = formulaBarValue.slice(0, cursor);
    const afterCursor = formulaBarValue.slice(cursor);
    const match = beforeCursor.match(/([=(+,\-*/])([A-Za-z][A-Za-z0-9]*)$/);
    if (!match) return;
    const newValue = beforeCursor.slice(0, beforeCursor.length - match[2].length) + fn + '()' + afterCursor;
    store.getState().setFormulaBarValue(newValue);
    setSuggestions([]);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = newValue.length - afterCursor.length - 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleBlur = () => {
    setSuggestions([]);
    if (formulaBarValue !== '' || editing) {
      if (editing) store.getState().commitEdit(formulaBarValue);
      else store.getState().setCellValue(selection.startRow, selection.startCol, formulaBarValue);
    }
  };

  return (
    <div className="flex items-center border-b" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-toolbar-bg)' }}>
      {/* 单元格地址 */}
      <div
        className="flex w-20 shrink-0 items-center justify-center border-r px-2 py-2"
        style={{ borderColor: 'var(--ss-border)' }}
      >
        <span
          className="text-xs font-medium tabular-nums"
          style={{ fontFamily: FONT_FAMILY_MONO, color: 'var(--ss-text-primary)' }}
        >
          {colToLetter(selection.startCol)}{selection.startRow + 1}
        </span>
      </div>

      {/* fx 标识 */}
      <div className="flex shrink-0 items-center border-r px-2 py-2" style={{ borderColor: 'var(--ss-border)' }}>
        <FunctionSquare size={14} style={{ color: 'var(--ss-text-tertiary)' }} />
      </div>

      {/* 输入框 */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={formulaBarValue}
          onChange={(e) => store.getState().setFormulaBarValue(e.target.value)}
          onFocus={(e) => { if (!editing) e.target.select(); }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (suggestions.length > 0) {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => (i + 1) % suggestions.length); return; }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
              if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySuggestion(suggestions[selectedIndex]); return; }
              if (e.key === 'Escape') { setSuggestions([]); return; }
            }
            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            else if (e.key === 'Escape') {
              e.preventDefault();
              store.getState().setEditing(0, null);
              store.getState().setFormulaBarValue('');
            }
          }}
          className="w-full bg-transparent px-3 py-2 text-sm outline-none"
          style={{ fontFamily: FONT_FAMILY_MONO, color: 'var(--ss-text-primary)' }}
          placeholder="输入值或公式，例如 =SUM(A1:A5)"
        />

        {suggestions.length > 0 && (
          <div
            className="absolute left-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border shadow-lg"
            style={{ minWidth: '180px', borderColor: 'var(--ss-border)', background: 'var(--ss-panel-bg)' }}
          >
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--ss-text-tertiary)', borderBottom: '1px solid var(--ss-border-light)' }}>
              函数建议
            </div>
            {suggestions.map((fn, idx) => (
              <div
                key={fn}
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(fn); }}
                className="cursor-pointer px-3 py-1.5 text-sm transition-colors"
                style={{
                  fontFamily: FONT_FAMILY_MONO,
                  color: idx === selectedIndex ? 'var(--ss-text-primary)' : 'var(--ss-text-secondary)',
                  background: idx === selectedIndex ? 'var(--ss-hover-bg)' : 'transparent',
                }}
              >
                <span className="font-medium" style={{ color: 'var(--ss-text-primary)' }}>{fn}</span>
                <span style={{ color: 'var(--ss-text-tertiary)' }}>()</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑状态指示 */}
      {editing && (
        <div className="flex shrink-0 items-center gap-1.5 px-3">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--ss-info)' }} />
          <span className="text-[10px]" style={{ color: 'var(--ss-text-secondary)' }}>编辑中</span>
        </div>
      )}
    </div>
  );
}

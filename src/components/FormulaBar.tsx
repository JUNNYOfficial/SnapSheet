import { useEffect, useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { colToLetter, coordsToCell } from '../utils/cellRef';

const FUNCTIONS = [
  'SUM', 'AVERAGE', 'AVG', 'MAX', 'MIN', 'COUNT',
  'IF', 'CONCAT', 'CONCATENATE', 'ROUND', 'IFERROR',
  'COUNTIF', 'SUMIF', 'AVERAGEIF',
  'VLOOKUP', 'HLOOKUP', 'MATCH', 'INDEX',
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
      if (val !== formulaBarValue) {
        store.getState().setFormulaBarValue(val);
      }
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
    if (!match) {
      setSuggestions([]);
      return;
    }
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
      if (editing) {
        store.getState().commitEdit(formulaBarValue);
      } else {
        store.getState().setCellValue(selection.startRow, selection.startCol, formulaBarValue);
      }
    }
  };

  return (
    <div className="relative flex items-center border-b border-neutral-200 bg-white">
      <div className="flex w-24 items-center justify-center border-r border-neutral-200 px-2 py-2.5" title="当前单元格地址">
        <span className="text-sm text-neutral-700" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, monospace' }}>{colToLetter(selection.startCol)}{selection.startRow + 1}</span>
      </div>
      <div className="flex items-center border-r border-neutral-200 px-3 py-2 text-sm text-neutral-400" title="函数">
        <span style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, serif', fontStyle: 'italic' }}>fx</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={formulaBarValue}
        onChange={(e) => store.getState().setFormulaBarValue(e.target.value)}
        onFocus={(e) => {
          if (!editing) {
            e.target.select();
          }
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex((i) => (i + 1) % suggestions.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              applySuggestion(suggestions[selectedIndex]);
              return;
            }
            if (e.key === 'Escape') {
              setSuggestions([]);
              return;
            }
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            store.getState().setEditing(0, null);
            store.getState().setFormulaBarValue('');
          }
        }}
        className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none focus:bg-neutral-100"
        style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, monospace' }}
        placeholder="输入值或公式，例如 =SUM(A1:A5)"
      />
      {suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 max-h-48 overflow-auto border border-neutral-200 bg-white shadow-md" style={{ minWidth: '160px' }}>
          {suggestions.map((fn, idx) => (
            <div
              key={fn}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(fn);
              }}
              className={`cursor-pointer px-3 py-1.5 text-sm ${idx === selectedIndex ? 'bg-neutral-200' : 'hover:bg-neutral-100'}`}
              style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, monospace' }}
            >
              {fn}()
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

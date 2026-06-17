import { useEffect, useRef } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { colToLetter, coordsToCell } from '../utils/cellRef';

export default function FormulaBar() {
  const store = useSpreadsheetStore;
  const selection = store((s) => s.selection);
  const editing = store((s) => s.editing);
  const formulaBarValue = store((s) => s.formulaBarValue);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleBlur = () => {
    if (formulaBarValue !== '' || editing) {
      if (editing) {
        store.getState().commitEdit(formulaBarValue);
      } else {
        store.getState().setCellValue(selection.startRow, selection.startCol, formulaBarValue);
      }
    }
  };

  return (
    <div className="flex items-center border-b border-gray-200 bg-white">
      <div className="flex w-20 items-center justify-center border-r border-gray-200 px-2 py-2" title="当前单元格地址">
        <span className="font-mono text-sm font-semibold text-gray-700">{colToLetter(selection.startCol)}{selection.startRow + 1}</span>
      </div>
      <div className="flex items-center border-r border-gray-200 px-3 py-2 text-sm italic text-gray-500" title="函数">
        <span className="font-serif font-bold">fx</span>
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
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            store.getState().setEditing(0, null);
            store.getState().setFormulaBarValue('');
          }
        }}
        className="flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none focus:bg-blue-50"
        placeholder="输入值或公式，例如 =SUM(A1:A5)"
      />
    </div>
  );
}

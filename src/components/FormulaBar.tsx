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
    <div className="flex items-center border-b border-neutral-200 bg-white">
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
    </div>
  );
}

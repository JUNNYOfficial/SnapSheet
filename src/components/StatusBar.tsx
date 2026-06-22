/**
 * @file components/StatusBar.tsx
 * @description 底部状态栏组件。
 *              显示当前选中区域信息及数值统计（计数、求和、平均、最大、最小）。
 */

import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell } from '../utils/cellRef';

export default function StatusBar() {
  const selection = useSpreadsheetStore((s) => s.selection);
  const sheet = useSpreadsheetStore((s) => s.getActiveSheet());

  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);

  let count = 0;
  let numericCount = 0;
  let sum = 0;
  let max = -Infinity;
  let min = Infinity;

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = sheet.cells.get(coordsToCell(r, c));
      if (!cell) continue;
      count++;
      const display = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
      const parsed = parseFloat(display);
      if (!isNaN(parsed) && String(display).trim() !== '') {
        numericCount++;
        sum += parsed;
        max = Math.max(max, parsed);
        min = Math.min(min, parsed);
      }
    }
  }

  const rangeLabel =
    selection.startRow === selection.endRow && selection.startCol === selection.endCol
      ? coordsToCell(selection.startRow, selection.startCol)
      : `${coordsToCell(minRow, minCol)}:${coordsToCell(maxRow, maxCol)}`;

  const cells = (maxRow - minRow + 1) * (maxCol - minCol + 1);

  return (
    <div
      className="flex items-center gap-4 border-t px-3 py-1 text-xs"
      style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-panel-bg)', color: 'var(--ss-text-secondary)' }}
    >
      <span className="font-medium" style={{ color: 'var(--ss-text-primary)' }}>{rangeLabel}</span>
      <span>选中 {cells} 个单元格</span>
      {count > 0 && (
        <>
          <span>有数据 {count} 个</span>
          {numericCount > 0 && (
            <>
              <span>求和 {sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span>平均 {(sum / numericCount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span>最大 {max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span>最小 {min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </>
          )}
        </>
      )}
      <span className="ml-auto">就绪</span>
    </div>
  );
}

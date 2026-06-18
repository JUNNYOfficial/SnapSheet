import { useState } from 'react';
import { useSpreadsheetStore, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../store/useSpreadsheetStore';
import { colToLetter, coordsToCell } from '../utils/cellRef';
import { Plus, Trash2, FileSpreadsheet, BarChart3, Hash, ChevronDown, ChevronUp } from 'lucide-react';

export default function SheetTabs() {
  const store = useSpreadsheetStore;
  const workbook = store((s) => s.workbook);
  const selection = store((s) => s.selection);
  const [statsExpanded, setStatsExpanded] = useState(false);

  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);
  const isRange = minRow !== maxRow || minCol !== maxCol;

  const sheet = workbook.sheets.find((s) => s.id === workbook.activeSheetId);
  const numericValues: number[] = [];
  if (sheet) {
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = sheet.cells.get(coordsToCell(r, c));
        const v = cell?.computed !== undefined && cell?.formula ? cell.computed : cell?.value;
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        if (!isNaN(n)) numericValues.push(n);
      }
    }
  }
  const sum = numericValues.reduce((a, b) => a + b, 0);
  const avg = numericValues.length > 0 ? sum / numericValues.length : 0;
  const max = numericValues.length > 0 ? Math.max(...numericValues) : null;
  const min = numericValues.length > 0 ? Math.min(...numericValues) : null;

  return (
    <div className="flex flex-col border-t" style={{ borderColor: 'var(--ss-toolbar-border)', background: 'var(--ss-toolbar-bg)' }}>
      <div className="flex items-center justify-between px-3 py-1 text-xs" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, monospace', color: 'var(--ss-header-text)', borderBottom: '1px solid var(--ss-toolbar-border)' }}>
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="flex items-center gap-1 shrink-0">
            <BarChart3 size={12} />
            {isRange
              ? `选中: ${maxRow - minRow + 1}×${maxCol - minCol + 1}`
              : `单元格: ${colToLetter(selection.startCol)}${selection.startRow + 1}`}
          </span>
          {numericValues.length > 0 && (
            <>
              <span className="flex items-center gap-1 shrink-0"><Hash size={12} />求和: {sum.toLocaleString()}</span>
              <span className="shrink-0">平均: {avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              {statsExpanded && (
                <>
                  <span className="shrink-0">计数: {numericValues.length}</span>
                  <span className="shrink-0">最大: {max?.toLocaleString()}</span>
                  <span className="shrink-0">最小: {min?.toLocaleString()}</span>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {numericValues.length > 0 && (
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--ss-toolbar-hover)] transition-colors"
              title={statsExpanded ? '收起统计' : '展开统计'}
              style={{ color: 'var(--ss-header-text)' }}
            >
              {statsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span className="hidden sm:inline">更多</span>
            </button>
          )}
          <span className="text-[10px] opacity-70">共 {SHEET_ROW_COUNT}×{SHEET_COL_COUNT}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
        {workbook.sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => store.getState().setActiveSheet(sheet.id)}
            className="flex items-center gap-1.5 rounded-t px-3 py-1.5 text-xs transition-colors shrink-0"
            style={{
              fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif',
              color: sheet.id === workbook.activeSheetId ? 'var(--ss-cell-text)' : 'var(--ss-header-text)',
              background: sheet.id === workbook.activeSheetId ? 'var(--ss-bg)' : 'transparent',
              borderTop: sheet.id === workbook.activeSheetId ? '2px solid var(--ss-cell-text)' : '2px solid transparent',
            }}
            onMouseEnter={(e) => { if (sheet.id !== workbook.activeSheetId) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }}
            onMouseLeave={(e) => { if (sheet.id !== workbook.activeSheetId) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <FileSpreadsheet size={12} />
            {sheet.name}
          </button>
        ))}
        <button
          onClick={() => store.getState().addSheet()}
          className="flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:opacity-80 shrink-0"
          title="新建工作表"
          style={{ color: 'var(--ss-header-text)' }}
        >
          <Plus size={14} />
        </button>
        {workbook.sheets.length > 1 && (
          <button
            onClick={() => {
              if (confirm('确定要删除当前工作表吗?')) {
                store.getState().deleteSheet(workbook.activeSheetId);
              }
            }}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:opacity-80 shrink-0"
            title="删除当前工作表"
            style={{ color: 'var(--ss-header-text)' }}
          >
            <Trash2 size={14} />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs shrink-0" style={{ color: 'var(--ss-header-text)' }}>
          <span>{workbook.sheets.length} 个工作表</span>
        </div>
      </div>
    </div>
  );
}

/**
 * @file components/SheetTabs.tsx
 * @description 底部工作表标签与状态栏组件。
 *              展示当前选择区域统计信息、工作表切换、新建/删除工作表等操作。
 */

import { useState } from 'react';
import { useSpreadsheetStore, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../store/useSpreadsheetStore';
import { colToLetter, coordsToCell } from '../utils/cellRef';
import { FONT_FAMILY_MONO } from '../utils/constants';
import { Plus, Trash2, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';

export default function SheetTabs() {
  const store = useSpreadsheetStore;
  const workbook = store((s) => s.workbook);
  const selection = store((s) => s.selection);
  /** 统计信息是否展开 */
  const [statsExpanded, setStatsExpanded] = useState(false);

  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);
  const isRange = minRow !== maxRow || minCol !== maxCol;

  /** 当前激活工作表 */
  const sheet = workbook.sheets.find((s) => s.id === workbook.activeSheetId);
  /** 选择区域内的数值集合，用于状态栏统计 */
  const numericValues: number[] = [];
  if (sheet) {
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = sheet.cells.get(coordsToCell(r, c));
        const v = cell?.computed !== undefined && cell?.formula ? cell.computed : cell?.value;
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        if (!isNaN(n) && String(v).trim() !== '') numericValues.push(n);
      }
    }
  }
  const sum = numericValues.reduce((a, b) => a + b, 0);
  const avg = numericValues.length > 0 ? sum / numericValues.length : 0;
  const max = numericValues.length > 0 ? Math.max(...numericValues) : null;
  const min = numericValues.length > 0 ? Math.min(...numericValues) : null;

  return (
    <div className="flex flex-col border-t" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-toolbar-bg)' }}>
      {/* 状态栏 */}
      <div className="flex items-center justify-between px-3 py-1 text-xs" style={{ fontFamily: FONT_FAMILY_MONO, color: 'var(--ss-text-secondary)', borderBottom: '1px solid var(--ss-border-light)' }}>
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="shrink-0" style={{ color: 'var(--ss-text-primary)' }}>
            {isRange
              ? `${colToLetter(minCol)}${minRow + 1}:${colToLetter(maxCol)}${maxRow + 1}`
              : `${colToLetter(selection.startCol)}${selection.startRow + 1}`}
          </span>
          {numericValues.length > 0 && (
            <>
              <span className="shrink-0">Σ {sum.toLocaleString()}</span>
              <span className="shrink-0">μ {avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              {statsExpanded && (
                <>
                  <span className="shrink-0">n {numericValues.length}</span>
                  <span className="shrink-0">↑ {max?.toLocaleString()}</span>
                  <span className="shrink-0">↓ {min?.toLocaleString()}</span>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {numericValues.length > 0 && (
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors"
              title={statsExpanded ? '收起统计' : '展开统计'}
              style={{ color: 'var(--ss-text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {statsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <span className="text-[10px]" style={{ color: 'var(--ss-text-tertiary)' }}>{SHEET_ROW_COUNT} × {SHEET_COL_COUNT}</span>
        </div>
      </div>

      {/* 工作表标签 */}
      <div className="flex items-center gap-0.5 px-2 py-1 overflow-x-auto">
        {workbook.sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => store.getState().setActiveSheet(sheet.id)}
            className="flex items-center gap-1.5 rounded-t px-3 py-1.5 text-xs transition-colors shrink-0"
            style={{
              color: sheet.id === workbook.activeSheetId ? 'var(--ss-text-primary)' : 'var(--ss-text-secondary)',
              background: sheet.id === workbook.activeSheetId ? 'var(--ss-bg)' : 'transparent',
              borderTop: sheet.id === workbook.activeSheetId ? '2px solid var(--ss-selected-border)' : '2px solid transparent',
            }}
            onMouseEnter={(e) => { if (sheet.id !== workbook.activeSheetId) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }}
            onMouseLeave={(e) => { if (sheet.id !== workbook.activeSheetId) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <FileSpreadsheet size={12} />
            {sheet.name}
          </button>
        ))}
        <button
          onClick={() => store.getState().addSheet()}
          className="flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors"
          title="新建工作表"
          style={{ color: 'var(--ss-text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Plus size={14} />
        </button>
        {workbook.sheets.length > 1 && (
          <button
            onClick={() => {
              if (confirm('确定要删除当前工作表吗?')) store.getState().deleteSheet(workbook.activeSheetId);
            }}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors"
            title="删除当前工作表"
            style={{ color: 'var(--ss-text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-error-bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ss-error)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ss-text-secondary)'; }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

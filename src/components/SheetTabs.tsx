import { useSpreadsheetStore, SHEET_ROW_COUNT, SHEET_COL_COUNT } from '../store/useSpreadsheetStore';
import { colToLetter } from '../utils/cellRef';

export default function SheetTabs() {
  const store = useSpreadsheetStore;
  const workbook = store((s) => s.workbook);
  const selection = store((s) => s.selection);

  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);
  const isRange = minRow !== maxRow || minCol !== maxCol;

  return (
    <div className="flex items-center border-t border-neutral-200 bg-neutral-50 px-3 py-1.5" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
      <div className="flex items-center gap-1">
        {workbook.sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => store.getState().setActiveSheet(sheet.id)}
            className={
              'rounded-t px-4 py-1.5 text-sm transition-colors ' +
              (sheet.id === workbook.activeSheetId
                ? 'border-t-2 border-neutral-800 bg-white text-neutral-800'
                : 'text-neutral-600 hover:bg-neutral-100')
            }
          >
            {sheet.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => store.getState().addSheet()}
        className="ml-2 rounded px-2 py-1 text-lg text-neutral-500 hover:bg-neutral-200"
        title="新建工作表"
      >
        +
      </button>
      {workbook.sheets.length > 1 && (
        <button
          onClick={() => {
            if (confirm('确定要删除当前工作表吗?')) {
              store.getState().deleteSheet(workbook.activeSheetId);
            }
          }}
          className="ml-2 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-200"
          title="删除当前工作表"
        >
          删除
        </button>
      )}
      <div className="ml-auto flex items-center gap-4 text-xs text-neutral-500">
        <span>
          {isRange
            ? `选中: ${maxRow - minRow + 1} 行 × ${maxCol - minCol + 1} 列`
            : `单元格: ${colToLetter(selection.startCol)}${selection.startRow + 1}`}
        </span>
        <span>
          共 {SHEET_ROW_COUNT} 行 × {SHEET_COL_COUNT} 列
        </span>
        <span>
          {workbook.sheets.length} 个工作表
        </span>
      </div>
    </div>
  );
}

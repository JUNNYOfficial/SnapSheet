import { useSpreadsheetStore } from '../store/useSpreadsheetStore';

export default function SheetTabs() {
  const store = useSpreadsheetStore;
  const workbook = store((s) => s.workbook);

  return (
    <div className="flex items-center border-t border-gray-200 bg-gray-50 px-2 py-1">
      <div className="flex items-center gap-1">
        {workbook.sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => store.getState().setActiveSheet(sheet.id)}
            className={
              'rounded-t px-4 py-1.5 text-sm transition-colors ' +
              (sheet.id === workbook.activeSheetId
                ? 'border-t-2 border-blue-500 bg-white font-semibold text-gray-800'
                : 'text-gray-600 hover:bg-gray-100')
            }
          >
            {sheet.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => store.getState().addSheet()}
        className="ml-2 rounded-full px-2 py-1 text-lg text-gray-500 hover:bg-gray-200"
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
          className="ml-2 rounded px-2 py-1 text-xs text-gray-500 hover:bg-red-100 hover:text-red-700"
          title="删除当前工作表"
        >
          删除
        </button>
      )}
      <div className="ml-auto text-xs text-gray-500">
        共 {workbook.sheets.length} 个工作表
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { toCSV } from '../utils/csv';
import { workbookToJSON, workbookFromJSON, downloadFile } from '../utils/json';
import { colToLetter, coordsToCell } from '../utils/cellRef';

export default function Toolbar() {
  const store = useSpreadsheetStore;
  const selection = useSpreadsheetStore((s) => s.selection);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');

  const handleExportCSV = () => {
    const sheet = store.getState().getActiveSheet();
    const csv = toCSV(sheet.cells, sheet.colWidths);
    if (csv) downloadFile(csv, sheet.name + '.csv', 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    const json = workbookToJSON(store.getState().workbook);
    downloadFile(json, 'workbook.json', 'application/json;charset=utf-8');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const cleaned = text.replace(/^\ufeff/, '');
      const rows = cleaned.split(/\r?\n/).filter((r) => r.length > 0).map((r) => {
        const cells: string[] = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < r.length; i++) {
          const ch = r[i];
          if (inQuotes) {
            if (ch === '"' && r[i + 1] === '"') {
              field += '"';
              i++;
            } else if (ch === '"') {
              inQuotes = false;
            } else {
              field += ch;
            }
          } else if (ch === '"') {
            inQuotes = true;
          } else if (ch === ',') {
            cells.push(field);
            field = '';
          } else {
            field += ch;
          }
        }
        cells.push(field);
        return cells;
      });
      const sheet = store.getState().getActiveSheet();
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          const value = rows[r][c];
          if (value !== '') {
            store.getState().setCellValue(r, c, value);
          }
        }
      }
      void sheet;
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const wb = workbookFromJSON(text);
        store.getState().loadWorkbook(wb);
      } catch (err) {
        alert('Invalid JSON file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const handleBold = () => {
    const sel = store.getState().selection;
    const sheet = store.getState().getActiveSheet();
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);
    let firstBold = false;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const ref = coordsToCell(r, c);
        const cell = sheet.cells.get(ref);
        if (cell) {
          firstBold = cell.style?.bold || false;
          break;
        }
      }
      if (sheet.cells.size > 0) break;
    }
    store.getState().applyStyleToSelection({ bold: !firstBold });
  };

  const handleAlignLeft = () => store.getState().applyStyleToSelection({ align: 'left' });
  const handleAlignCenter = () => store.getState().applyStyleToSelection({ align: 'center' });
  const handleAlignRight = () => store.getState().applyStyleToSelection({ align: 'right' });

  const handleClear = () => store.getState().clearSelection();

  const handleAnalyze = () => {
    const sel = store.getState().selection;
    const sheet = store.getState().getActiveSheet();
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);

    const nums: number[] = [];
    const strs: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const ref = coordsToCell(r, c);
        const cell = sheet.cells.get(ref);
        if (cell) {
          const val = cell.computed !== undefined ? cell.computed : cell.value;
          const parsed = typeof val === 'number' ? val : parseFloat(val as string);
          if (!isNaN(parsed) && String(val).trim() !== '') nums.push(parsed);
          else if (typeof val === 'string' && val.trim() !== '') strs.push(val);
        }
      }
    }

    let result = '';
    if (nums.length > 0) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = sum / nums.length;
      const mx = Math.max(...nums);
      const mn = Math.min(...nums);
      result += '区域共 ' + (maxRow - minRow + 1) * (maxCol - minCol + 1) + ' 个单元格\n';
      result += '数值单元格: ' + nums.length + ' 个\n';
      result += 'SUM = ' + sum.toFixed(2) + '\n';
      result += 'AVG = ' + avg.toFixed(2) + '\n';
      result += 'MAX = ' + mx + '\n';
      result += 'MIN = ' + mn + '\n';
      if (strs.length > 0) result += '文本单元格: ' + strs.length + ' 个\n';
      result += '\n建议公式: =SUM(' + coordsToCell(minRow, minCol) + ':' + coordsToCell(maxRow, maxCol) + ')';
    } else if (strs.length > 0) {
      result += '区域有 ' + strs.length + ' 个文本单元格\n';
      result += '前 5 个值: ' + strs.slice(0, 5).join(', ');
    } else {
      result = '选中区域无数据';
    }
    setAiResult(result);
  };

  const handleFormulaGenerate = () => {
    if (!aiPrompt.trim()) return;
    const sel = store.getState().selection;
    const ref = coordsToCell(sel.startRow, sel.startCol);
    const endRef = coordsToCell(sel.endRow, sel.endCol);
    const range = ref === endRef ? ref : ref + ':' + endRef;

    let formula = '';
    const p = aiPrompt.toLowerCase();
    if (p.includes('求和') || p.includes('sum') || p.includes('加')) formula = '=SUM(' + range + ')';
    else if (p.includes('平均') || p.includes('avg') || p.includes('average')) formula = '=AVG(' + range + ')';
    else if (p.includes('最大') || p.includes('max')) formula = '=MAX(' + range + ')';
    else if (p.includes('最小') || p.includes('min')) formula = '=MIN(' + range + ')';
    else if (p.includes('计数') || p.includes('count')) formula = '=COUNT(' + range + ')';

    if (formula) {
      const row = sel.endRow + 1 <= sel.endRow ? sel.endRow : sel.endRow;
      const col = sel.startCol;
      store.getState().setCellValue(Math.min(row + 1, 999), col, formula);
      setAiResult('已生成公式: ' + formula + ' 写入 ' + coordsToCell(Math.min(row + 1, 999), col));
      setAiPrompt('');
    } else {
      setAiResult('未能识别请求。请尝试:"求和""平均值""最大值""最小值""计数"等关键词。');
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().newWorkbook()} className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200" title="新建">
          新建
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        <button onClick={() => fileInputRef.current?.click()} className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200" title="导入 CSV">
          导入 CSV
        </button>
        <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        <button onClick={() => jsonInputRef.current?.click()} className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200" title="导入 JSON">
          导入 JSON
        </button>
        <button onClick={handleExportCSV} className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200" title="导出 CSV">
          导出 CSV
        </button>
        <button onClick={handleExportJSON} className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200" title="导出 JSON">
          导出 JSON
        </button>
      </div>

      <div className="mx-2 h-5 w-px bg-gray-300" />

      <div className="flex items-center gap-1">
        <button onClick={handleBold} className="rounded px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100" title="加粗">
          B
        </button>
        <button onClick={handleAlignLeft} className="rounded px-2.5 py-1.5 text-sm hover:bg-gray-100" title="左对齐">
          ⬅
        </button>
        <button onClick={handleAlignCenter} className="rounded px-2.5 py-1.5 text-sm hover:bg-gray-100" title="居中">
          ↔
        </button>
        <button onClick={handleAlignRight} className="rounded px-2.5 py-1.5 text-sm hover:bg-gray-100" title="右对齐">
          ➡
        </button>
      </div>

      <div className="mx-2 h-5 w-px bg-gray-300" />

      <button onClick={handleClear} className="rounded bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100" title="清除选中区域">
        清除
      </button>

      <div className="mx-2 h-5 w-px bg-gray-300" />

      <div className="flex items-center gap-1">
        <button onClick={() => { handleAnalyze(); setAiOpen(true); }} className="rounded bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100" title="AI 分析">
          分析
        </button>
        <button onClick={() => setAiOpen(!aiOpen)} className="rounded bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100" title="AI 生成公式">
          AI 公式
        </button>
      </div>

      {aiOpen && (
        <div className="ml-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFormulaGenerate()}
            placeholder="输入指令: 如 求平均值、求和、最大值..."
            className="w-64 rounded border border-blue-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500"
          />
          <button onClick={handleFormulaGenerate} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
            生成
          </button>
          {aiResult && (
            <div className="max-h-32 w-72 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-gray-700">
              {aiResult}
            </div>
          )}
        </div>
      )}

      <div className="ml-auto text-xs text-gray-500">
        选中: <span className="font-mono">{colToLetter(selection.startCol)}{selection.startRow + 1}{selection.endRow !== selection.startRow || selection.endCol !== selection.startCol ? ':' + colToLetter(selection.endCol) + (selection.endRow + 1) : ''}</span>
      </div>
    </div>
  );
}

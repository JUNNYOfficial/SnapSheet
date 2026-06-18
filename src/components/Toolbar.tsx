import { useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { toCSV } from '../utils/csv';
import { workbookToJSON, workbookFromJSON, downloadFile } from '../utils/json';
import { colToLetter, coordsToCell } from '../utils/cellRef';

export default function Toolbar() {
  const store = useSpreadsheetStore;
  const selection = useSpreadsheetStore((s) => s.selection);
  const workbook = useSpreadsheetStore((s) => s.workbook);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const canUndo = store.getState().canUndo();
  const canRedo = store.getState().canRedo();

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

  const btnBase = 'rounded px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors';
  const dividerBase = 'mx-2 h-5 w-px bg-neutral-200';

  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().newWorkbook()} className={btnBase} title="新建">
          新建
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        <button onClick={() => fileInputRef.current?.click()} className={btnBase} title="导入 CSV">
          导入 CSV
        </button>
        <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        <button onClick={() => jsonInputRef.current?.click()} className={btnBase} title="导入 JSON">
          导入 JSON
        </button>
        <button onClick={handleExportCSV} className={btnBase} title="导出 CSV">
          导出 CSV
        </button>
        <button onClick={handleExportJSON} className={btnBase} title="导出 JSON">
          导出 JSON
        </button>
      </div>

      <div className={dividerBase} />

      <div className="flex items-center gap-1">
        <button onClick={handleBold} className="rounded px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100" title="加粗">
          <span style={{ fontWeight: 700 }}>B</span>
        </button>
        <button onClick={handleAlignLeft} className="rounded px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100" title="左对齐">
          左
        </button>
        <button onClick={handleAlignCenter} className="rounded px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100" title="居中">
          中
        </button>
        <button onClick={handleAlignRight} className="rounded px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100" title="右对齐">
          右
        </button>
      </div>

      <div className={dividerBase} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().applyNumberFormat({ type: 'percentage', decimalPlaces: 0 })} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="百分比">
          %
        </button>
        <button onClick={() => store.getState().applyNumberFormat({ type: 'number', decimalPlaces: 2 })} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="数字">
          0.00
        </button>
        <button onClick={() => {
          const state = store.getState();
          const sheet = state.getActiveSheet();
          const ref = coordsToCell(state.selection.startRow, state.selection.startCol);
          const cell = sheet.cells.get(ref);
          const dp = cell?.numberFormat?.decimalPlaces ?? 2;
          store.getState().applyNumberFormat({ type: 'number', decimalPlaces: dp + 1 });
        }} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="增加小数位">
          .0+
        </button>
        <button onClick={() => {
          const state = store.getState();
          const sheet = state.getActiveSheet();
          const ref = coordsToCell(state.selection.startRow, state.selection.startCol);
          const cell = sheet.cells.get(ref);
          const dp = cell?.numberFormat?.decimalPlaces ?? 2;
          store.getState().applyNumberFormat({ type: 'number', decimalPlaces: Math.max(0, dp - 1) });
        }} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="减少小数位">
          .0-
        </button>
        <button onClick={() => store.getState().applyNumberFormat(null)} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="常规">
          常规
        </button>
      </div>

      <div className={dividerBase} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().applyBorderSelection('all')} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="全部边框">
          框
        </button>
        <button onClick={() => store.getState().applyBorderSelection('top')} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="上边框">
          上
        </button>
        <button onClick={() => store.getState().applyBorderSelection('bottom')} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="下边框">
          下
        </button>
        <button onClick={() => store.getState().applyBorderSelection('left')} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="左边框">
          左
        </button>
        <button onClick={() => store.getState().applyBorderSelection('right')} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="右边框">
          右
        </button>
        <button onClick={() => store.getState().applyBorderSelection('none')} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="清除边框">
          无框
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ wrap: true })} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="自动换行">
          换行
        </button>
      </div>

      <div className={dividerBase} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().mergeCells()} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="合并单元格">
          合并
        </button>
        <button onClick={() => store.getState().unmergeCells()} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="取消合并">
          取消合并
        </button>
      </div>

      <div className={dividerBase} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: '#f5f5f5' })} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="浅灰背景">
          灰
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: '#e5e5e5' })} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="中灰背景">
          深灰
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: '#262626', color: '#ffffff' })} className="rounded px-2 py-1.5 text-xs text-white bg-neutral-800 hover:bg-neutral-700" title="黑底白字">
          黑
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: undefined })} className="rounded px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100" title="清除背景色">
          无
        </button>
      </div>

      <div className={dividerBase} />

      <button onClick={handleClear} className={btnBase} title="清除选中区域">
        清除
      </button>
      <button onClick={() => store.getState().clearFormatSelection()} className={btnBase} title="清除选中区域格式">
        清格式
      </button>

      <div className={dividerBase} />

      <button onClick={() => store.getState().insertRow(selection.startRow)} className={btnBase} title="在选中行前插入一行">
        插行
      </button>
      <button onClick={() => store.getState().deleteRow(selection.startRow)} className={btnBase} title="删除选中行">
        删行
      </button>
      <button onClick={() => store.getState().insertCol(selection.startCol)} className={btnBase} title="在选中列前插入一列">
        插列
      </button>
      <button onClick={() => store.getState().deleteCol(selection.startCol)} className={btnBase} title="删除选中列">
        删列
      </button>

      <div className={dividerBase} />

      <button
        onClick={() => store.getState().undo()}
        disabled={!canUndo}
        className={btnBase + (canUndo ? '' : ' opacity-40 cursor-not-allowed')}
        title="撤销 (Ctrl+Z)"
      >
        撤销
      </button>
      <button
        onClick={() => store.getState().redo()}
        disabled={!canRedo}
        className={btnBase + (canRedo ? '' : ' opacity-40 cursor-not-allowed')}
        title="重做 (Ctrl+Y)"
      >
        重做
      </button>

      <div className={dividerBase} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().sortByColumn(selection.startCol, 'asc')} className={btnBase} title="按选中列升序排序">
          升序
        </button>
        <button onClick={() => store.getState().sortByColumn(selection.startCol, 'desc')} className={btnBase} title="按选中列降序排序">
          降序
        </button>
      </div>

      <div className={dividerBase} />

      <div className="flex items-center gap-1">
        <button onClick={() => { handleAnalyze(); setAiOpen(true); }} className={btnBase} title="AI 分析">
          分析
        </button>
        <button onClick={() => setAiOpen(!aiOpen)} className={btnBase} title="AI 生成公式">
          AI 公式
        </button>
      </div>

      {aiOpen && (
        <div className="ml-4 flex items-center gap-2 rounded border border-neutral-300 bg-neutral-50 p-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFormulaGenerate()}
            placeholder="输入指令: 如 求平均值、求和、最大值..."
            className="w-64 rounded border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-600"
            style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
          />
          <button onClick={handleFormulaGenerate} className="rounded bg-neutral-800 px-3 py-1 text-sm text-white hover:bg-neutral-700" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
            生成
          </button>
          {aiResult && (
            <div className="max-h-32 w-72 overflow-auto whitespace-pre-wrap rounded border border-neutral-200 bg-white p-2 text-xs text-neutral-700" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
              {aiResult}
            </div>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, monospace' }}>
        <span>
          选中: {colToLetter(selection.startCol)}{selection.startRow + 1}{selection.endRow !== selection.startRow || selection.endCol !== selection.startCol ? ':' + colToLetter(selection.endCol) + (selection.endRow + 1) : ''}
        </span>
        <span>
          {workbook.sheets.find((s) => s.id === workbook.activeSheetId)?.name}
        </span>
      </div>
    </div>
  );
}

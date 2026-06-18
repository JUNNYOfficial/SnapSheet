import { useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { toCSV } from '../utils/csv';
import { workbookToJSON, workbookFromJSON, downloadFile } from '../utils/json';
import { colToLetter, coordsToCell } from '../utils/cellRef';
import { TEMPLATES } from '../templates';
import { FONT_OPTIONS } from '../utils/constants';

interface ToolbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export default function Toolbar({ isDark = false, onToggleTheme }: ToolbarProps) {
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

  const btnBase = 'rounded px-3 py-1.5 text-sm transition-colors';
  const dividerBase = 'mx-2 h-5 w-px';
  const dividerStyle = { background: 'var(--ss-toolbar-border)' };
  const toolbarBtnStyle = { fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif', color: 'var(--ss-toolbar-text)' };

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif', borderColor: 'var(--ss-toolbar-border)', background: 'var(--ss-toolbar-bg)' }}>
      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().newWorkbook()} className={btnBase + ' hover:opacity-80'} title="新建" style={toolbarBtnStyle}>
          新建
        </button>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              if (confirm('应用模板会清空当前工作表内容，是否继续？')) {
                store.getState().applyTemplate(e.target.value);
              }
              e.target.value = '';
            }
          }}
          className="rounded border px-2 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--ss-input-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-toolbar-text)', fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
        >
          <option value="">模板</option>
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
        <button onClick={() => fileInputRef.current?.click()} className={btnBase + ' hover:opacity-80'} title="导入 CSV" style={toolbarBtnStyle}>
          导入 CSV
        </button>
        <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        <button onClick={() => jsonInputRef.current?.click()} className={btnBase + ' hover:opacity-80'} title="导入 JSON" style={toolbarBtnStyle}>
          导入 JSON
        </button>
        <button onClick={handleExportCSV} className={btnBase + ' hover:opacity-80'} title="导出 CSV" style={toolbarBtnStyle}>
          导出 CSV
        </button>
        <button onClick={handleExportJSON} className={btnBase + ' hover:opacity-80'} title="导出 JSON" style={toolbarBtnStyle}>
          导出 JSON
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button onClick={handleBold} className="rounded px-2.5 py-1.5 text-sm hover:opacity-80" style={toolbarBtnStyle} title="加粗">
          <span style={{ fontWeight: 700 }}>B</span>
        </button>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              store.getState().applyStyleToSelection({ fontFamily: e.target.value });
              e.target.value = '';
            }
          }}
          className="rounded border px-1 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--ss-input-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-toolbar-text)', fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
          title="字体"
        >
          <option value="">字体</option>
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
        <button onClick={handleAlignLeft} className="rounded px-2.5 py-1.5 text-sm hover:opacity-80" style={toolbarBtnStyle} title="左对齐">
          左
        </button>
        <button onClick={handleAlignCenter} className="rounded px-2.5 py-1.5 text-sm hover:opacity-80" style={toolbarBtnStyle} title="居中">
          中
        </button>
        <button onClick={handleAlignRight} className="rounded px-2.5 py-1.5 text-sm hover:opacity-80" style={toolbarBtnStyle} title="右对齐">
          右
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().applyNumberFormat({ type: 'percentage', decimalPlaces: 0 })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="百分比">
          %
        </button>
        <button onClick={() => store.getState().applyNumberFormat({ type: 'number', decimalPlaces: 2 })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="数字">
          0.00
        </button>
        <button onClick={() => {
          const state = store.getState();
          const sheet = state.getActiveSheet();
          const ref = coordsToCell(state.selection.startRow, state.selection.startCol);
          const cell = sheet.cells.get(ref);
          const dp = cell?.numberFormat?.decimalPlaces ?? 2;
          store.getState().applyNumberFormat({ type: 'number', decimalPlaces: dp + 1 });
        }} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="增加小数位">
          .0+
        </button>
        <button onClick={() => {
          const state = store.getState();
          const sheet = state.getActiveSheet();
          const ref = coordsToCell(state.selection.startRow, state.selection.startCol);
          const cell = sheet.cells.get(ref);
          const dp = cell?.numberFormat?.decimalPlaces ?? 2;
          store.getState().applyNumberFormat({ type: 'number', decimalPlaces: Math.max(0, dp - 1) });
        }} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="减少小数位">
          .0-
        </button>
        <button onClick={() => store.getState().applyNumberFormat(null)} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="常规">
          常规
        </button>
        <button onClick={() => store.getState().applyNumberFormat({ type: 'currency', decimalPlaces: 2, currencySymbol: '¥' })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="货币">
          ¥
        </button>
        <button onClick={() => store.getState().applyNumberFormat({ type: 'date' })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="日期">
          日期
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().applyBorderSelection('all')} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="全部边框">
          框
        </button>
        <button onClick={() => store.getState().applyBorderSelection('top')} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="上边框">
          上
        </button>
        <button onClick={() => store.getState().applyBorderSelection('bottom')} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="下边框">
          下
        </button>
        <button onClick={() => store.getState().applyBorderSelection('left')} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="左边框">
          左
        </button>
        <button onClick={() => store.getState().applyBorderSelection('right')} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="右边框">
          右
        </button>
        <button onClick={() => store.getState().applyBorderSelection('none')} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="清除边框">
          无框
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ wrap: true })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="自动换行">
          换行
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().mergeCells()} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="合并单元格">
          合并
        </button>
        <button onClick={() => store.getState().unmergeCells()} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="取消合并">
          取消合并
        </button>
        <button
          onClick={() => {
            const sel = store.getState().selection;
            const row = Math.min(sel.startRow, sel.endRow);
            const col = Math.min(sel.startCol, sel.endCol);
            const sheet = store.getState().getActiveSheet();
            const ref = coordsToCell(row, col);
            const cell = sheet.cells.get(ref);
            const comment = window.prompt('输入批注内容：', cell?.comment || '');
            if (comment === null) return;
            if (comment.trim() === '') {
              store.getState().deleteCellComment(row, col);
            } else {
              store.getState().setCellComment(row, col, comment.trim());
            }
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="添加/编辑批注"
        >
          批注
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const sel = store.getState().selection;
            for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
              for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                store.getState().setCellValidation(r, c, { type: 'number', operator: 'between', formula1: '0', formula2: '100', errorMessage: '请输入 0 到 100 之间的数字' });
              }
            }
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="0-100 数值验证"
        >
          0-100
        </button>
        <button
          onClick={() => {
            const sel = store.getState().selection;
            for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
              for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                store.getState().setCellValidation(r, c, { type: 'number', operator: 'greaterThan', formula1: '0', errorMessage: '请输入大于 0 的数字' });
              }
            }
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="大于 0 验证"
        >
          {'>'}0
        </button>
        <button
          onClick={() => {
            const sel = store.getState().selection;
            const input = window.prompt('输入下拉选项，用逗号分隔：', '是,否');
            if (input === null) return;
            const list = input.split(',').map(s => s.trim()).filter(Boolean);
            if (list.length === 0) return;
            for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
              for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                store.getState().setCellValidation(r, c, { type: 'list', list, errorMessage: `请选择：${list.join('、')}` });
              }
            }
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="下拉列表验证"
        >
          下拉
        </button>
        <button
          onClick={() => {
            const sel = store.getState().selection;
            for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
              for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                store.getState().clearCellValidation(r, c);
              }
            }
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="清除验证"
        >
          清验证
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const sel = store.getState().selection;
            const value = window.prompt('高亮大于多少的单元格？', '0');
            if (value === null) return;
            store.getState().addConditionalFormat({
              range: { startRow: Math.min(sel.startRow, sel.endRow), startCol: Math.min(sel.startCol, sel.endCol), endRow: Math.max(sel.startRow, sel.endRow), endCol: Math.max(sel.startCol, sel.endCol) },
              type: 'value',
              condition: 'greaterThan',
              value: parseFloat(value),
              bgColor: '#e5e5e5',
            });
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="高亮大于某值的单元格"
        >
          大于
        </button>
        <button
          onClick={() => {
            const sel = store.getState().selection;
            const value = window.prompt('高亮小于多少的单元格？', '0');
            if (value === null) return;
            store.getState().addConditionalFormat({
              range: { startRow: Math.min(sel.startRow, sel.endRow), startCol: Math.min(sel.startCol, sel.endCol), endRow: Math.max(sel.startRow, sel.endRow), endCol: Math.max(sel.startCol, sel.endCol) },
              type: 'value',
              condition: 'lessThan',
              value: parseFloat(value),
              bgColor: '#d4d4d4',
            });
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="高亮小于某值的单元格"
        >
          小于
        </button>
        <button
          onClick={() => {
            const sel = store.getState().selection;
            store.getState().addConditionalFormat({
              range: { startRow: Math.min(sel.startRow, sel.endRow), startCol: Math.min(sel.startCol, sel.endCol), endRow: Math.max(sel.startRow, sel.endRow), endCol: Math.max(sel.startCol, sel.endCol) },
              type: 'colorScale',
              condition: 'between',
              minColor: '#fee2e2',
              maxColor: '#dcfce7',
            });
          }}
          className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle}
          title="颜色刻度"
        >
          色阶
        </button>
        <button onClick={() => store.getState().clearConditionalFormats()} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="清除条件格式">
          清色阶
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: '#f5f5f5' })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="浅灰背景">
          灰
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: '#e5e5e5' })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="中灰背景">
          深灰
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: '#262626', color: '#ffffff' })} className="rounded px-2 py-1.5 text-xs hover:opacity-90" style={{ ...toolbarBtnStyle, background: 'var(--ss-cell-text)', color: 'var(--ss-bg)' }} title="黑底白字">
          黑
        </button>
        <button onClick={() => store.getState().applyStyleToSelection({ bgColor: undefined })} className="rounded px-2 py-1.5 text-xs hover:opacity-80" style={toolbarBtnStyle} title="清除背景色">
          无
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <button onClick={handleClear} className={btnBase + ' hover:opacity-80'} title="清除选中区域" style={toolbarBtnStyle}>
        清除
      </button>
      <button onClick={() => store.getState().clearFormatSelection()} className={btnBase + ' hover:opacity-80'} title="清除选中区域格式" style={toolbarBtnStyle}>
        清格式
      </button>

      <div className={dividerBase} style={dividerStyle} />

      <button onClick={() => store.getState().insertRow(selection.startRow)} className={btnBase + ' hover:opacity-80'} title="在选中行前插入一行" style={toolbarBtnStyle}>
        插行
      </button>
      <button onClick={() => store.getState().deleteRow(selection.startRow)} className={btnBase + ' hover:opacity-80'} title="删除选中行" style={toolbarBtnStyle}>
        删行
      </button>
      <button onClick={() => store.getState().insertCol(selection.startCol)} className={btnBase + ' hover:opacity-80'} title="在选中列前插入一列" style={toolbarBtnStyle}>
        插列
      </button>
      <button onClick={() => store.getState().deleteCol(selection.startCol)} className={btnBase + ' hover:opacity-80'} title="删除选中列" style={toolbarBtnStyle}>
        删列
      </button>

      <div className={dividerBase} style={dividerStyle} />

      <button
        onClick={() => store.getState().undo()}
        disabled={!canUndo}
        className={btnBase + (canUndo ? ' hover:opacity-80' : ' opacity-40 cursor-not-allowed')}
        title="撤销 (Ctrl+Z)"
        style={toolbarBtnStyle}
      >
        撤销
      </button>
      <button
        onClick={() => store.getState().redo()}
        disabled={!canRedo}
        className={btnBase + (canRedo ? ' hover:opacity-80' : ' opacity-40 cursor-not-allowed')}
        title="重做 (Ctrl+Y)"
        style={toolbarBtnStyle}
      >
        重做
      </button>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const sel = store.getState().selection;
            store.getState().setFrozenRows(sel.startRow);
            store.getState().setFrozenCols(sel.startCol);
          }}
          className={btnBase + ' hover:opacity-80'}
          title="冻结至当前单元格"
          style={toolbarBtnStyle}
        >
          冻结
        </button>
        <button
          onClick={() => {
            store.getState().setFrozenRows(0);
            store.getState().setFrozenCols(0);
          }}
          className={btnBase + ' hover:opacity-80'}
          title="取消冻结"
          style={toolbarBtnStyle}
        >
          取消冻结
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button onClick={() => store.getState().sortByColumn(selection.startCol, 'asc')} className={btnBase + ' hover:opacity-80'} title="按选中列升序排序" style={toolbarBtnStyle}>
          升序
        </button>
        <button onClick={() => store.getState().sortByColumn(selection.startCol, 'desc')} className={btnBase + ' hover:opacity-80'} title="按选中列降序排序" style={toolbarBtnStyle}>
          降序
        </button>
      </div>

      <div className={dividerBase} style={dividerStyle} />

      <div className="flex items-center gap-1">
        <button onClick={() => { handleAnalyze(); setAiOpen(true); }} className={btnBase + ' hover:opacity-80'} title="AI 分析" style={toolbarBtnStyle}>
          分析
        </button>
        <button onClick={() => setAiOpen(!aiOpen)} className={btnBase + ' hover:opacity-80'} title="AI 生成公式" style={toolbarBtnStyle}>
          AI 公式
        </button>
      </div>

      {aiOpen && (
        <div className="ml-4 flex items-center gap-2 rounded border p-2" style={{ borderColor: 'var(--ss-panel-border)', background: 'var(--ss-panel-bg)' }}>
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFormulaGenerate()}
            placeholder="输入指令: 如 求平均值、求和、最大值..."
            className="w-64 rounded border px-2 py-1 text-sm outline-none"
            style={{ borderColor: 'var(--ss-input-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-input-text)', fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
          />
          <button onClick={handleFormulaGenerate} className="rounded px-3 py-1 text-sm hover:opacity-90" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif', background: 'var(--ss-cell-text)', color: 'var(--ss-bg)' }}>
            生成
          </button>
          {aiResult && (
            <div className="max-h-32 w-72 overflow-auto whitespace-pre-wrap rounded border p-2 text-xs" style={{ borderColor: 'var(--ss-panel-border)', background: 'var(--ss-bg)', color: 'var(--ss-toolbar-text)', fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
              {aiResult}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onToggleTheme}
        className="rounded px-2 py-1 text-lg hover:opacity-80"
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
        style={toolbarBtnStyle}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <div className="ml-auto flex items-center gap-3 text-xs" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, monospace', color: 'var(--ss-header-text)' }}>
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

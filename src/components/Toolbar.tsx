import { useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { toCSV } from '../utils/csv';
import { workbookToJSON, workbookFromJSON, downloadFile } from '../utils/json';
import { coordsToCell } from '../utils/cellRef';
import { TEMPLATES } from '../templates';
import { FONT_OPTIONS } from '../utils/constants';
import {
  FileText, Upload, Download, Bold, AlignLeft, AlignCenter, AlignRight,
  Percent, Hash, DollarSign, Calendar, Minus, Plus, Grid3X3, Merge,
  Split, MessageSquare, CheckCircle, List, Filter, Paintbrush, Eraser,
  ArrowUp, ArrowDown, Undo2, Redo2, Snowflake, Sun, Moon,
  Search, Wand2, X, ChevronLeft, ChevronRight, Type,
  Table, FileSpreadsheet, BarChart3, Layers, Eye, Home, Settings,
  Trash2, SortAsc, SortDesc, Lock, Unlock
} from 'lucide-react';

interface ToolbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

type RibbonTab = 'file' | 'home' | 'insert' | 'format' | 'data' | 'view';

interface TooltipButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  title: string;
  shortcut?: string;
  disabled?: boolean;
  active?: boolean;
  variant?: 'icon' | 'text' | 'both';
}

function TooltipButton({ onClick, icon, label, title, shortcut, disabled, active, variant = 'icon' }: TooltipButtonProps) {
  const [showTip, setShowTip] = useState(false);

  const baseClasses = 'relative inline-flex items-center justify-center rounded-md transition-all duration-150 ease-out';
  const sizeClasses = variant === 'icon' ? 'h-9 w-9' : variant === 'both' ? 'h-9 px-3 gap-1' : 'h-9 px-3.5';
  const stateClasses = disabled
    ? 'opacity-40 cursor-not-allowed'
    : active
    ? 'bg-[var(--ss-selected-bg)] text-[var(--ss-cell-text)]'
    : 'hover:bg-[var(--ss-toolbar-hover)] hover:text-[var(--ss-cell-text)] text-[var(--ss-toolbar-text)]';

  return (
    <div className="relative inline-flex"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${sizeClasses} ${stateClasses}`}
        title={title + (shortcut ? ` (${shortcut})` : '')}
        style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
      >
        {icon}
        {label && <span className="text-xs whitespace-nowrap">{label}</span>}
      </button>
      {showTip && (
        <div
          className="absolute left-1/2 top-full z-[100] mt-1 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs shadow-lg"
          style={{
            background: 'var(--ss-cell-text)',
            color: 'var(--ss-bg)',
            fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif',
          }}
        >
          {title}
          {shortcut && <span className="ml-1.5 opacity-70">({shortcut})</span>}
        </div>
      )}
    </div>
  );
}

export default function Toolbar({ isDark = false, onToggleTheme }: ToolbarProps) {
  const store = useSpreadsheetStore;
  const selection = useSpreadsheetStore((s) => s.selection);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [collapsed, setCollapsed] = useState(false);
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
        alert('无效的 JSON 文件: ' + (err as Error).message);
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
      store.getState().setCellValue(Math.min(sel.endRow + 1, 999), sel.startCol, formula);
      setAiResult('已生成公式: ' + formula + ' 写入 ' + coordsToCell(Math.min(sel.endRow + 1, 999), sel.startCol));
      setAiPrompt('');
    } else {
      setAiResult('未能识别请求。请尝试:"求和""平均值""最大值""最小值""计数"等关键词。');
    }
  };

  const tabs: { id: RibbonTab; label: string; icon: React.ReactNode }[] = [
    { id: 'file', label: '文件', icon: <FileText size={14} /> },
    { id: 'home', label: '开始', icon: <Home size={14} /> },
    { id: 'insert', label: '插入', icon: <Plus size={14} /> },
    { id: 'format', label: '格式', icon: <Settings size={14} /> },
    { id: 'data', label: '数据', icon: <BarChart3 size={14} /> },
    { id: 'view', label: '视图', icon: <Eye size={14} /> },
  ];

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-md hover:bg-[var(--ss-toolbar-hover)]/50 transition-colors">
      <div className="flex items-center gap-1">
        {children}
      </div>
      <span className="text-[10px] leading-none whitespace-nowrap" style={{ color: 'var(--ss-header-text)', fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
        {title}
      </span>
    </div>
  );

  const Divider = () => (
    <div className="m-1 h-6 w-px" style={{ background: 'var(--ss-toolbar-border)' }} />
  );

  if (collapsed) {
    return (
      <div className="flex items-center border-b px-2 py-1.5" style={{ borderColor: 'var(--ss-toolbar-border)', background: 'var(--ss-toolbar-bg)' }}>
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--ss-toolbar-hover)] transition-colors"
          style={{ color: 'var(--ss-toolbar-text)' }}
          title="展开工具栏"
        >
          <ChevronRight size={16} />
        </button>
        <div className="ml-2 flex items-center gap-1.5">
          <TooltipButton onClick={() => store.getState().undo()} icon={<Undo2 size={16} />} title="撤销" shortcut="Ctrl+Z" disabled={!canUndo} />
          <TooltipButton onClick={() => store.getState().redo()} icon={<Redo2 size={16} />} title="重做" shortcut="Ctrl+Y" disabled={!canRedo} />
          <TooltipButton onClick={handleBold} icon={<Bold size={16} />} title="加粗" shortcut="Ctrl+B" />
          <TooltipButton onClick={handleClear} icon={<Eraser size={16} />} title="清除" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--ss-toolbar-hover)] transition-colors"
            title={isDark ? '浅色模式' : '深色模式'}
            style={{ color: 'var(--ss-toolbar-text)' }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b shadow-sm" style={{ borderColor: 'var(--ss-toolbar-border)', background: 'var(--ss-toolbar-bg)' }}>
      <div className="flex items-center gap-0.5 px-2 pt-1">
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--ss-toolbar-hover)] transition-colors mr-1"
          style={{ color: 'var(--ss-header-text)' }}
          title="折叠工具栏"
        >
          <ChevronLeft size={14} />
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm transition-all duration-150"
            style={{
              fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif',
              color: activeTab === tab.id ? 'var(--ss-cell-text)' : 'var(--ss-header-text)',
              background: activeTab === tab.id ? 'var(--ss-bg)' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--ss-selected-border)' : '2px solid transparent',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-2">
          <button
            onClick={onToggleTheme}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--ss-toolbar-hover)] transition-colors"
            title={isDark ? '浅色模式' : '深色模式'}
            style={{ color: 'var(--ss-toolbar-text)' }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-2" style={{ background: 'var(--ss-bg)' }}>
        {activeTab === 'file' && (
          <>
            <Group title="工作簿">
              <TooltipButton onClick={() => store.getState().newWorkbook()} icon={<FileText size={16} />} label="新建" title="新建工作簿" shortcut="Ctrl+N" variant="both" />
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
                className="h-9 rounded-md border px-2 py-1 text-xs outline-none transition-colors hover:border-[var(--ss-cell-text)]"
                style={{ borderColor: 'var(--ss-input-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-toolbar-text)', fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
                title="应用模板"
              >
                <option value="">模板</option>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Group>
            <Divider />
            <Group title="导入">
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              <TooltipButton onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />} label="CSV" title="导入 CSV" variant="both" />
              <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              <TooltipButton onClick={() => jsonInputRef.current?.click()} icon={<Upload size={16} />} label="JSON" title="导入 JSON" variant="both" />
            </Group>
            <Divider />
            <Group title="导出">
              <TooltipButton onClick={handleExportCSV} icon={<Download size={16} />} label="CSV" title="导出 CSV" variant="both" />
              <TooltipButton onClick={handleExportJSON} icon={<Download size={16} />} label="JSON" title="导出 JSON" variant="both" />
            </Group>
          </>
        )}

        {activeTab === 'home' && (
          <>
            <Group title="编辑">
              <TooltipButton onClick={() => store.getState().undo()} icon={<Undo2 size={16} />} title="撤销" shortcut="Ctrl+Z" disabled={!canUndo} />
              <TooltipButton onClick={() => store.getState().redo()} icon={<Redo2 size={16} />} title="重做" shortcut="Ctrl+Y" disabled={!canRedo} />
            </Group>
            <Divider />
            <Group title="字体">
              <TooltipButton onClick={handleBold} icon={<Bold size={16} />} title="加粗" shortcut="Ctrl+B" />
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    store.getState().applyStyleToSelection({ fontFamily: e.target.value });
                    e.target.value = '';
                  }
                }}
                className="h-9 rounded-md border px-2 py-1 text-xs outline-none"
                style={{ borderColor: 'var(--ss-input-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-toolbar-text)', fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
                title="字体"
              >
                <option value="">字体</option>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                ))}
              </select>
            </Group>
            <Divider />
            <Group title="对齐">
              <TooltipButton onClick={handleAlignLeft} icon={<AlignLeft size={16} />} title="左对齐" />
              <TooltipButton onClick={handleAlignCenter} icon={<AlignCenter size={16} />} title="居中" />
              <TooltipButton onClick={handleAlignRight} icon={<AlignRight size={16} />} title="右对齐" />
            </Group>
            <Divider />
            <Group title="数字">
              <TooltipButton onClick={() => store.getState().applyNumberFormat({ type: 'percentage', decimalPlaces: 0 })} icon={<Percent size={16} />} title="百分比" />
              <TooltipButton onClick={() => store.getState().applyNumberFormat({ type: 'number', decimalPlaces: 2 })} icon={<Hash size={16} />} title="数字" />
              <TooltipButton onClick={() => {
                const state = store.getState();
                const sheet = state.getActiveSheet();
                const ref = coordsToCell(state.selection.startRow, state.selection.startCol);
                const cell = sheet.cells.get(ref);
                const dp = cell?.numberFormat?.decimalPlaces ?? 2;
                store.getState().applyNumberFormat({ type: 'number', decimalPlaces: dp + 1 });
              }} icon={<span className="text-xs font-mono">.0+</span>} title="增加小数位" />
              <TooltipButton onClick={() => {
                const state = store.getState();
                const sheet = state.getActiveSheet();
                const ref = coordsToCell(state.selection.startRow, state.selection.startCol);
                const cell = sheet.cells.get(ref);
                const dp = cell?.numberFormat?.decimalPlaces ?? 2;
                store.getState().applyNumberFormat({ type: 'number', decimalPlaces: Math.max(0, dp - 1) });
              }} icon={<span className="text-xs font-mono">.0-</span>} title="减少小数位" />
              <TooltipButton onClick={() => store.getState().applyNumberFormat({ type: 'currency', decimalPlaces: 2, currencySymbol: '¥' })} icon={<DollarSign size={16} />} title="货币" />
              <TooltipButton onClick={() => store.getState().applyNumberFormat({ type: 'date' })} icon={<Calendar size={16} />} title="日期" />
            </Group>
            <Divider />
            <Group title="清除">
              <TooltipButton onClick={handleClear} icon={<Eraser size={16} />} title="清除内容" />
              <TooltipButton onClick={() => store.getState().clearFormatSelection()} icon={<Paintbrush size={16} />} title="清除格式" />
            </Group>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            <Group title="单元格">
              <TooltipButton onClick={() => store.getState().mergeCells()} icon={<Merge size={16} />} title="合并" />
              <TooltipButton onClick={() => store.getState().unmergeCells()} icon={<Split size={16} />} title="拆分" />
            </Group>
            <Divider />
            <Group title="批注">
              <TooltipButton
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
                icon={<MessageSquare size={16} />}
                title="批注"
              />
            </Group>
            <Divider />
            <Group title="行列">
              <TooltipButton onClick={() => store.getState().insertRow(selection.startRow)} icon={<Plus size={16} />} title="插行" />
              <TooltipButton onClick={() => store.getState().deleteRow(selection.startRow)} icon={<Minus size={16} />} title="删行" />
              <TooltipButton onClick={() => store.getState().insertCol(selection.startCol)} icon={<Plus size={16} />} title="插列" />
              <TooltipButton onClick={() => store.getState().deleteCol(selection.startCol)} icon={<Minus size={16} />} title="删列" />
            </Group>
          </>
        )}

        {activeTab === 'format' && (
          <>
            <Group title="边框">
              <TooltipButton onClick={() => store.getState().applyBorderSelection('all')} icon={<Grid3X3 size={16} />} title="全部边框" />
              <TooltipButton onClick={() => store.getState().applyBorderSelection('top')} icon={<span className="text-xs">上</span>} title="上边框" />
              <TooltipButton onClick={() => store.getState().applyBorderSelection('bottom')} icon={<span className="text-xs">下</span>} title="下边框" />
              <TooltipButton onClick={() => store.getState().applyBorderSelection('left')} icon={<span className="text-xs">左</span>} title="左边框" />
              <TooltipButton onClick={() => store.getState().applyBorderSelection('right')} icon={<span className="text-xs">右</span>} title="右边框" />
              <TooltipButton onClick={() => store.getState().applyBorderSelection('none')} icon={<X size={16} />} title="清除边框" />
              <TooltipButton onClick={() => store.getState().applyStyleToSelection({ wrap: true })} icon={<span className="text-xs">换行</span>} title="自动换行" />
            </Group>
            <Divider />
            <Group title="背景">
              <TooltipButton onClick={() => store.getState().applyStyleToSelection({ bgColor: '#f5f5f5' })} icon={<span className="h-4 w-4 rounded-sm" style={{ background: '#f5f5f5', border: '1px solid var(--ss-input-border)' }} />} title="浅灰" />
              <TooltipButton onClick={() => store.getState().applyStyleToSelection({ bgColor: '#e5e5e5' })} icon={<span className="h-4 w-4 rounded-sm" style={{ background: '#e5e5e5', border: '1px solid var(--ss-input-border)' }} />} title="中灰" />
              <TooltipButton onClick={() => store.getState().applyStyleToSelection({ bgColor: '#262626', color: '#ffffff' })} icon={<span className="h-4 w-4 rounded-sm" style={{ background: '#262626', border: '1px solid var(--ss-input-border)' }} />} title="黑底" />
              <TooltipButton onClick={() => store.getState().applyStyleToSelection({ bgColor: undefined })} icon={<X size={16} />} title="清除背景" />
            </Group>
          </>
        )}

        {activeTab === 'data' && (
          <>
            <Group title="验证">
              <TooltipButton
                onClick={() => {
                  const sel = store.getState().selection;
                  for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                    for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                      store.getState().setCellValidation(r, c, { type: 'number', operator: 'between', formula1: '0', formula2: '100', errorMessage: '请输入 0 到 100 之间的数字' });
                    }
                  }
                }}
                icon={<CheckCircle size={16} />}
                label="0-100"
                title="0-100 数值验证"
                variant="both"
              />
              <TooltipButton
                onClick={() => {
                  const sel = store.getState().selection;
                  for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                    for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                      store.getState().setCellValidation(r, c, { type: 'number', operator: 'greaterThan', formula1: '0', errorMessage: '请输入大于 0 的数字' });
                    }
                  }
                }}
                icon={<CheckCircle size={16} />}
                label=">0"
                title="大于 0 验证"
                variant="both"
              />
              <TooltipButton
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
                icon={<List size={16} />}
                label="下拉"
                title="下拉列表"
                variant="both"
              />
              <TooltipButton
                onClick={() => {
                  const sel = store.getState().selection;
                  for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                    for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                      store.getState().clearCellValidation(r, c);
                    }
                  }
                }}
                icon={<Eraser size={16} />}
                label="清除"
                title="清除验证"
                variant="both"
              />
            </Group>
            <Divider />
            <Group title="条件格式">
              <TooltipButton
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
                icon={<Filter size={16} />}
                label="大于"
                title="高亮大于某值"
                variant="both"
              />
            </Group>
            <Divider />
            <Group title="排序">
              <TooltipButton onClick={() => store.getState().sortByColumn(selection.startCol, 'asc')} icon={<SortAsc size={16} />} title="升序" />
              <TooltipButton onClick={() => store.getState().sortByColumn(selection.startCol, 'desc')} icon={<SortDesc size={16} />} title="降序" />
            </Group>
            <Divider />
            <Group title="AI分析">
              <TooltipButton onClick={handleAnalyze} icon={<Wand2 size={16} />} title="数据分析" />
            </Group>
          </>
        )}

        {activeTab === 'view' && (
          <>
            <Group title="冻结">
              <TooltipButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(1); }} icon={<Lock size={16} />} title="冻结首行首列" />
              <TooltipButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(0); }} icon={<Lock size={16} />} label="首行" title="冻结首行" variant="both" />
              <TooltipButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(1); }} icon={<Lock size={16} />} label="首列" title="冻结首列" variant="both" />
              <TooltipButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(0); }} icon={<Unlock size={16} />} title="取消冻结" />
            </Group>
            <Divider />
            <Group title="视图">
              <TooltipButton onClick={() => {}} icon={<Eye size={16} />} label="普通" title="普通视图" variant="both" />
              <TooltipButton onClick={() => {}} icon={<Layers size={16} />} label="分页" title="分页预览" variant="both" />
            </Group>
          </>
        )}
      </div>
    </div>
  );
}
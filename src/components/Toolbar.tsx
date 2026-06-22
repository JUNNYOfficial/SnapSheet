/**
 * @file components/Toolbar.tsx
 * @description 顶部工具栏组件。
 *              提供文件导入导出、样式设置、行列操作、撤销重做、主题切换等功能按钮，
 *              通过 Ribbon 标签页组织各类操作入口。
 */

import { useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { toCSV, parseCSV } from '../utils/csv';
import { workbookToJSON, workbookFromJSON, downloadFile } from '../utils/json';
import { exportToExcel, importFromExcel } from '../utils/excel';
import { coordsToCell, colToLetter } from '../utils/cellRef';
import { requestDeleteConfirmation } from '../utils/deleteConfirmation';
import { TEMPLATES } from '../templates';

import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../utils/constants';
import { autoFitCols, autoFitRows } from '../utils/autoFit';
import { FileText, Upload, Download, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Type, Paintbrush, Palette, Minus, Plus, Merge, Split,
  Percent, Hash, DollarSign, Calendar, WrapText, ArrowLeftRight, ArrowUpDown,
  MessageSquare, Eraser, Undo2, Redo2, Sun, Moon, ChevronLeft, ChevronRight,
  Eye, Home, SortAsc, SortDesc, Filter,
  Lock, Unlock, PanelRight, Save, FolderOpen, Wand2, Sparkles, Grid3x3
} from 'lucide-react';

interface ToolbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
  onTogglePanel?: () => void;
}

type RibbonTab = 'file' | 'home' | 'insert' | 'view' | 'ai';

interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  title: string;
  shortcut?: string;
  disabled?: boolean;
  active?: boolean;
  variant?: 'icon' | 'both';
}

/** 单个工具栏按钮，支持图标/图文两种展示形式与悬停提示 */
function ToolbarButton({ onClick, icon, label, title, shortcut, disabled, active, variant = 'both' }: ToolbarButtonProps) {
  return (
    <div className="relative group inline-flex">
      <button
        onClick={onClick}
        disabled={disabled}
        title={`${title}${shortcut ? ` (${shortcut})` : ''}`}
        className={[
          'relative inline-flex items-center justify-center rounded-md transition-all duration-150 ease-out',
          variant === 'icon' ? 'h-8 w-8' : 'h-8 px-2.5 gap-1.5',
          disabled ? 'opacity-40 cursor-not-allowed' : active
            ? 'bg-[var(--ss-selected-bg)] text-[var(--ss-text-primary)]'
            : 'text-[var(--ss-text-secondary)] hover:bg-[var(--ss-hover-bg)] hover:text-[var(--ss-text-primary)]'
        ].join(' ')}
      >
        {icon}
        <span className="text-xs whitespace-nowrap hidden sm:inline">{label ?? title}</span>
      </button>
      <div
        className="absolute left-1/2 top-full z-[100] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150"
        style={{ background: 'var(--ss-text-primary)', color: 'var(--ss-bg)', boxShadow: '0 4px 12px var(--ss-backdrop-bg)' }}
      >
        {title}
        {shortcut && <span className="ml-1 opacity-70">({shortcut})</span>}
      </div>
    </div>
  );
}

/** 工具栏按钮分组容器，显示分组标题 */
function ToolbarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[10px] leading-none whitespace-nowrap font-medium hidden sm:block" style={{ color: 'var(--ss-text-tertiary)' }}>
        {title}
      </span>
    </div>
  );
}

/** 工具栏垂直分隔线 */
function ToolbarDivider() {
  return <div className="mx-1 h-8 w-px rounded-full" style={{ background: 'var(--ss-border)' }} />;
}

export default function Toolbar({ isDark = false, onToggleTheme, onTogglePanel }: ToolbarProps) {
  const store = useSpreadsheetStore;
  const selection = useSpreadsheetStore((s) => s.selection);
  /** CSV 文件输入引用 */
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** JSON 文件输入引用 */
  const jsonInputRef = useRef<HTMLInputElement>(null);
  /** Excel 文件输入引用 */
  const excelInputRef = useRef<HTMLInputElement>(null);
  /** 当前 Ribbon 标签页 */
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  /** 工具栏是否折叠 */
  const [collapsed, setCollapsed] = useState(false);
  /** AI 公式生成输入框内容 */
  const [aiPrompt, setAiPrompt] = useState('');
  /** AI 分析/生成结果 */
  const [aiResult, setAiResult] = useState('');
  const canUndo = store.getState().canUndo();
  const canRedo = store.getState().canRedo();

  /** 导出当前工作表为 CSV 文件 */
  const handleExportCSV = () => {
    const sheet = store.getState().getActiveSheet();
    const csv = toCSV(sheet.cells, sheet.colWidths);
    if (csv) downloadFile(csv, sheet.name + '.csv', 'text/csv;charset=utf-8');
  };

  /** 导出整个工作簿为 JSON 文件 */
  const handleExportJSON = () => {
    const json = workbookToJSON(store.getState().workbook);
    downloadFile(json, 'workbook.json', 'application/json;charset=utf-8');
  };

  /** 从 CSV 文件导入数据到当前工作表 */
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      alert('CSV 文件过大，请选择小于 10MB 的文件');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string || '').replace(/^\ufeff/, '');
        if (!text.trim()) {
          alert('CSV 文件为空');
          return;
        }
        const rows = parseCSV(text);
        if (rows.length === 0) {
          alert('未解析到有效数据');
          return;
        }
        const cells: { row: number; col: number; value: string }[] = [];
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < rows[r].length; c++) {
            const value = rows[r][c];
            if (value !== '') cells.push({ row: r, col: c, value });
          }
        }
        store.getState().setCellsBulk(cells);
      } catch (err) {
        alert('CSV 解析失败: ' + (err as Error).message);
      }
    };
    reader.onerror = () => alert('读取 CSV 文件失败');
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      alert('JSON 文件过大，请选择小于 20MB 的文件');
      if (jsonInputRef.current) jsonInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text.trim()) {
          alert('JSON 文件为空');
          return;
        }
        store.getState().loadWorkbook(workbookFromJSON(text));
      } catch (err) {
        alert('无效的 JSON 文件: ' + (err as Error).message);
      }
    };
    reader.onerror = () => alert('读取 JSON 文件失败');
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  /** 导出整个工作簿为 Excel 文件 */
  const handleExportExcel = async () => {
    await exportToExcel(store.getState().workbook, 'snapsheet.xlsx');
  };

  /** 从 Excel 文件导入所有工作表数据 */
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      alert('Excel 文件过大，请选择小于 20MB 的文件');
      if (excelInputRef.current) excelInputRef.current.value = '';
      return;
    }
    const extension = file.name.toLowerCase().split('.').pop();
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    if (!validTypes.includes(file.type) && !['xlsx', 'xls'].includes(extension || '')) {
      alert('请选择有效的 Excel 文件（.xlsx 或 .xls）');
      if (excelInputRef.current) excelInputRef.current.value = '';
      return;
    }
    try {
      const result = await importFromExcel(file);
      if (!result.sheets || result.sheets.length === 0) {
        alert('Excel 文件中没有可导入的工作表');
        return;
      }
      store.getState().newWorkbook();
      result.sheets.forEach((importedSheet, index) => {
        const state = store.getState();
        let targetSheetId = state.workbook.activeSheetId;
        if (index > 0) {
          state.addSheet();
          targetSheetId = store.getState().workbook.activeSheetId;
        }
        store.getState().renameSheet(targetSheetId, importedSheet.name);
        if (importedSheet.data && importedSheet.data.length > 0) {
          const cells = importedSheet.data
            .filter((cell) => cell.row >= 0 && cell.col >= 0 && cell.value !== null)
            .map((cell) => ({ row: cell.row, col: cell.col, value: cell.value as string }));
          store.getState().setCellsBulk(cells);
        }
      });
    } catch (err) {
      alert('导入 Excel 文件失败: ' + (err as Error).message);
    }
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  /**
   * 获取选择区域中首个存在单元格的指定样式值，用于判断工具栏按钮激活状态。
   * @param key 样式属性名
   */
  const getFirstCellStyle = (key: keyof NonNullable<import('../types').Cell['style']>) => {
    const sel = store.getState().selection;
    const sheet = store.getState().getActiveSheet();
    for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
      for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
        const cell = sheet.cells.get(coordsToCell(r, c));
        if (cell) return !!cell.style?.[key];
      }
    }
    return false;
  };

  /** 加粗开关 */
  const handleBold = () => store.getState().applyStyleToSelection({ bold: !getFirstCellStyle('bold') });
  /** 斜体开关 */
  const handleItalic = () => store.getState().applyStyleToSelection({ italic: !getFirstCellStyle('italic') });
  /** 下划线开关 */
  const handleUnderline = () => store.getState().applyStyleToSelection({ underline: !getFirstCellStyle('underline') });
  /** 删除线开关 */
  const handleStrikethrough = () => store.getState().applyStyleToSelection({ strikethrough: !getFirstCellStyle('strikethrough') });
  /** 字体颜色 */
  const handleFontColor = (color: string) => store.getState().applyStyleToSelection({ color });
  /** 背景颜色 */
  const handleBgColor = (color: string) => store.getState().applyStyleToSelection({ bgColor: color });
  /** 清除格式 */
  const handleClearFormat = () => store.getState().clearFormatSelection();
  /** 格式刷 */
  const formatPainterStyle = store((s) => s.formatPainterStyle);
  const handleFormatPainter = () => {
    if (formatPainterStyle) {
      store.getState().applyFormatPainter();
    } else {
      store.getState().copyFormatPainter();
    }
  };
  /** 自动换行 */
  const handleWrapText = () => store.getState().applyStyleToSelection({ wrap: !getFirstCellStyle('wrap') });
  /** 自动调整列宽 */
  const handleAutoFitCols = () => {
    const state = store.getState();
    const sel = state.selection;
    const cols: number[] = [];
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);
    for (let c = minCol; c <= maxCol; c++) cols.push(c);
    autoFitCols(state.getActiveSheet(), state, cols);
  };
  /** 自动调整行高 */
  const handleAutoFitRows = () => {
    const state = store.getState();
    const sel = state.selection;
    const rows: number[] = [];
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    for (let r = minRow; r <= maxRow; r++) rows.push(r);
    autoFitRows(state.getActiveSheet(), state, rows);
  };
  /** 左对齐 */
  const handleAlignLeft = () => store.getState().applyStyleToSelection({ align: 'left' });
  /** 居中对齐 */
  const handleAlignCenter = () => store.getState().applyStyleToSelection({ align: 'center' });
  /** 右对齐 */
  const handleAlignRight = () => store.getState().applyStyleToSelection({ align: 'right' });
  /** 垂直对齐 */
  const handleVerticalAlign = (align: 'top' | 'middle' | 'bottom') => store.getState().applyStyleToSelection({ verticalAlign: align });
  /** 边框 */
  const handleBorder = (side: 'all' | 'outside' | 'top' | 'bottom' | 'left' | 'right' | 'none') => store.getState().applyBorderSelection(side);
  /** 清空选择区域内容 */
  const handleClear = () =>
    requestDeleteConfirmation(() => store.getState().clearSelection(), '清除内容');

  /** AI 分析选中区域：统计 SUM/AVG/MAX/MIN 并推荐公式 */
  const handleAiAnalyze = () => {
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

  /** AI 公式生成：根据自然语言关键词一键写入公式 */
  const handleAiFormulaGenerate = () => {
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
      const targetRow = Math.min(sel.endRow + 1, 999);
      store.getState().setCellValue(targetRow, sel.startCol, formula);
      setAiResult('已生成公式: ' + formula + ' 写入 ' + coordsToCell(targetRow, sel.startCol));
      setAiPrompt('');
    } else {
      setAiResult('未能识别请求。请尝试:"求和""平均值""最大值""最小值""计数"等关键词。');
    }
  };

  /** Ribbon 标签页配置 */
  const tabs: { id: RibbonTab; label: string; icon: React.ReactNode }[] = [
    { id: 'file', label: '文件', icon: <FileText size={14} /> },
    { id: 'home', label: '开始', icon: <Home size={14} /> },
    { id: 'insert', label: '插入', icon: <Plus size={14} /> },
    { id: 'view', label: '视图', icon: <Eye size={14} /> },
    { id: 'ai', label: 'AI', icon: <Sparkles size={14} /> },
  ];

  /** 右侧公共控制区：属性面板与主题切换 */
  const CommonControls = () => (
    <div className="flex items-center gap-1">
      <ToolbarButton onClick={onTogglePanel!} icon={<PanelRight size={16} />} title="属性面板" />
      <ToolbarButton onClick={onToggleTheme!} icon={isDark ? <Sun size={16} /> : <Moon size={16} />} title={isDark ? '浅色模式' : '深色模式'} />
    </div>
  );

  if (collapsed) {
    return (
      <div className="ss-vibrancy flex items-center border-b px-2 py-1.5" style={{ borderColor: 'var(--ss-border)' }}>
        <ToolbarButton onClick={() => setCollapsed(false)} icon={<ChevronRight size={16} />} title="展开工具栏" />
        <div className="ml-2 flex items-center gap-1">
          <ToolbarButton onClick={() => store.getState().undo()} icon={<Undo2 size={16} />} title="撤销" shortcut="Ctrl+Z" disabled={!canUndo} />
          <ToolbarButton onClick={() => store.getState().redo()} icon={<Redo2 size={16} />} title="重做" shortcut="Ctrl+Y" disabled={!canRedo} />
          <ToolbarButton onClick={handleBold} icon={<Bold size={16} />} title="加粗" shortcut="Ctrl+B" active={getFirstCellStyle('bold')} />
          <ToolbarButton onClick={handleClear} icon={<Eraser size={16} />} title="清除" />
        </div>
        <div className="ml-auto"><CommonControls /></div>
      </div>
    );
  }

  return (
    <div className="ss-vibrancy flex flex-col border-b" style={{ borderColor: 'var(--ss-border)' }}>
      <div className="flex items-center px-2 pt-1">
        <ToolbarButton onClick={() => setCollapsed(true)} icon={<ChevronLeft size={14} />} title="折叠工具栏" />
        <div className="flex items-center gap-0.5 ml-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm transition-all duration-150"
              style={{
                color: activeTab === tab.id ? 'var(--ss-text-primary)' : 'var(--ss-text-secondary)',
                background: activeTab === tab.id ? 'var(--ss-bg)' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid var(--ss-selected-border)' : '2px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto"><CommonControls /></div>
      </div>

      <div className="flex flex-wrap items-center gap-x-0 gap-y-1 px-3 py-2 border-t" style={{ borderColor: 'var(--ss-border-light)' }}>
        {activeTab === 'file' && (
          <>
            <ToolbarGroup title="工作簿">
              <ToolbarButton onClick={() => store.getState().newWorkbook()} icon={<FileText size={16} />} label="新建" title="新建工作簿" shortcut="Ctrl+N" variant="both" />
              <ToolbarButton onClick={() => {
                const name = prompt('请输入保存名称:', 'snapsheet');
                if (name) { store.getState().saveWorkbook(name); alert(`工作簿已保存为: ${name}`); }
              }} icon={<Save size={16} />} label="保存" title="保存工作簿到本地" shortcut="Ctrl+S" variant="both" />
              <ToolbarButton onClick={() => {
                const saved = store.getState().listSavedWorkbooks();
                if (saved.length === 0) { alert('没有已保存的工作簿'); return; }
                const names = saved.map((w) => w.name).join('\n');
                const name = prompt(`已保存的工作簿:\n${names}\n\n请输入要打开的名称:`);
                if (name && store.getState().loadFromStorage(name)) alert(`已打开工作簿: ${name}`);
                else if (name) alert(`未找到工作簿: ${name}`);
              }} icon={<FolderOpen size={16} />} label="打开" title="打开已保存的工作簿" variant="both" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="导入">
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />} label="CSV" title="导入 CSV" variant="both" />
              <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              <ToolbarButton onClick={() => jsonInputRef.current?.click()} icon={<Upload size={16} />} label="JSON" title="导入 JSON" variant="both" />
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
              <ToolbarButton onClick={() => excelInputRef.current?.click()} icon={<Upload size={16} />} label="Excel" title="导入 Excel (.xlsx/.xls)" variant="both" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="导出">
              <ToolbarButton onClick={handleExportCSV} icon={<Download size={16} />} label="CSV" title="导出 CSV" variant="both" />
              <ToolbarButton onClick={handleExportJSON} icon={<Download size={16} />} label="JSON" title="导出 JSON" variant="both" />
              <ToolbarButton onClick={handleExportExcel} icon={<Download size={16} />} label="Excel" title="导出 Excel (.xlsx)" variant="both" />
            </ToolbarGroup>
          </>
        )}

        {activeTab === 'home' && (
          <>
            <ToolbarGroup title="编辑">
              <ToolbarButton onClick={() => store.getState().undo()} icon={<Undo2 size={16} />} title="撤销" shortcut="Ctrl+Z" disabled={!canUndo} />
              <ToolbarButton onClick={() => store.getState().redo()} icon={<Redo2 size={16} />} title="重做" shortcut="Ctrl+Y" disabled={!canRedo} />
              <ToolbarButton onClick={handleClear} icon={<Eraser size={16} />} title="清除内容" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="字体">
              <ToolbarButton onClick={handleBold} icon={<Bold size={16} />} title="加粗" shortcut="Ctrl+B" active={getFirstCellStyle('bold')} />
              <ToolbarButton onClick={handleItalic} icon={<Italic size={16} />} title="斜体" shortcut="Ctrl+I" active={getFirstCellStyle('italic')} />
              <ToolbarButton onClick={handleUnderline} icon={<Underline size={16} />} title="下划线" shortcut="Ctrl+U" active={getFirstCellStyle('underline')} />
              <ToolbarButton onClick={handleStrikethrough} icon={<Strikethrough size={16} />} title="删除线" active={getFirstCellStyle('strikethrough')} />
              <label className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border text-[var(--ss-text-secondary)] transition-colors hover:bg-[var(--ss-hover-bg)]" style={{ borderColor: 'var(--ss-border)' }} title="字体颜色">
                <Type size={16} style={{ color: getFirstCellStyle('color') ? (() => {
                  const sel = store.getState().selection;
                  const sheet = store.getState().getActiveSheet();
                  for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                    for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                      const cell = sheet.cells.get(coordsToCell(r, c));
                      if (cell?.style?.color) return cell.style.color;
                    }
                  }
                  return 'var(--ss-text-secondary)';
                })() : 'var(--ss-text-secondary)' }} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFontColor(e.target.value)} />
              </label>
              <label className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border text-[var(--ss-text-secondary)] transition-colors hover:bg-[var(--ss-hover-bg)]" style={{ borderColor: 'var(--ss-border)' }} title="背景颜色">
                <Palette size={16} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleBgColor(e.target.value)} />
              </label>
              <select
                value=""
                onChange={(e) => { if (e.target.value) { store.getState().applyStyleToSelection({ fontFamily: e.target.value }); e.target.value = ''; } }}
                className="h-8 rounded-md border px-2 py-1 text-xs outline-none transition-colors focus:border-[var(--ss-focus-ring)] cursor-pointer"
                style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-secondary)' }}
                title="字体"
              >
                <option value="">字体</option>
                {FONT_OPTIONS.map((f) => <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
              </select>
              <select
                value=""
                onChange={(e) => { if (e.target.value) { store.getState().applyStyleToSelection({ fontSize: parseInt(e.target.value, 10) }); e.target.value = ''; } }}
                className="h-8 w-14 rounded-md border px-1 py-1 text-xs outline-none text-center transition-colors focus:border-[var(--ss-focus-ring)] cursor-pointer"
                style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-secondary)' }}
                title="字号"
              >
                <option value="">字号</option>
                {FONT_SIZE_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <ToolbarButton onClick={handleClearFormat} icon={<Eraser size={16} />} title="清除格式" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="对齐">
              <ToolbarButton onClick={handleAlignLeft} icon={<AlignLeft size={16} />} title="左对齐" />
              <ToolbarButton onClick={handleAlignCenter} icon={<AlignCenter size={16} />} title="居中" />
              <ToolbarButton onClick={handleAlignRight} icon={<AlignRight size={16} />} title="右对齐" />
              <ToolbarButton onClick={() => handleVerticalAlign('top')} icon={<AlignVerticalJustifyStart size={16} />} title="顶端对齐" />
              <ToolbarButton onClick={() => handleVerticalAlign('middle')} icon={<AlignVerticalJustifyCenter size={16} />} title="垂直居中" />
              <ToolbarButton onClick={() => handleVerticalAlign('bottom')} icon={<AlignVerticalJustifyEnd size={16} />} title="底端对齐" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="边框">
              <ToolbarButton onClick={() => handleBorder('all')} icon={<Grid3x3 size={16} />} title="所有框线" />
              <ToolbarButton onClick={() => handleBorder('outside')} icon={<Minus size={16} />} title="外侧框线" />
              <ToolbarButton onClick={() => handleBorder('top')} icon={<Minus size={16} className="-rotate-0" />} title="上框线" />
              <ToolbarButton onClick={() => handleBorder('bottom')} icon={<Minus size={16} />} title="下框线" />
              <ToolbarButton onClick={() => handleBorder('left')} icon={<Minus size={16} className="-rotate-90" />} title="左框线" />
              <ToolbarButton onClick={() => handleBorder('right')} icon={<Minus size={16} className="-rotate-90" />} title="右框线" />
              <ToolbarButton onClick={() => handleBorder('none')} icon={<Eraser size={16} />} title="清除边框" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="格式">
              <ToolbarButton onClick={handleFormatPainter} icon={<Paintbrush size={16} />} title={formatPainterStyle ? '应用格式刷' : '复制格式'} active={!!formatPainterStyle} />
              <ToolbarButton onClick={handleWrapText} icon={<WrapText size={16} />} title="自动换行" active={getFirstCellStyle('wrap')} />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="单元格大小">
              <ToolbarButton onClick={handleAutoFitCols} icon={<ArrowLeftRight size={16} />} title="自动调整列宽" />
              <ToolbarButton onClick={handleAutoFitRows} icon={<ArrowUpDown size={16} />} title="自动调整行高" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="数字">
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'percentage', decimalPlaces: 0 })} icon={<Percent size={16} />} title="百分比" />
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'number', decimalPlaces: 2 })} icon={<Hash size={16} />} title="数字" />
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'currency', decimalPlaces: 2, currencySymbol: '¥' })} icon={<DollarSign size={16} />} title="货币" />
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'date' })} icon={<Calendar size={16} />} title="日期" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="模板">
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  if (window.confirm('应用模板会覆盖当前工作表内容，是否继续？')) {
                    store.getState().applyTemplate(id);
                  }
                  e.target.value = '';
                }}
                className="h-8 rounded-md border px-2 py-1 text-xs outline-none transition-colors focus:border-[var(--ss-focus-ring)] cursor-pointer"
                style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-secondary)' }}
                title="K12 场景模板"
              >
                <option value="">K12 模板</option>
                {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </ToolbarGroup>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            <ToolbarGroup title="单元格">
              <ToolbarButton onClick={() => store.getState().mergeCells()} icon={<Merge size={16} />} title="合并" />
              <ToolbarButton onClick={() => store.getState().unmergeCells()} icon={<Split size={16} />} title="拆分" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="批注">
              <ToolbarButton onClick={() => {
                const sel = store.getState().selection;
                const row = Math.min(sel.startRow, sel.endRow);
                const col = Math.min(sel.startCol, sel.endCol);
                const sheet = store.getState().getActiveSheet();
                const ref = coordsToCell(row, col);
                const cell = sheet.cells.get(ref);
                const comment = window.prompt('输入批注内容：', cell?.comment || '');
                if (comment === null) return;
                if (comment.trim() === '') store.getState().deleteCellComment(row, col);
                else store.getState().setCellComment(row, col, comment.trim());
              }} icon={<MessageSquare size={16} />} title="批注" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="行列">
              <ToolbarButton onClick={() => store.getState().insertRow(selection.startRow)} icon={<Plus size={16} />} title="插行" />
              <ToolbarButton
                onClick={() =>
                  requestDeleteConfirmation(() => store.getState().deleteRow(selection.startRow), '删除行')
                }
                icon={<Minus size={16} />}
                title="删行"
              />
              <ToolbarButton onClick={() => store.getState().insertCol(selection.startCol)} icon={<Plus size={16} />} title="插列" />
              <ToolbarButton
                onClick={() =>
                  requestDeleteConfirmation(() => store.getState().deleteCol(selection.startCol), '删除列')
                }
                icon={<Minus size={16} />}
                title="删列"
              />
            </ToolbarGroup>
          </>
        )}

        {activeTab === 'view' && (
          <>
            <ToolbarGroup title="冻结">
              <ToolbarButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(1); }} icon={<Lock size={16} />} title="冻结首行首列" />
              <ToolbarButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(0); }} icon={<Lock size={16} />} label="首行" title="冻结首行" variant="both" />
              <ToolbarButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(1); }} icon={<Lock size={16} />} label="首列" title="冻结首列" variant="both" />
              <ToolbarButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(0); }} icon={<Unlock size={16} />} title="取消冻结" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="排序">
              <ToolbarButton onClick={() => store.getState().sortByColumn(selection.startCol, 'asc')} icon={<SortAsc size={16} />} title="升序" />
              <ToolbarButton onClick={() => store.getState().sortByColumn(selection.startCol, 'desc')} icon={<SortDesc size={16} />} title="降序" />
              <ToolbarButton onClick={() => store.getState().applyAutoFilter()} icon={<Filter size={16} />} title="自动筛选" />
            </ToolbarGroup>
          </>
        )}

        {activeTab === 'ai' && (
          <>
            <ToolbarGroup title="AI 公式">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="输入需求，如：求和、平均值..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAiFormulaGenerate(); } }}
                className="h-8 w-48 rounded-md border px-2 text-xs outline-none transition-colors focus:border-[var(--ss-focus-ring)]"
                style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-primary)' }}
              />
              <ToolbarButton onClick={handleAiFormulaGenerate} icon={<Wand2 size={16} />} title="生成公式" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="数据分析">
              <ToolbarButton onClick={handleAiAnalyze} icon={<Sparkles size={16} />} title="分析选中区域" />
            </ToolbarGroup>
            {aiResult && (
              <>
                <ToolbarDivider />
                <div className="ml-1 px-3 py-2 rounded-md text-xs whitespace-pre-wrap max-w-md" style={{ background: 'var(--ss-input-bg)', color: 'var(--ss-text-secondary)' }}>
                  {aiResult}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

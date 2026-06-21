import { useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { toCSV, parseCSV } from '../utils/csv';
import { workbookToJSON, workbookFromJSON, downloadFile } from '../utils/json';
import { exportToExcel, importFromExcel } from '../utils/excel';
import { coordsToCell } from '../utils/cellRef';

import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../utils/constants';
import {
  FileText, Upload, Download, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Percent, Hash, DollarSign, Calendar, Minus, Plus, Merge, Split,
  MessageSquare, Eraser, Undo2, Redo2, Sun, Moon, ChevronLeft, ChevronRight,
  Eye, Home, SortAsc, SortDesc,
  Lock, Unlock, PanelRight, Save, FolderOpen
} from 'lucide-react';

interface ToolbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
  onTogglePanel?: () => void;
}

type RibbonTab = 'file' | 'home' | 'insert' | 'view';

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

function ToolbarButton({ onClick, icon, label, title, shortcut, disabled, active, variant = 'icon' }: ToolbarButtonProps) {
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
        {label && <span className="text-xs whitespace-nowrap hidden sm:inline">{label}</span>}
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

function ToolbarDivider() {
  return <div className="mx-1 h-8 w-px rounded-full" style={{ background: 'var(--ss-border)' }} />;
}

export default function Toolbar({ isDark = false, onToggleTheme, onTogglePanel }: ToolbarProps) {
  const store = useSpreadsheetStore;
  const selection = useSpreadsheetStore((s) => s.selection);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
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

  const handleExportExcel = () => exportToExcel(store.getState().workbook, 'snapsheet.xlsx');

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
      const importedSheet = result.sheets[0];
      if (importedSheet.data && importedSheet.data.length > 0) {
        const cells = importedSheet.data
          .filter((cell) => cell.row >= 0 && cell.col >= 0 && cell.value !== null)
          .map((cell) => ({ row: cell.row, col: cell.col, value: cell.value as string }));
        store.getState().setCellsBulk(cells);
      }
    } catch (err) {
      alert('导入 Excel 文件失败: ' + (err as Error).message);
    }
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

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

  const handleBold = () => store.getState().applyStyleToSelection({ bold: !getFirstCellStyle('bold') });
  const handleItalic = () => store.getState().applyStyleToSelection({ italic: !getFirstCellStyle('italic') });
  const handleUnderline = () => store.getState().applyStyleToSelection({ underline: !getFirstCellStyle('underline') });
  const handleAlignLeft = () => store.getState().applyStyleToSelection({ align: 'left' });
  const handleAlignCenter = () => store.getState().applyStyleToSelection({ align: 'center' });
  const handleAlignRight = () => store.getState().applyStyleToSelection({ align: 'right' });
  const handleClear = () => store.getState().clearSelection();

  const tabs: { id: RibbonTab; label: string; icon: React.ReactNode }[] = [
    { id: 'file', label: '文件', icon: <FileText size={14} /> },
    { id: 'home', label: '开始', icon: <Home size={14} /> },
    { id: 'insert', label: '插入', icon: <Plus size={14} /> },
    { id: 'view', label: '视图', icon: <Eye size={14} /> },
  ];

  const CommonControls = () => (
    <div className="flex items-center gap-1">
      <ToolbarButton onClick={onTogglePanel!} icon={<PanelRight size={16} />} title="属性面板" />
      <ToolbarButton onClick={onToggleTheme!} icon={isDark ? <Sun size={16} /> : <Moon size={16} />} title={isDark ? '浅色模式' : '深色模式'} />
    </div>
  );

  if (collapsed) {
    return (
      <div className="flex items-center border-b px-2 py-1.5" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-toolbar-bg)' }}>
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
    <div className="flex flex-col border-b" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-toolbar-bg)' }}>
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
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="对齐">
              <ToolbarButton onClick={handleAlignLeft} icon={<AlignLeft size={16} />} title="左对齐" />
              <ToolbarButton onClick={handleAlignCenter} icon={<AlignCenter size={16} />} title="居中" />
              <ToolbarButton onClick={handleAlignRight} icon={<AlignRight size={16} />} title="右对齐" />
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup title="数字">
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'percentage', decimalPlaces: 0 })} icon={<Percent size={16} />} title="百分比" />
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'number', decimalPlaces: 2 })} icon={<Hash size={16} />} title="数字" />
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'currency', decimalPlaces: 2, currencySymbol: '¥' })} icon={<DollarSign size={16} />} title="货币" />
              <ToolbarButton onClick={() => store.getState().applyNumberFormat({ type: 'date' })} icon={<Calendar size={16} />} title="日期" />
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
              <ToolbarButton onClick={() => store.getState().deleteRow(selection.startRow)} icon={<Minus size={16} />} title="删行" />
              <ToolbarButton onClick={() => store.getState().insertCol(selection.startCol)} icon={<Plus size={16} />} title="插列" />
              <ToolbarButton onClick={() => store.getState().deleteCol(selection.startCol)} icon={<Minus size={16} />} title="删列" />
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
            </ToolbarGroup>
          </>
        )}
      </div>
    </div>
  );
}

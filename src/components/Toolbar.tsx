import { useRef, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { toCSV } from '../utils/csv';
import { workbookToJSON, workbookFromJSON, downloadFile } from '../utils/json';
import { exportToExcel, importFromExcel } from '../utils/excel';
import { coordsToCell } from '../utils/cellRef';
import { TEMPLATES } from '../templates';
import { FONT_OPTIONS } from '../utils/constants';
import {
  FileText, Upload, Download, Bold, AlignLeft, AlignCenter, AlignRight,
  Percent, Hash, DollarSign, Calendar, Minus, Plus, Grid3X3, Merge,
  Split, MessageSquare, Eraser,
  ArrowUp, ArrowDown, Undo2, Redo2, Snowflake, Sun, Moon,
  Search, ChevronLeft, ChevronRight, Type,
  Table, FileSpreadsheet, BarChart3, Eye, Home, Settings,
  Trash2, SortAsc, SortDesc, Lock, Unlock, PanelRight
} from 'lucide-react';

interface ToolbarProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
  onTogglePanel?: () => void;
}

type RibbonTab = 'file' | 'home' | 'insert' | 'view';

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

  const handleExportExcel = () => {
    const wb = store.getState().workbook;
    exportToExcel(wb, 'snapsheet.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importFromExcel(file);
      const sheet = store.getState().getActiveSheet();
      // 清除现有数据
      store.getState().newWorkbook();
      // 导入第一个工作表的数据
      if (result.sheets.length > 0) {
        const importedSheet = result.sheets[0];
        importedSheet.data.forEach((cell, ref) => {
          const [row, col] = ref.split(':').map(Number);
          store.getState().setCellValue(row, col, cell.value);
        });
      }
      alert(`成功导入 Excel 文件：${file.name}`);
    } catch (err) {
      alert('导入 Excel 文件失败: ' + (err as Error).message);
    }
    if (excelInputRef.current) excelInputRef.current.value = '';
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

  const tabs: { id: RibbonTab; label: string; icon: React.ReactNode }[] = [
    { id: 'file', label: '文件', icon: <FileText size={14} /> },
    { id: 'home', label: '开始', icon: <Home size={14} /> },
    { id: 'insert', label: '插入', icon: <Plus size={14} /> },
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
            onClick={onTogglePanel}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--ss-toolbar-hover)] transition-colors"
            title="属性面板"
            style={{ color: 'var(--ss-toolbar-text)' }}
          >
            <PanelRight size={14} />
          </button>
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
            onClick={onTogglePanel}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--ss-toolbar-hover)] transition-colors"
            title="属性面板"
            style={{ color: 'var(--ss-toolbar-text)' }}
          >
            <PanelRight size={14} />
          </button>
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
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
              <TooltipButton onClick={() => excelInputRef.current?.click()} icon={<Upload size={16} />} label="Excel" title="导入 Excel (.xlsx/.xls)" variant="both" />
            </Group>
            <Divider />
            <Group title="导出">
              <TooltipButton onClick={handleExportCSV} icon={<Download size={16} />} label="CSV" title="导出 CSV" variant="both" />
              <TooltipButton onClick={handleExportJSON} icon={<Download size={16} />} label="JSON" title="导出 JSON" variant="both" />
              <TooltipButton onClick={handleExportExcel} icon={<Download size={16} />} label="Excel" title="导出 Excel (.xlsx)" variant="both" />
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
              <TooltipButton onClick={() => store.getState().applyNumberFormat({ type: 'currency', decimalPlaces: 2, currencySymbol: '¥' })} icon={<DollarSign size={16} />} title="货币" />
              <TooltipButton onClick={() => store.getState().applyNumberFormat({ type: 'date' })} icon={<Calendar size={16} />} title="日期" />
            </Group>
            <Divider />
            <Group title="清除">
              <TooltipButton onClick={handleClear} icon={<Eraser size={16} />} title="清除内容" />
              <TooltipButton onClick={() => store.getState().clearFormatSelection()} icon={<Eraser size={16} />} label="格式" title="清除格式" variant="both" />
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

        {activeTab === 'view' && (
          <>
            <Group title="冻结">
              <TooltipButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(1); }} icon={<Lock size={16} />} title="冻结首行首列" />
              <TooltipButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(0); }} icon={<Lock size={16} />} label="首行" title="冻结首行" variant="both" />
              <TooltipButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(1); }} icon={<Lock size={16} />} label="首列" title="冻结首列" variant="both" />
              <TooltipButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(0); }} icon={<Unlock size={16} />} title="取消冻结" />
            </Group>
            <Divider />
            <Group title="排序">
              <TooltipButton onClick={() => store.getState().sortByColumn(selection.startCol, 'asc')} icon={<SortAsc size={16} />} title="升序" />
              <TooltipButton onClick={() => store.getState().sortByColumn(selection.startCol, 'desc')} icon={<SortDesc size={16} />} title="降序" />
            </Group>
          </>
        )}
      </div>
    </div>
  );
}

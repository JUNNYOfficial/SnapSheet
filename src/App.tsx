import { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import FormulaBar from './components/FormulaBar';
import Spreadsheet from './components/Spreadsheet';
import SheetTabs from './components/SheetTabs';
import FindDialog from './components/FindDialog';
import PropertyPanel from './components/PropertyPanel';
import { useSpreadsheetStore } from './store/useSpreadsheetStore';
import { useTheme } from './hooks/useTheme';
import { workbookToJSON, workbookFromJSON } from './utils/json';

const STORAGE_KEY = 'snapsheet_autosave';

export default function App() {
  const [findOpen, setFindOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const store = useSpreadsheetStore;
  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const workbook = workbookFromJSON(saved);
        if (workbook.sheets.length > 0) {
          const firstSheet = workbook.sheets[0];
          if (firstSheet?.name === '设计规范') {
            localStorage.removeItem(STORAGE_KEY);
            return;
          }
          if (firstSheet && firstSheet.cells && firstSheet.cells.size > 0) {
            store.getState().loadWorkbook(workbook);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [store]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = store.subscribe((state) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const json = workbookToJSON(state.workbook);
        localStorage.setItem(STORAGE_KEY, json);
      }, 500);
    });
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [store]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={theme + ' relative flex h-screen w-screen flex-col'} style={{ background: 'var(--ss-toolbar-bg)', color: 'var(--ss-text-secondary)' }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b px-4 py-1.5" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-toolbar-bg)' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded border" style={{ borderColor: 'var(--ss-border-strong)', background: 'var(--ss-header-bg)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--ss-text-primary)' }}>表</span>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight" style={{ color: 'var(--ss-text-primary)' }}>SnapSheet</h1>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--ss-text-tertiary)' }}>电子表格 · 公式计算 · 数据分析</p>
      </div>

      {/* Ribbon 工具栏 */}
      <Toolbar isDark={isDark} onToggleTheme={toggleTheme} onTogglePanel={() => setPanelOpen(!panelOpen)} />

      {/* 公式栏 */}
      <FormulaBar />

      {/* 主工作区 */}
      <div className="relative flex-1 overflow-hidden" style={{ background: 'var(--ss-bg)' }}>
        <Spreadsheet isDark={isDark} />
      </div>

      {/* 底部工作表标签 */}
      <SheetTabs />

      {/* 查找对话框 */}
      <FindDialog open={findOpen} onClose={() => setFindOpen(false)} />

      {/* 右侧属性面板 */}
      <PropertyPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}

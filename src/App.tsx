/**
 * @file App.tsx
 * @description 应用根组件。
 *              组合 Toolbar、FormulaBar、Spreadsheet、SheetTabs、FindDialog、PropertyPanel 等子组件，
 *              并负责自动保存、Ctrl+S/Ctrl+F 快捷键、主题切换等全局行为。
 */

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
import { Save, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'snapsheet_autosave';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export default function App() {
  // #region debug-point C:app-mount
  try {
    fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'electron-white-screen', runId: 'pre', hypothesisId: 'C', location: 'src/App.tsx', msg: '[DEBUG] App component rendered', ts: Date.now() }),
    }).catch(() => {});
  } catch {}
  // #endregion

  /** 查找对话框开关状态 */
  const [findOpen, setFindOpen] = useState(false);
  /** 右侧属性面板开关状态 */
  const [panelOpen, setPanelOpen] = useState(false);
  /** 自动保存状态：已保存/保存中/未保存 */
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const store = useSpreadsheetStore;
  const { theme, toggleTheme, isDark } = useTheme();

  /**
   * 初始化时从 localStorage 读取自动保存的工作簿。
   * 若缓存为示例文档则清空，避免污染用户数据。
   */
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

  /**
   * 自动保存订阅：状态变更后延迟 800ms 序列化工作簿到 localStorage。
   * 超过 4MB 时跳过保存并提示用户。
   */
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const MAX_LOCAL_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB 阈值
    const unsubscribe = store.subscribe((state) => {
      setSaveStatus('unsaved');
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setSaveStatus('saving');
        try {
          const json = workbookToJSON(state.workbook);
          if (json.length > MAX_LOCAL_STORAGE_SIZE) {
            setSaveStatus('unsaved');
            console.warn('[AutoSave] Workbook too large for localStorage, skipped');
            return;
          }
          localStorage.setItem(STORAGE_KEY, json);
          setSaveStatus('saved');
        } catch (err) {
          setSaveStatus('unsaved');
          console.error('[AutoSave] Failed to save workbook:', err);
        }
      }, 800);
    });
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [store]);

  /**
   * 全局快捷键监听：Ctrl/Cmd + F 打开查找，Ctrl/Cmd + S 强制保存。
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        try {
          const json = workbookToJSON(store.getState().workbook);
          if (json.length > 4 * 1024 * 1024) {
            alert('工作簿过大，无法保存到本地存储。建议导出为文件。');
            return;
          }
          localStorage.setItem(STORAGE_KEY, json);
          setSaveStatus('saved');
        } catch (err) {
          alert('保存失败: ' + (err as Error).message);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  /**
   * 开发模式性能测试工具：向 window 暴露 __generateTestData 与 __clearData，
   * 用于在控制台快速生成大量测试数据或清空工作簿。
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__generateTestData = (rows: number, cols: number) => {
      const cells: { row: number; col: number; value: string }[] = [];
      const start = performance.now();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const value = c === 0 ? String(r + 1) : String(Math.round(Math.random() * 1000));
          cells.push({ row: r, col: c, value });
        }
      }
      store.getState().newWorkbook();
      store.getState().setCellsBulk(cells);
      const duration = performance.now() - start;
      console.log(`[Perf] Generated ${rows}×${cols} = ${rows * cols} cells in ${duration.toFixed(2)}ms`);
      return duration;
    };
    (window as unknown as Record<string, unknown>).__clearData = () => {
      store.getState().newWorkbook();
      console.log('[Perf] Workbook cleared');
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__generateTestData;
      delete (window as unknown as Record<string, unknown>).__clearData;
    };
  }, [store]);

  return (
    <div className={theme + ' relative flex h-screen w-screen flex-col overflow-hidden'} style={{ background: 'var(--ss-toolbar-bg)', color: 'var(--ss-text-secondary)' }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-toolbar-bg)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ borderColor: 'var(--ss-border-strong)', background: 'var(--ss-header-bg)', border: '1px solid var(--ss-border-strong)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--ss-text-primary)' }}>S</span>
          </div>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--ss-text-primary)' }}>SnapSheet</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {saveStatus === 'saving' && <Save size={12} className="animate-pulse" style={{ color: 'var(--ss-info)' }} />}
            {saveStatus === 'saved' && <CheckCircle size={12} style={{ color: 'var(--ss-success)' }} />}
            <span className="text-xs" style={{ color: saveStatus === 'saving' ? 'var(--ss-info)' : saveStatus === 'saved' ? 'var(--ss-success)' : 'var(--ss-text-tertiary)' }}>
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '未保存'}
            </span>
          </div>
        </div>
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

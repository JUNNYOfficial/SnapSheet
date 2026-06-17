import Toolbar from './components/Toolbar';
import FormulaBar from './components/FormulaBar';
import Spreadsheet from './components/Spreadsheet';
import SheetTabs from './components/SheetTabs';

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-gray-100">
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20">
            <span className="text-sm font-bold text-white">📊</span>
          </div>
          <div className="text-white">
            <h1 className="text-lg font-bold leading-tight">SnapSheet</h1>
            <p className="text-xs opacity-80">高性能电子表格 · 公式计算 · AI 辅助分析</p>
          </div>
        </div>
      </div>
      <Toolbar />
      <FormulaBar />
      <Spreadsheet />
      <SheetTabs />
    </div>
  );
}

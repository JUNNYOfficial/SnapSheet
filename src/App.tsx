import Toolbar from './components/Toolbar';
import FormulaBar from './components/FormulaBar';
import Spreadsheet from './components/Spreadsheet';
import SheetTabs from './components/SheetTabs';

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-100" style={{ fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}>
      <div className="border-b border-neutral-200 bg-white px-6 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 bg-neutral-50">
            <span className="text-sm text-neutral-800" style={{ fontFamily: 'SimHei, 黑体, sans-serif' }}>表</span>
          </div>
          <div className="text-neutral-800">
            <h1 className="text-lg leading-tight" style={{ fontFamily: 'SimHei, 黑体, sans-serif' }}>SnapSheet</h1>
            <p className="text-xs text-neutral-500">电子表格 · 公式计算 · 数据分析</p>
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

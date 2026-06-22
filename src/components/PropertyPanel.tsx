/**
 * @file components/PropertyPanel.tsx
 * @description 右侧属性面板组件。
 *              提供单元格格式、数据验证、条件格式、合并单元格、AI 公式建议等设置入口。
 */

import { useState, useEffect } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell } from '../utils/cellRef';
import { X, Bold, AlignLeft, AlignCenter, AlignRight, Grid3X3, Paintbrush, Hash, Percent, DollarSign, Calendar, CheckCircle, List, Filter, Wand2, Lock, Unlock, Trash2, Plus, Minus, MessageSquare, Merge, Split } from 'lucide-react';

interface PropertyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type PanelTab = 'format' | 'data' | 'insert' | 'view' | 'ai';

export default function PropertyPanel({ isOpen, onClose }: PropertyPanelProps) {
  const store = useSpreadsheetStore;
  const selection = store((s) => s.selection);
  const [activeTab, setActiveTab] = useState<PanelTab>('format');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleAnalyze = () => {
    const sel = store.getState().selection;
    const sheet = store.getState().getActiveSheet();
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);

    const nums: number[] = [];
    const strs: string[] = [];
    // 按列收集，用于推断数据结构
    const colValues: { numeric: number[]; text: string[] }[] = [];
    for (let c = minCol; c <= maxCol; c++) colValues.push({ numeric: [], text: [] });

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const idx = c - minCol;
        const ref = coordsToCell(r, c);
        const cell = sheet.cells.get(ref);
        if (cell) {
          const val = cell.computed !== undefined ? cell.computed : cell.value;
          const parsed = typeof val === 'number' ? val : parseFloat(val as string);
          if (!isNaN(parsed) && String(val).trim() !== '') {
            nums.push(parsed);
            colValues[idx].numeric.push(parsed);
          } else if (typeof val === 'string' && val.trim() !== '') {
            strs.push(val);
            colValues[idx].text.push(val);
          }
        }
      }
    }

    const totalCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    const range = coordsToCell(minRow, minCol) + ':' + coordsToCell(maxRow, maxCol);
    let result = '';

    if (nums.length === 0 && strs.length === 0) {
      setAiResult('选中区域无数据');
      return;
    }

    result += `区域共 ${totalCells} 个单元格\n`;
    if (nums.length > 0) result += `数值单元格: ${nums.length} 个\n`;
    if (strs.length > 0) result += `文本单元格: ${strs.length} 个\n`;
    result += '\n';

    if (nums.length > 0) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = sum / nums.length;
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      const mx = Math.max(...nums);
      const mn = Math.min(...nums);
      const stdev = Math.sqrt(nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / nums.length);

      result += '【基础统计】\n';
      result += `求和 = ${sum.toFixed(2)}\n`;
      result += `平均值 = ${avg.toFixed(2)}\n`;
      result += `中位数 = ${median.toFixed(2)}\n`;
      result += `最大值 = ${mx}\n`;
      result += `最小值 = ${mn}\n`;
      result += `标准差 = ${stdev.toFixed(2)}\n`;
      result += `计数 = ${nums.length}\n`;
      result += '\n';

      // 智能总结
      const rangeVal = mx - mn;
      const variation = avg !== 0 ? (stdev / Math.abs(avg)) : 0;
      result += '【数据总结】\n';
      result += `共 ${nums.length} 个有效数值，平均值为 ${avg.toFixed(2)}，`;
      if (variation < 0.1) {
        result += '数据分布非常集中；';
      } else if (variation < 0.3) {
        result += '数据分布相对集中；';
      } else {
        result += '数据分布较为分散；';
      }
      if (rangeVal > 0) {
        result += `最大值与最小值相差 ${rangeVal.toFixed(2)}。`;
      }
      result += '\n\n';
    }

    // 图表推荐
    result += '【图表推荐】\n';
    const nonEmptyCols = colValues.filter((c) => c.numeric.length > 0 || c.text.length > 0);
    const textCols = nonEmptyCols.filter((c) => c.text.length >= c.numeric.length);
    const numericCols = nonEmptyCols.filter((c) => c.numeric.length > c.text.length);
    if (textCols.length === 1 && numericCols.length === 1) {
      result += '该数据结构适合用 柱状图/条形图 展示各类别之间的数量对比；';
      const total = numericCols[0].numeric.reduce((a, b) => a + b, 0);
      const allPositive = numericCols[0].numeric.every((v) => v >= 0);
      if (allPositive && total > 0) {
        result += '若各类别相加等于一个整体，也可使用 饼图/环形图 展示占比。';
      }
    } else if (numericCols.length === 1 && textCols.length === 0) {
      result += '单列数值数据适合用 直方图 观察分布，或用 折线图 展示变化趋势。';
    } else if (numericCols.length === 2 && textCols.length === 0) {
      result += '两列数值数据适合用 散点图 观察两个变量之间的相关关系。';
    } else {
      result += '当前数据结构较复杂，建议先用 数据透视/汇总表 整理关键指标后再选择图表。';
    }
    result += '\n\n';

    result += `【建议公式】\n=求和(${range})\n=平均值(${range})\n=最大值(${range})\n=最小值(${range})`;

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
    if (p.includes('求和') || p.includes('sum') || p.includes('加')) formula = '=求和(' + range + ')';
    else if (p.includes('平均') || p.includes('avg') || p.includes('average')) formula = '=平均值(' + range + ')';
    else if (p.includes('最大') || p.includes('max')) formula = '=最大(' + range + ')';
    else if (p.includes('最小') || p.includes('min')) formula = '=最小(' + range + ')';
    else if (p.includes('计数') || p.includes('count')) formula = '=计数(' + range + ')';
    else if (p.includes('中位数') || p.includes('median')) formula = '=中位数(' + range + ')';
    else if (p.includes('众数') || p.includes('mode')) formula = '=众数(' + range + ')';
    else if (p.includes('标准差') || p.includes('stdev')) formula = '=标准差(' + range + ')';
    else if (p.includes('方差') || p.includes('var')) formula = '=方差(' + range + ')';
    else if (p.includes('排名') || p.includes('rank')) formula = '=排名(' + range + ',,0)';

    if (formula) {
      const targetRow = Math.min(sel.endRow + 1, 999);
      store.getState().setCellValue(targetRow, sel.startCol, formula);
      setAiResult('已生成公式: ' + formula + ' 写入 ' + coordsToCell(targetRow, sel.startCol));
      setAiPrompt('');
    } else {
      setAiResult('未能识别请求。请尝试:"求和""平均值""最大值""最小值""计数""中位数""标准差"等关键词。');
    }
  };

  const tabs: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'format', label: '格式', icon: <Paintbrush size={14} /> },
    { id: 'data', label: '数据', icon: <Hash size={14} /> },
    { id: 'insert', label: '插入', icon: <Plus size={14} /> },
    { id: 'view', label: '视图', icon: <Lock size={14} /> },
    { id: 'ai', label: 'AI', icon: <Wand2 size={14} /> },
  ];

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5 px-1" style={{ color: 'var(--ss-header-text)' }}>
        {title}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );

  const PanelButton = ({ onClick, icon, label, disabled, active }: { onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean; active?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150"
      style={{
        color: disabled ? 'var(--ss-header-text)' : active ? 'var(--ss-text-primary)' : 'var(--ss-text-secondary)',
        background: disabled ? 'transparent' : active ? 'var(--ss-selected-bg)' : 'var(--ss-panel-bg)',
        boxShadow: active ? '0 1px 2px var(--ss-backdrop-bg)' : 'none',
      }}
      onMouseEnter={(e) => { if (!disabled && !active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }}
      onMouseLeave={(e) => { if (!disabled && !active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-panel-bg)'; }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left whitespace-nowrap">{label}</span>
    </button>
  );

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'var(--ss-backdrop-bg)', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
      />
      <div
        className="ss-vibrancy-strong fixed top-0 right-0 bottom-0 w-full sm:w-80 md:w-72 border-l z-50 flex flex-col shadow-xl"
        style={{
          borderColor: 'var(--ss-border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--ss-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--ss-text-primary)' }}>
            属性面板
          </span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--ss-hover-bg)] transition-colors"
            style={{ color: 'var(--ss-header-text)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: 'var(--ss-border)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs relative transition-colors hover:bg-[var(--ss-hover-bg)]"
              style={{
                color: activeTab === tab.id ? 'var(--ss-text-primary)' : 'var(--ss-header-text)',
              }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: 'var(--ss-selected-border)' }}
                />
              )}
            </button>
          ))}
        </div>

        <div
          className="flex-1 overflow-y-auto px-3 py-4"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--ss-header-text) transparent',
          }}
        >
          {activeTab === 'format' && (
            <>
              <Section title="对齐方式">
                <PanelButton onClick={() => store.getState().applyStyleToSelection({ align: 'left' })} icon={<AlignLeft size={14} />} label="左对齐" />
                <PanelButton onClick={() => store.getState().applyStyleToSelection({ align: 'center' })} icon={<AlignCenter size={14} />} label="居中" />
                <PanelButton onClick={() => store.getState().applyStyleToSelection({ align: 'right' })} icon={<AlignRight size={14} />} label="右对齐" />
              </Section>

              <Section title="字体样式">
                <PanelButton onClick={() => {
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
                }} icon={<Bold size={14} />} label="加粗" />
              </Section>

              <Section title="边框">
                <PanelButton onClick={() => store.getState().applyBorderSelection('all')} icon={<Grid3X3 size={14} />} label="全部边框" />
                <PanelButton onClick={() => store.getState().applyBorderSelection('top')} icon={<span className="text-xs">上</span>} label="上边框" />
                <PanelButton onClick={() => store.getState().applyBorderSelection('bottom')} icon={<span className="text-xs">下</span>} label="下边框" />
                <PanelButton onClick={() => store.getState().applyBorderSelection('left')} icon={<span className="text-xs">左</span>} label="左边框" />
                <PanelButton onClick={() => store.getState().applyBorderSelection('right')} icon={<span className="text-xs">右</span>} label="右边框" />
                <PanelButton onClick={() => store.getState().applyBorderSelection('none')} icon={<X size={14} />} label="清除边框" />
              </Section>

              <Section title="背景色">
                <PanelButton onClick={() => store.getState().applyStyleToSelection({ bgColor: '#f5f5f5' })} icon={<span className="w-3 h-3 rounded-sm border" style={{ background: '#f5f5f5', borderColor: 'var(--ss-border-strong)' }} />} label="浅灰" />
                <PanelButton onClick={() => store.getState().applyStyleToSelection({ bgColor: '#e5e5e5' })} icon={<span className="w-3 h-3 rounded-sm border" style={{ background: '#e5e5e5', borderColor: 'var(--ss-border-strong)' }} />} label="中灰" />
                <PanelButton onClick={() => store.getState().applyStyleToSelection({ bgColor: '#262626', color: '#ffffff' })} icon={<span className="w-3 h-3 rounded-sm border" style={{ background: '#262626', borderColor: 'var(--ss-border-strong)' }} />} label="黑底白字" />
                <PanelButton onClick={() => store.getState().applyStyleToSelection({ bgColor: undefined })} icon={<X size={14} />} label="清除背景" />
              </Section>

              <Section title="数字格式">
                <PanelButton onClick={() => store.getState().applyNumberFormat(null)} icon={<span className="text-xs">常规</span>} label="常规格式" />
                <PanelButton onClick={() => store.getState().applyNumberFormat({ type: 'number', decimalPlaces: 2 })} icon={<Hash size={14} />} label="数字" />
                <PanelButton onClick={() => store.getState().applyNumberFormat({ type: 'percentage', decimalPlaces: 0 })} icon={<Percent size={14} />} label="百分比" />
                <PanelButton onClick={() => store.getState().applyNumberFormat({ type: 'currency', decimalPlaces: 2, currencySymbol: '¥' })} icon={<DollarSign size={14} />} label="货币" />
                <PanelButton onClick={() => store.getState().applyNumberFormat({ type: 'date' })} icon={<Calendar size={14} />} label="日期" />
              </Section>
            </>
          )}

          {activeTab === 'data' && (
            <>
              <Section title="快速验证">
                <PanelButton
                  onClick={() => {
                    const sel = store.getState().selection;
                    for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                      for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                        store.getState().setCellValidation(r, c, { type: 'number', operator: 'between', formula1: '0', formula2: '100', errorMessage: '请输入 0 到 100 之间的数字' });
                      }
                    }
                  }}
                  icon={<CheckCircle size={14} />}
                  label="成绩 0-100"
                />
                <PanelButton
                  onClick={() => {
                    const sel = store.getState().selection;
                    for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                      for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                        store.getState().setCellValidation(r, c, { type: 'number', operator: 'greaterThan', formula1: '0', errorMessage: '请输入大于 0 的数字' });
                      }
                    }
                  }}
                  icon={<CheckCircle size={14} />}
                  label="正整数"
                />
                <PanelButton
                  onClick={() => {
                    const sel = store.getState().selection;
                    const input = window.prompt('输入下拉选项，用逗号分隔：', '男,女');
                    if (input === null) return;
                    const list = input.split(',').map(s => s.trim()).filter(Boolean);
                    if (list.length === 0) return;
                    for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                      for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                        store.getState().setCellValidation(r, c, { type: 'list', list, errorMessage: `请选择：${list.join('、')}` });
                      }
                    }
                  }}
                  icon={<List size={14} />}
                  label="下拉选项"
                />
                <PanelButton
                  onClick={() => {
                    const sel = store.getState().selection;
                    for (let r = Math.min(sel.startRow, sel.endRow); r <= Math.max(sel.startRow, sel.endRow); r++) {
                      for (let c = Math.min(sel.startCol, sel.endCol); c <= Math.max(sel.startCol, sel.endCol); c++) {
                        store.getState().clearCellValidation(r, c);
                      }
                    }
                  }}
                  icon={<Trash2 size={14} />}
                  label="清除验证"
                />
              </Section>

              <Section title="数据清洗">
                <PanelButton
                  onClick={() => {
                    const sel = store.getState().selection;
                    const sheet = store.getState().getActiveSheet();
                    const minRow = Math.min(sel.startRow, sel.endRow);
                    const maxRow = Math.max(sel.startRow, sel.endRow);
                    const minCol = Math.min(sel.startCol, sel.endCol);
                    const maxCol = Math.max(sel.startCol, sel.endCol);
                    const seen = new Set<string>();
                    const duplicates: number[] = [];
                    for (let r = minRow; r <= maxRow; r++) {
                      const keyParts: string[] = [];
                      for (let c = minCol; c <= maxCol; c++) {
                        const ref = coordsToCell(r, c);
                        const cell = sheet.cells.get(ref);
                        keyParts.push(cell ? (cell.computed !== undefined ? String(cell.computed) : cell.value) : '');
                      }
                      const key = keyParts.join('|');
                      if (seen.has(key)) duplicates.push(r);
                      else seen.add(key);
                    }
                    if (duplicates.length === 0) {
                      setAiResult('选中区域内未检测到重复行');
                      return;
                    }
                    duplicates.sort((a, b) => b - a).forEach((r) => store.getState().deleteRow(r));
                    setAiResult(`已删除 ${duplicates.length} 行重复数据`);
                  }}
                  icon={<Trash2 size={14} />}
                  label="删除重复行"
                />
                <PanelButton
                  onClick={() => {
                    const sel = store.getState().selection;
                    const fillValue = window.prompt('用以下值填充空白单元格：', '0');
                    if (fillValue === null) return;
                    const cells: { row: number; col: number; value: string }[] = [];
                    const minRow = Math.min(sel.startRow, sel.endRow);
                    const maxRow = Math.max(sel.startRow, sel.endRow);
                    const minCol = Math.min(sel.startCol, sel.endCol);
                    const maxCol = Math.max(sel.startCol, sel.endCol);
                    const sheet = store.getState().getActiveSheet();
                    for (let r = minRow; r <= maxRow; r++) {
                      for (let c = minCol; c <= maxCol; c++) {
                        const ref = coordsToCell(r, c);
                        const cell = sheet.cells.get(ref);
                        if (!cell || String(cell.value).trim() === '') {
                          cells.push({ row: r, col: c, value: fillValue });
                        }
                      }
                    }
                    if (cells.length === 0) {
                      setAiResult('选中区域内没有空白单元格');
                      return;
                    }
                    store.getState().setCellsBulk(cells);
                    setAiResult(`已填充 ${cells.length} 个空白单元格`);
                  }}
                  icon={<CheckCircle size={14} />}
                  label="填充空白值"
                />
                <PanelButton
                  onClick={() => {
                    const sel = store.getState().selection;
                    store.getState().addConditionalFormat({
                      range: { startRow: Math.min(sel.startRow, sel.endRow), startCol: Math.min(sel.startCol, sel.endCol), endRow: Math.max(sel.startRow, sel.endRow), endCol: Math.max(sel.startCol, sel.endCol) },
                      type: 'value',
                      condition: 'equalTo',
                      value: '',
                      bgColor: '#ffefc1',
                    });
                    setAiResult('已用浅黄色高亮空白单元格');
                  }}
                  icon={<Filter size={14} />}
                  label="标记空值"
                />
              </Section>

              <Section title="条件格式">
                <PanelButton
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
                  icon={<Filter size={14} />}
                  label="高亮大于某值"
                />
              </Section>

              <Section title="排序">
                <PanelButton onClick={() => store.getState().sortByColumn(selection.startCol, 'asc')} icon={<span className="text-xs">↑</span>} label="升序" />
                <PanelButton onClick={() => store.getState().sortByColumn(selection.startCol, 'desc')} icon={<span className="text-xs">↓</span>} label="降序" />
              </Section>
            </>
          )}

          {activeTab === 'insert' && (
            <>
              <Section title="单元格操作">
                <PanelButton onClick={() => store.getState().mergeCells()} icon={<Merge size={14} />} label="合并单元格" />
                <PanelButton onClick={() => store.getState().unmergeCells()} icon={<Split size={14} />} label="取消合并" />
              </Section>

              <Section title="批注">
                <PanelButton
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
                  icon={<MessageSquare size={14} />}
                  label="添加批注"
                />
              </Section>

              <Section title="插入行列">
                <PanelButton onClick={() => store.getState().insertRow(selection.startRow)} icon={<Plus size={14} />} label="在上方插入行" />
                <PanelButton onClick={() => store.getState().deleteRow(selection.startRow)} icon={<Minus size={14} />} label="删除当前行" />
                <PanelButton onClick={() => store.getState().insertCol(selection.startCol)} icon={<Plus size={14} />} label="在左侧插入列" />
                <PanelButton onClick={() => store.getState().deleteCol(selection.startCol)} icon={<Minus size={14} />} label="删除当前列" />
              </Section>
            </>
          )}

          {activeTab === 'view' && (
            <>
              <Section title="冻结窗格">
                <PanelButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(1); }} icon={<Lock size={14} />} label="冻结首行首列" />
                <PanelButton onClick={() => { store.getState().setFrozenRows(1); store.getState().setFrozenCols(0); }} icon={<Lock size={14} />} label="仅冻结首行" />
                <PanelButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(1); }} icon={<Lock size={14} />} label="仅冻结首列" />
                <PanelButton onClick={() => { store.getState().setFrozenRows(0); store.getState().setFrozenCols(0); }} icon={<Unlock size={14} />} label="取消冻结" />
              </Section>
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <Section title="数据分析">
                <PanelButton onClick={handleAnalyze} icon={<Wand2 size={14} />} label="分析选中区域" />
              </Section>

              <Section title="公式生成">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="输入需求，如：求和、平均值..."
                  className="w-full px-3 py-2 rounded-md border text-sm outline-none mb-2 transition-colors"
                  style={{
                    borderColor: 'var(--ss-border-strong)',
                    background: 'var(--ss-input-bg)',
                    color: 'var(--ss-text-primary)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFormulaGenerate();
                    }
                  }}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--ss-selected-border)'}
                  onBlur={(e) => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--ss-border-strong)'}
                />
                <PanelButton onClick={handleFormulaGenerate} icon={<Wand2 size={14} />} label="生成公式" />
              </Section>

              {aiResult && (
                <Section title="结果">
                  <div className="p-3 rounded-md text-xs whitespace-pre-wrap" style={{ background: 'var(--ss-input-bg)', color: 'var(--ss-text-secondary)' }}>
                    {aiResult}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell } from '../utils/cellRef';
import { X, Bold, AlignLeft, AlignCenter, AlignRight, Grid3X3, Paintbrush, Hash, Percent, DollarSign, Calendar, CheckCircle, List, Filter, Wand2, Lock, Unlock, Trash2, Plus, Minus, MessageSquare, Merge, Split, ChevronLeft, ChevronRight } from 'lucide-react';

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
        className="fixed top-0 right-0 bottom-0 w-72 border-l z-50 flex flex-col shadow-xl"
        style={{
          borderColor: 'var(--ss-border)',
          background: 'var(--ss-toolbar-bg)',
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
              <Section title="数据验证">
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
                  label="0-100 数值验证"
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
                  label="大于 0 验证"
                />
                <PanelButton
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
                  icon={<List size={14} />}
                  label="下拉列表"
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

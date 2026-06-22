/**
 * @file components/ChartDialog.tsx
 * @description 图表插入对话框。
 *              根据当前选区提取类别与数值，支持柱状图、折线图、饼图预览与插入。
 */

import { useMemo, useState } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell, colToLetter } from '../utils/cellRef';
import type { ChartType } from '../types';
import { BarChart3, LineChart, PieChart, X } from 'lucide-react';

interface ChartDialogProps {
  onClose: () => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar', label: '柱状图', icon: <BarChart3 size={18} /> },
  { type: 'line', label: '折线图', icon: <LineChart size={18} /> },
  { type: 'pie', label: '饼图', icon: <PieChart size={18} /> },
];

export default function ChartDialog({ onClose }: ChartDialogProps) {
  const store = useSpreadsheetStore;
  const selection = useSpreadsheetStore((s) => s.selection);
  const sheet = useSpreadsheetStore((s) => s.getActiveSheet());

  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [title, setTitle] = useState('图表');
  const [categoryCol, setCategoryCol] = useState(0);
  const [valueCols, setValueCols] = useState<number[]>(() => {
    const cols: number[] = [];
    for (let c = minCol; c <= maxCol && c !== minCol + categoryCol; c++) {
      cols.push(c - minCol);
    }
    if (cols.length === 0 && maxCol > minCol) cols.push(1);
    return cols;
  });

  const data = useMemo(() => {
    const categories: string[] = [];
    const seriesMap: Record<string, { name: string; values: number[] }> = {};
    for (let c = minCol; c <= maxCol; c++) {
      if (c === minCol + categoryCol) {
        for (let r = minRow + 1; r <= maxRow; r++) {
          const cell = sheet.cells.get(coordsToCell(r, c));
          categories.push(cell ? String(cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : '');
        }
      } else {
        const headerCell = sheet.cells.get(coordsToCell(minRow, c));
        const name = headerCell ? String(headerCell.computed !== undefined && headerCell.formula ? headerCell.computed : headerCell.value) : colToLetter(c);
        const values: number[] = [];
        for (let r = minRow + 1; r <= maxRow; r++) {
          const cell = sheet.cells.get(coordsToCell(r, c));
          const v = cell ? (cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : '';
          values.push(typeof v === 'number' ? v : parseFloat(String(v)) || 0);
        }
        seriesMap[c - minCol] = { name, values };
      }
    }
    const series = valueCols.map((idx) => seriesMap[idx]).filter(Boolean);
    return { categories, series };
  }, [sheet, selection, categoryCol, valueCols]);

  const toggleValueCol = (idx: number) => {
    if (valueCols.includes(idx)) {
      setValueCols(valueCols.filter((i) => i !== idx));
    } else {
      setValueCols([...valueCols, idx].sort((a, b) => a - b));
    }
  };

  const handleInsert = () => {
    const canvas = document.getElementById('spreadsheet-canvas')?.parentElement;
    const rect = canvas?.getBoundingClientRect();
    store.getState().addChart({
      type: chartType,
      title,
      range: { startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol },
      categoryCol,
      valueCols,
      x: 120,
      y: 80,
      width: Math.min(560, (rect?.width || 560) - 160),
      height: 320,
    });
    onClose();
  };

  const availableCols: number[] = [];
  for (let c = minCol; c <= maxCol; c++) availableCols.push(c - minCol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="max-h-[90vh] w-[640px] overflow-auto rounded-xl border p-5 shadow-2xl" style={{ background: 'var(--ss-panel-bg)', borderColor: 'var(--ss-border)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--ss-text-primary)' }}>插入图表</h2>
          <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-[var(--ss-hover-bg)]" style={{ color: 'var(--ss-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs" style={{ color: 'var(--ss-text-secondary)' }}>图表标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--ss-border-strong)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-primary)' }}
          />
        </div>

        <div className="mb-4 flex gap-2">
          {CHART_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => setChartType(t.type)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: chartType === t.type ? 'var(--ss-selected-border)' : 'var(--ss-border)',
                background: chartType === t.type ? 'var(--ss-hover-bg)' : 'var(--ss-bg)',
                color: 'var(--ss-text-primary)',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--ss-text-secondary)' }}>类别列</label>
            <select
              value={categoryCol}
              onChange={(e) => setCategoryCol(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--ss-border-strong)', background: 'var(--ss-input-bg)', color: 'var(--ss-text-primary)' }}
            >
              {availableCols.map((idx) => {
                const c = minCol + idx;
                const cell = sheet.cells.get(coordsToCell(minRow, c));
                const label = cell ? String(cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : colToLetter(c);
                return <option key={idx} value={idx}>{colToLetter(c)} - {label}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--ss-text-secondary)' }}>数值列</label>
            <div className="flex flex-wrap gap-2 rounded-lg border p-2" style={{ borderColor: 'var(--ss-border-strong)', background: 'var(--ss-input-bg)' }}>
              {availableCols.filter((idx) => idx !== categoryCol).map((idx) => {
                const c = minCol + idx;
                const cell = sheet.cells.get(coordsToCell(minRow, c));
                const label = cell ? String(cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : colToLetter(c);
                return (
                  <label key={idx} className="flex items-center gap-1 text-xs" style={{ color: 'var(--ss-text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={valueCols.includes(idx)}
                      onChange={() => toggleValueCol(idx)}
                      className="h-3.5 w-3.5 rounded border accent-[var(--ss-selected-border)]"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-lg border p-3" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-bg)' }}>
          <ChartPreview type={chartType} title={title} categories={data.categories} series={data.series} />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:bg-[var(--ss-hover-bg)]"
            style={{ borderColor: 'var(--ss-border)', color: 'var(--ss-text-primary)' }}
          >
            取消
          </button>
          <button
            onClick={handleInsert}
            className="rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors"
            style={{ background: 'var(--ss-selected-border)' }}
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}

interface ChartPreviewProps {
  type: ChartType;
  title: string;
  categories: string[];
  series: { name: string; values: number[] }[];
}

function ChartPreview({ type, title, categories, series }: ChartPreviewProps) {
  const width = 560;
  const height = 280;
  const padding = { top: 32, right: 24, bottom: 56, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const valueRange = maxValue - minValue || 1;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (series.length === 0 || categories.length === 0) {
    return <div className="flex h-[280px] items-center justify-center text-xs" style={{ color: 'var(--ss-text-secondary)' }}>请选择数据范围</div>;
  }

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minValue + (valueRange * i) / yTicks);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <text x={width / 2} y={18} textAnchor="middle" style={{ fill: 'var(--ss-text-primary)', fontSize: 14, fontWeight: 600 }}>{title}</text>

      {/* axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="var(--ss-border-strong)" />
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--ss-border-strong)" />

      {/* y ticks */}
      {yTickValues.map((v, i) => {
        const y = height - padding.bottom - ((v - minValue) / valueRange) * chartHeight;
        return (
          <g key={i}>
            <line x1={padding.left - 4} y1={y} x2={padding.left} y2={y} stroke="var(--ss-border-strong)" />
            <text x={padding.left - 8} y={y + 3} textAnchor="end" style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>{v.toFixed(0)}</text>
          </g>
        );
      })}

      {type === 'bar' && (
        <g>
          {categories.map((cat, i) => {
            const groupWidth = chartWidth / categories.length;
            const barWidth = groupWidth / (series.length + 1);
            return (
              <g key={i}>
                {series.map((s, j) => {
                  const v = s.values[i] || 0;
                  const barHeight = ((v - minValue) / valueRange) * chartHeight;
                  const x = padding.left + i * groupWidth + (j + 0.5) * barWidth;
                  const y = height - padding.bottom - barHeight;
                  return <rect key={j} x={x} y={y} width={barWidth * 0.8} height={barHeight} fill={colors[j % colors.length]} rx={2} />;
                })}
                <text x={padding.left + i * groupWidth + groupWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>{cat}</text>
              </g>
            );
          })}
        </g>
      )}

      {type === 'line' && (
        <g>
          {series.map((s, j) => {
            const points = s.values.map((v, i) => {
              const x = padding.left + (i + 0.5) * (chartWidth / categories.length);
              const y = height - padding.bottom - ((v - minValue) / valueRange) * chartHeight;
              return `${x},${y}`;
            }).join(' ');
            return (
              <g key={j}>
                <polyline points={points} fill="none" stroke={colors[j % colors.length]} strokeWidth={2} />
                {s.values.map((v, i) => {
                  const x = padding.left + (i + 0.5) * (chartWidth / categories.length);
                  const y = height - padding.bottom - ((v - minValue) / valueRange) * chartHeight;
                  return <circle key={i} cx={x} cy={y} r={3} fill={colors[j % colors.length]} />;
                })}
              </g>
            );
          })}
          {categories.map((cat, i) => (
            <text key={i} x={padding.left + (i + 0.5) * (chartWidth / categories.length)} y={height - padding.bottom + 16} textAnchor="middle" style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>{cat}</text>
          ))}
        </g>
      )}

      {type === 'pie' && (
        <g>
          {(() => {
            const s = series[0];
            const total = s.values.reduce((a, b) => a + b, 0) || 1;
            const cx = padding.left + chartWidth / 2;
            const cy = padding.top + chartHeight / 2;
            const radius = Math.min(chartWidth, chartHeight) / 2 - 16;
            let startAngle = 0;
            return s.values.map((v, i) => {
              const angle = (v / total) * Math.PI * 2;
              const endAngle = startAngle + angle;
              const x1 = cx + radius * Math.cos(startAngle);
              const y1 = cy + radius * Math.sin(startAngle);
              const x2 = cx + radius * Math.cos(endAngle);
              const y2 = cy + radius * Math.sin(endAngle);
              const largeArc = angle > Math.PI ? 1 : 0;
              const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
              startAngle = endAngle;
              return <path key={i} d={path} fill={colors[i % colors.length]} stroke="var(--ss-bg)" strokeWidth={1} />;
            });
          })()}
        </g>
      )}

      {/* legend */}
      <g transform={`translate(${width - padding.right - 100}, ${padding.top})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(0, ${i * 16})`}>
            <rect x={0} y={0} width={10} height={10} fill={colors[i % colors.length]} rx={2} />
            <text x={14} y={9} style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>{s.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * @file components/ChartRenderer.tsx
 * @description 通用 SVG 图表渲染组件。
 *              根据图表配置和从工作表提取的数据渲染柱状图、折线图或饼图。
 */

import type { Chart } from '../types';

interface ChartRendererProps {
  chart: Chart;
  categories: string[];
  series: { name: string; values: number[] }[];
}

export default function ChartRenderer({ chart, categories, series }: ChartRendererProps) {
  const { type, title, width, height } = chart;
  const padding = { top: 36, right: 24, bottom: 56, left: 56 };
  const chartWidth = Math.max(40, width - padding.left - padding.right);
  const chartHeight = Math.max(40, height - padding.top - padding.bottom);

  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const valueRange = maxValue - minValue || 1;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (series.length === 0 || categories.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: 'var(--ss-text-secondary)' }}>
        无数据
      </div>
    );
  }

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minValue + (valueRange * i) / yTicks);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <rect width={width} height={height} fill="transparent" />
      <text x={width / 2} y={22} textAnchor="middle" style={{ fill: 'var(--ss-text-primary)', fontSize: 14, fontWeight: 600 }}>
        {title}
      </text>

      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="var(--ss-border-strong)" />
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--ss-border-strong)" />

      {yTickValues.map((v, i) => {
        const y = height - padding.bottom - ((v - minValue) / valueRange) * chartHeight;
        return (
          <g key={i}>
            <line x1={padding.left - 4} y1={y} x2={padding.left} y2={y} stroke="var(--ss-border-strong)" />
            <text x={padding.left - 8} y={y + 3} textAnchor="end" style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
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
                <text x={padding.left + i * groupWidth + groupWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>
                  {cat}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {type === 'line' && (
        <g>
          {series.map((s, j) => {
            const points = s.values
              .map((v, i) => {
                const x = padding.left + (i + 0.5) * (chartWidth / categories.length);
                const y = height - padding.bottom - ((v - minValue) / valueRange) * chartHeight;
                return `${x},${y}`;
              })
              .join(' ');
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
            <text key={i} x={padding.left + (i + 0.5) * (chartWidth / categories.length)} y={height - padding.bottom + 16} textAnchor="middle" style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>
              {cat}
            </text>
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

      <g transform={`translate(${width - padding.right - 90}, ${padding.top})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(0, ${i * 16})`}>
            <rect x={0} y={0} width={10} height={10} fill={colors[i % colors.length]} rx={2} />
            <text x={14} y={9} style={{ fill: 'var(--ss-text-secondary)', fontSize: 10 }}>
              {s.name}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

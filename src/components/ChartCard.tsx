/**
 * @file components/ChartCard.tsx
 * @description 工作表上的图表卡片组件。
 *              根据图表配置读取数据并渲染，支持关闭。
 */

import { useMemo } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell } from '../utils/cellRef';
import ChartRenderer from './ChartRenderer';
import { X } from 'lucide-react';
import type { Chart } from '../types';

interface ChartCardProps {
  chart: Chart;
}

export default function ChartCard({ chart }: ChartCardProps) {
  const sheet = useSpreadsheetStore((s) => s.getActiveSheet());
  const removeChart = useSpreadsheetStore((s) => s.removeChart);

  const { categories, series } = useMemo(() => {
    const { range, categoryCol, valueCols } = chart;
    const cats: string[] = [];
    for (let r = range.startRow + 1; r <= range.endRow; r++) {
      const cell = sheet.cells.get(coordsToCell(r, range.startCol + categoryCol));
      cats.push(cell ? String(cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : '');
    }
    const seriesList = valueCols.map((idx) => {
      const c = range.startCol + idx;
      const headerCell = sheet.cells.get(coordsToCell(range.startRow, c));
      const name = headerCell ? String(headerCell.computed !== undefined && headerCell.formula ? headerCell.computed : headerCell.value) : '';
      const values: number[] = [];
      for (let r = range.startRow + 1; r <= range.endRow; r++) {
        const cell = sheet.cells.get(coordsToCell(r, c));
        const v = cell ? (cell.computed !== undefined && cell.formula ? cell.computed : cell.value) : '';
        values.push(typeof v === 'number' ? v : parseFloat(String(v)) || 0);
      }
      return { name, values };
    });
    return { categories: cats, series: seriesList };
  }, [chart, sheet]);

  return (
    <div
      className="absolute rounded-xl border p-3 shadow-xl"
      style={{
        left: chart.x,
        top: chart.y,
        width: chart.width,
        height: chart.height,
        borderColor: 'var(--ss-border)',
        background: 'var(--ss-panel-bg)',
      }}
    >
      <button
        onClick={() => removeChart(chart.id)}
        className="absolute right-2 top-2 rounded p-1 transition-colors hover:bg-[var(--ss-hover-bg)]"
        style={{ color: 'var(--ss-text-secondary)' }}
        title="删除图表"
      >
        <X size={14} />
      </button>
      <ChartRenderer chart={chart} categories={categories} series={series} />
    </div>
  );
}

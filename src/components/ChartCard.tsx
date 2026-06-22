/**
 * @file components/ChartCard.tsx
 * @description 工作表上的图表卡片组件。
 *              支持拖拽移动、缩放、双击编辑和删除。
 */

import { useMemo, useRef, useCallback } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { coordsToCell } from '../utils/cellRef';
import ChartRenderer from './ChartRenderer';
import { X, Move } from 'lucide-react';
import type { Chart } from '../types';

interface ChartCardProps {
  chart: Chart;
  onEdit: (chart: Chart) => void;
}

const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;

export default function ChartCard({ chart, onEdit }: ChartCardProps) {
  const sheet = useSpreadsheetStore((s) => s.getActiveSheet());
  const updateChart = useSpreadsheetStore((s) => s.updateChart);
  const removeChart = useSpreadsheetStore((s) => s.removeChart);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: 'move' | 'resize'; startX: number; startY: number; startX0: number; startY0: number; startW: number; startH: number } | null>(null);

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

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startX0: chart.x,
      startY0: chart.y,
      startW: chart.width,
      startH: chart.height,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      if (drag.type === 'move') {
        updateChart(chart.id, { x: Math.max(0, drag.startX0 + dx), y: Math.max(0, drag.startY0 + dy) });
      } else {
        updateChart(chart.id, {
          width: Math.max(MIN_WIDTH, drag.startW + dx),
          height: Math.max(MIN_HEIGHT, drag.startH + dy),
        });
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [chart, updateChart]);

  return (
    <div
      ref={containerRef}
      className="absolute rounded-xl border p-3 shadow-xl"
      style={{
        left: chart.x,
        top: chart.y,
        width: chart.width,
        height: chart.height,
        borderColor: 'var(--ss-border)',
        background: 'var(--ss-panel-bg)',
      }}
      onDoubleClick={() => onEdit(chart)}
    >
      <div
        className="absolute left-0 right-0 top-0 flex h-7 cursor-move items-center rounded-t-xl px-2"
        onMouseDown={(e) => handleMouseDown(e, 'move')}
        style={{ background: 'var(--ss-hover-bg)' }}
      >
        <Move size={12} style={{ color: 'var(--ss-text-secondary)' }} />
        <span className="ml-1.5 flex-1 truncate text-xs" style={{ color: 'var(--ss-text-secondary)' }}>
          {chart.title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeChart(chart.id);
          }}
          className="rounded p-0.5 transition-colors hover:bg-[var(--ss-bg)]"
          style={{ color: 'var(--ss-text-secondary)' }}
          title="删除图表"
        >
          <X size={14} />
        </button>
      </div>
      <div className="h-full w-full pt-6">
        <ChartRenderer chart={chart} categories={categories} series={series} />
      </div>
      <div
        className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
        style={{ background: 'var(--ss-text-secondary)', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
        title="缩放"
      />
    </div>
  );
}

/**
 * @file components/AutoFilterDropdown.tsx
 * @description 自动筛选下拉菜单组件。
 *              列出指定列的所有唯一值，用户可通过勾选控制显示/隐藏对应行。
 */

import { useMemo } from 'react';

interface AutoFilterDropdownProps {
  col: number;
  allValues: string[];
  visibleValues: string[];
  position: { left: number; top: number; width: number; height: number };
  onChange: (visibleValues: string[]) => void;
  onClose: () => void;
}

export default function AutoFilterDropdown({
  allValues,
  visibleValues,
  position,
  onChange,
  onClose,
}: AutoFilterDropdownProps) {
  const visibleSet = useMemo(() => new Set(visibleValues), [visibleValues]);

  const toggleValue = (value: string) => {
    if (visibleSet.has(value)) {
      onChange(visibleValues.filter((v) => v !== value));
    } else {
      onChange([...visibleValues, value]);
    }
  };

  const allChecked = visibleValues.length === allValues.length && allValues.length > 0;
  const someChecked = visibleValues.length > 0 && visibleValues.length < allValues.length;

  const toggleAll = () => {
    if (allChecked) {
      onChange([]);
    } else {
      onChange([...allValues]);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed z-50 max-h-72 min-w-[140px] overflow-auto rounded-lg border py-1 shadow-xl"
        style={{
          left: position.left,
          top: position.top + position.height + 2,
          borderColor: 'var(--ss-border)',
          background: 'var(--ss-panel-bg)',
        }}
      >
        <label
          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
          style={{ color: 'var(--ss-text-primary)' }}
        >
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={toggleAll}
            className="h-3.5 w-3.5 rounded border accent-[var(--ss-selected-border)]"
            style={{ borderColor: 'var(--ss-border-strong)' }}
          />
          全选
        </label>
        <div className="my-1 h-px" style={{ background: 'var(--ss-border-light)' }} />
        {allValues.length === 0 ? (
          <div className="px-3 py-2 text-xs" style={{ color: 'var(--ss-text-secondary)' }}>
            无数据
          </div>
        ) : (
          allValues.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--ss-hover-bg)]"
              style={{ color: 'var(--ss-text-primary)' }}
            >
              <input
                type="checkbox"
                checked={visibleSet.has(value)}
                onChange={() => toggleValue(value)}
                className="h-3.5 w-3.5 rounded border accent-[var(--ss-selected-border)]"
                style={{ borderColor: 'var(--ss-border-strong)' }}
              />
              <span className="truncate">{value === '' ? '(空白)' : value}</span>
            </label>
          ))
        )}
      </div>
    </>
  );
}

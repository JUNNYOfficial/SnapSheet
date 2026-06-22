/**
 * @file components/FormulaAutocomplete.tsx
 * @description 公式编辑时的函数自动补全浮层。
 *              当用户在编辑框中输入以等号开头的公式时，列出匹配的函数名称。
 */

import { useMemo, useState, useEffect, useRef } from 'react';

const FUNCTIONS = [
  { name: 'SUM', desc: '求和' },
  { name: 'AVERAGE', desc: '平均值' },
  { name: 'MAX', desc: '最大值' },
  { name: 'MIN', desc: '最小值' },
  { name: 'COUNT', desc: '计数' },
  { name: 'COUNTA', desc: '非空计数' },
  { name: 'COUNTBLANK', desc: '空值计数' },
  { name: 'MEDIAN', desc: '中位数' },
  { name: 'MODE', desc: '众数' },
  { name: 'VAR', desc: '样本方差' },
  { name: 'STDEV', desc: '样本标准差' },
  { name: 'RANK', desc: '排名' },
  { name: 'PERCENTILE', desc: '百分位' },
  { name: 'QUARTILE', desc: '四分位' },
  { name: 'ROUND', desc: '四舍五入' },
  { name: 'ROUNDUP', desc: '向上舍入' },
  { name: 'ROUNDDOWN', desc: '向下舍入' },
  { name: 'ABS', desc: '绝对值' },
  { name: 'INT', desc: '向下取整' },
  { name: 'CEILING', desc: '向上取整到指定倍数' },
  { name: 'FLOOR', desc: '向下取整到指定倍数' },
  { name: 'MOD', desc: '取余' },
  { name: 'PI', desc: '圆周率' },
  { name: 'RAND', desc: '随机小数' },
  { name: 'RANDBETWEEN', desc: '随机整数' },
  { name: 'POWER', desc: '幂运算' },
  { name: 'SQRT', desc: '平方根' },
  { name: 'IF', desc: '条件判断' },
  { name: 'IFERROR', desc: '错误时返回指定值' },
  { name: 'IFNA', desc: 'N/A 时返回指定值' },
  { name: 'AND', desc: '逻辑与' },
  { name: 'OR', desc: '逻辑或' },
  { name: 'NOT', desc: '逻辑非' },
  { name: 'XOR', desc: '逻辑异或' },
  { name: 'CHOOSE', desc: '按索引选择' },
  { name: 'SWITCH', desc: '多条件匹配' },
  { name: 'CONCAT', desc: '连接文本' },
  { name: 'LEFT', desc: '左侧截取' },
  { name: 'RIGHT', desc: '右侧截取' },
  { name: 'MID', desc: '中间截取' },
  { name: 'LEN', desc: '文本长度' },
  { name: 'TRIM', desc: '去除首尾空格' },
  { name: 'UPPER', desc: '转大写' },
  { name: 'LOWER', desc: '转小写' },
  { name: 'FIND', desc: '查找文本位置' },
  { name: 'SUBSTITUTE', desc: '替换文本' },
  { name: 'TEXT', desc: '格式化文本' },
  { name: 'TODAY', desc: '今天日期' },
  { name: 'NOW', desc: '当前日期时间' },
  { name: 'DATE', desc: '构造日期' },
  { name: 'YEAR', desc: '年份' },
  { name: 'MONTH', desc: '月份' },
  { name: 'DAY', desc: '日期' },
  { name: 'WEEKDAY', desc: '星期' },
  { name: 'DATEDIF', desc: '日期间隔' },
  { name: 'COUNTIF', desc: '按条件计数' },
  { name: 'SUMIF', desc: '按条件求和' },
  { name: 'AVERAGEIF', desc: '按条件平均' },
  { name: 'COUNTIFS', desc: '多条件计数' },
  { name: 'SUMIFS', desc: '多条件求和' },
  { name: 'AVERAGEIFS', desc: '多条件平均' },
  { name: 'VLOOKUP', desc: '纵向查找' },
  { name: 'HLOOKUP', desc: '横向查找' },
  { name: 'MATCH', desc: '返回匹配位置' },
  { name: 'INDEX', desc: '按行列取单元格' },
  { name: 'XLOOKUP', desc: '灵活查找' },
  { name: 'SUMPRODUCT', desc: '数组乘积和' },
  { name: 'OFFSET', desc: '偏移引用' },
  { name: 'INDIRECT', desc: '间接引用' },
];

interface FormulaAutocompleteProps {
  value: string;
  caret: number;
  inputRect?: DOMRect;
  onSelect: (insert: string, replaceLength: number) => void;
}

export default function FormulaAutocomplete({ value, caret, inputRect, onSelect }: FormulaAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { token, items } = useMemo(() => {
    if (!value.startsWith('=')) return { token: '', items: [] };
    const before = value.slice(0, caret);
    const match = before.match(/[A-Za-z\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5]*$/);
    const token = match ? match[0] : '';
    if (!token) return { token: '', items: [] };
    const lower = token.toLowerCase();
    const items = FUNCTIONS.filter((f) => f.name.toLowerCase().startsWith(lower)).slice(0, 8);
    return { token, items };
  }, [value, caret]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [token]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (items.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSelectedIndex((i) => (i + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopImmediatePropagation();
        const item = items[selectedIndex];
        if (item) onSelect(`${item.name}(`, token.length);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [items, selectedIndex, onSelect, token.length]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (items.length === 0 || !inputRect) return null;

  return (
    <div
      ref={listRef}
      className="fixed z-50 max-h-60 overflow-auto rounded-lg border py-1 shadow-xl"
      style={{
        left: inputRect.left,
        top: inputRect.bottom + 4,
        minWidth: inputRect.width,
        borderColor: 'var(--ss-border)',
        background: 'var(--ss-panel-bg)',
      }}
    >
      {items.map((item, idx) => (
        <button
          key={item.name}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(`${item.name}(`, token.length);
          }}
          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors"
          style={{
            background: idx === selectedIndex ? 'var(--ss-hover-bg)' : 'transparent',
            color: 'var(--ss-text-primary)',
          }}
        >
          <span className="font-medium">{item.name}</span>
          <span style={{ color: 'var(--ss-text-secondary)' }}>{item.desc}</span>
        </button>
      ))}
    </div>
  );
}

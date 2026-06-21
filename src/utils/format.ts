import type { NumberFormat } from '../types';

export function formatNumber(value: string, format: NumberFormat | undefined): string {
  if (!format || format.type === 'general') return value;

  if (format.type === 'custom' && format.pattern) {
    return applyCustomFormat(value, format.pattern);
  }

  if (format.type === 'date') {
    const date = parseDate(value);
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return value;
  }

  if (format.type === 'time') {
    const date = parseDate(value);
    if (date) {
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      return `${h}:${min}:${s}`;
    }
    return value;
  }

  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const decimals = format.decimalPlaces ?? 2;
  if (format.type === 'percentage') return (num * 100).toFixed(decimals) + '%';
  if (format.type === 'number') return num.toFixed(decimals);
  if (format.type === 'currency') {
    const symbol = format.currencySymbol || '¥';
    return symbol + num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return value;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  // 优先尝试标准日期字符串解析
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime()) && (value.includes('-') || value.includes('/') || value.includes(':'))) {
    return parsed;
  }
  // 再尝试 Excel 日期序列号
  const num = parseFloat(value);
  if (!isNaN(num) && num > 0 && num < 50000) {
    const date = new Date(1900, 0, num - 1);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

function applyCustomFormat(value: string, pattern: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) {
    // If not a number, try date formatting
    const date = parseDate(value);
    if (date) return formatDatePattern(date, pattern);
    return value;
  }
  return formatNumberPattern(num, pattern);
}

function formatNumberPattern(num: number, pattern: string): string {
  // Simple number format: 0, #, ., ,, %
  // Detect percentage
  const isPercentage = pattern.includes('%');
  const workingNum = isPercentage ? num * 100 : num;

  // Split pattern into positive/negative/zero parts
  const parts = pattern.split(';');
  const positivePattern = parts[0];
  const negativePattern = parts[1] || ('-' + positivePattern);
  const zeroPattern = parts[2] || positivePattern;

  if (workingNum === 0) return applyNumericPattern(0, zeroPattern);
  if (workingNum < 0) return applyNumericPattern(workingNum, negativePattern);
  return applyNumericPattern(workingNum, positivePattern);
}

function applyNumericPattern(num: number, pattern: string): string {
  // Remove color sections [Red] etc.
  pattern = pattern.replace(/\[[^\]]+\]/g, '');

  const isPercentage = pattern.includes('%');
  const numValue = isPercentage ? num : num;

  // Determine decimal places from pattern
  const decimalMatch = pattern.match(/\.(0+|#+)/);
  let decimalPlaces = 0;
  if (decimalMatch) {
    decimalPlaces = decimalMatch[1].length;
  }

  // Round the number
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round(numValue * factor) / factor;

  // Split integer and decimal
  const absRounded = Math.abs(rounded);
  const intPart = Math.floor(absRounded);
  const decPart = absRounded - intPart;

  // Format integer with thousands separator if pattern contains ,
  const intStr = pattern.includes(',') ? intPart.toLocaleString('en-US') : String(intPart);

  // Format decimal
  let decStr = '';
  if (decimalPlaces > 0) {
    decStr = decPart.toFixed(decimalPlaces).slice(2);
  }

  // Build result by replacing 0/# placeholders
  let result = pattern;
  result = result.replace(/[0#]+,[0#]+|[0#]+/, intStr);
  if (decimalPlaces > 0) {
    result = result.replace(/\.[0#]+/, '.' + decStr);
  }
  result = result.replace(/%/g, '%');

  // Handle negative sign
  if (rounded < 0 && !pattern.startsWith('-')) {
    result = '-' + result;
  }

  return result;
}

function formatDatePattern(date: Date, pattern: string): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  const s = date.getSeconds();

  return pattern
    .replace(/yyyy/g, String(y))
    .replace(/yy/g, String(y).slice(-2))
    .replace(/MM/g, String(m).padStart(2, '0'))
    .replace(/M/g, String(m))
    .replace(/dd/g, String(d).padStart(2, '0'))
    .replace(/d/g, String(d))
    .replace(/HH/g, String(h).padStart(2, '0'))
    .replace(/H/g, String(h))
    .replace(/hh/g, String(h % 12 || 12).padStart(2, '0'))
    .replace(/h/g, String(h % 12 || 12))
    .replace(/mm/g, String(min).padStart(2, '0'))
    .replace(/ss/g, String(s).padStart(2, '0'))
    .replace(/AM\/PM/g, h >= 12 ? 'PM' : 'AM');
}

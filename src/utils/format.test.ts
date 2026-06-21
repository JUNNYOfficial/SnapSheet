/**
 * @file utils/format.test.ts
 * @description 数字格式化工具的单元测试。
 *              覆盖无格式、小数位、百分比、货币、非数字输入及日期格式。
 */

import { describe, it, expect } from 'vitest';
import { formatNumber } from './format';

describe('formatNumber', () => {
  it('returns plain string for no format', () => {
    expect(formatNumber('1234.56', undefined)).toBe('1234.56');
  });

  it('formats number with decimal places', () => {
    expect(formatNumber('1234.5678', { type: 'number', decimalPlaces: 2 })).toBe('1234.57');
    expect(formatNumber('1234', { type: 'number', decimalPlaces: 2 })).toBe('1234.00');
  });

  it('formats percentage', () => {
    expect(formatNumber('0.1234', { type: 'percentage', decimalPlaces: 2 })).toBe('12.34%');
  });

  it('formats currency', () => {
    expect(formatNumber('1234.5', { type: 'currency', decimalPlaces: 2, currencySymbol: '¥' })).toBe('¥1,234.50');
    expect(formatNumber('1234.5', { type: 'currency', decimalPlaces: 2, currencySymbol: '$' })).toBe('$1,234.50');
  });

  it('returns original value for non-numeric input', () => {
    expect(formatNumber('hello', { type: 'number', decimalPlaces: 2 })).toBe('hello');
  });

  it('formats date', () => {
    expect(formatNumber('2024-01-15', { type: 'date' })).toBe('2024-01-15');
  });
});

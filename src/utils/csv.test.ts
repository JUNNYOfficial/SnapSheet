import { describe, it, expect } from 'vitest';
import { parseCSV, toCSV } from './csv';

describe('parseCSV', () => {
  it('parses simple rows', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with commas', () => {
    expect(parseCSV('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
  });

  it('handles escaped quotes', () => {
    expect(parseCSV('a,"b""c",d')).toEqual([['a', 'b"c', 'd']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCSV('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('filters empty rows', () => {
    expect(parseCSV('a,b\n\n\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('toCSV', () => {
  it('exports cells to CSV', () => {
    const cells = new Map([
      ['A1', { value: 'hello' }],
      ['B1', { value: 'world' }],
    ]);
    expect(toCSV(cells, new Map())).toBe('hello,world');
  });

  it('quotes fields containing commas', () => {
    const cells = new Map([['A1', { value: 'a,b' }]]);
    expect(toCSV(cells, new Map())).toBe('"a,b"');
  });
});

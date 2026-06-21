import { describe, it, expect } from 'vitest';
import { coordsToCell, cellToCoords, colToLetter, letterToCol } from './cellRef';

describe('cellRef', () => {
  it('converts coordinates to cell reference', () => {
    expect(coordsToCell(0, 0)).toBe('A1');
    expect(coordsToCell(9, 25)).toBe('Z10');
    expect(coordsToCell(0, 26)).toBe('AA1');
  });

  it('converts cell reference to coordinates', () => {
    expect(cellToCoords('A1')).toEqual({ row: 0, col: 0 });
    expect(cellToCoords('Z10')).toEqual({ row: 9, col: 25 });
    expect(cellToCoords('AA1')).toEqual({ row: 0, col: 26 });
  });

  it('converts column index to letter', () => {
    expect(colToLetter(0)).toBe('A');
    expect(colToLetter(25)).toBe('Z');
    expect(colToLetter(26)).toBe('AA');
    expect(colToLetter(701)).toBe('ZZ');
  });

  it('converts column letter to index', () => {
    expect(letterToCol('A')).toBe(0);
    expect(letterToCol('Z')).toBe(25);
    expect(letterToCol('AA')).toBe(26);
    expect(letterToCol('ZZ')).toBe(701);
  });

  it('round trips correctly', () => {
    const cases = [
      { row: 0, col: 0 },
      { row: 99, col: 99 },
      { row: 999, col: 999 },
    ];
    for (const c of cases) {
      const ref = coordsToCell(c.row, c.col);
      expect(cellToCoords(ref)).toEqual(c);
    }
  });
});

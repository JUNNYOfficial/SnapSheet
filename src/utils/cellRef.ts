export function colToLetter(col: number): string {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

export function letterToCol(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}

export function cellToCoords(ref: string): { row: number; col: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error('Invalid cell reference: ' + ref);
  return {
    col: letterToCol(match[1]),
    row: parseInt(match[2], 10) - 1,
  };
}

export function coordsToCell(row: number, col: number): string {
  return colToLetter(col) + (row + 1);
}

export function parseRange(range: string): { startRow: number; startCol: number; endRow: number; endCol: number } {
  const [start, end] = range.split(':');
  const startCoords = cellToCoords(start);
  const endCoords = cellToCoords(end);
  return {
    startRow: Math.min(startCoords.row, endCoords.row),
    startCol: Math.min(startCoords.col, endCoords.col),
    endRow: Math.max(startCoords.row, endCoords.row),
    endCol: Math.max(startCoords.col, endCoords.col),
  };
}

export function getCellsInRange(range: string): string[] {
  const { startRow, startCol, endRow, endCol } = parseRange(range);
  const cells: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      cells.push(coordsToCell(r, c));
    }
  }
  return cells;
}

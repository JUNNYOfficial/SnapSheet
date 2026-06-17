export interface CellStyle {
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface Cell {
  value: string;
  computed?: number | string;
  formula?: string;
  style?: CellStyle;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Map<string, Cell>;
  colWidths: Map<number, number>;
  rowHeights: Map<number, number>;
}

export interface Workbook {
  sheets: Sheet[];
  activeSheetId: string;
}

export interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface Viewport {
  scrollLeft: number;
  scrollTop: number;
  width: number;
  height: number;
}

export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'CELL_REF'
  | 'RANGE'
  | 'FUNCTION'
  | 'PLUS'
  | 'MINUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EQ'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
}

export type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'cell'; ref: string }
  | { type: 'range'; start: string; end: string }
  | { type: 'function'; name: string; args: ASTNode[] }
  | { type: 'binary'; op: '+' | '-' | '*' | '/'; left: ASTNode; right: ASTNode };

export interface BorderStyle {
  style: 'thin' | 'medium' | 'thick';
  color: string;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bgColor?: string;
  fontFamily?: string;
  fontSize?: number;
  wrap?: boolean;
  borderTop?: BorderStyle;
  borderBottom?: BorderStyle;
  borderLeft?: BorderStyle;
  borderRight?: BorderStyle;
}

export interface NumberFormat {
  type: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'custom';
  decimalPlaces?: number;
  currencySymbol?: string;
  pattern?: string;
}

export interface ConditionalFormat {
  range: { startRow: number; startCol: number; endRow: number; endCol: number };
  type: 'colorScale' | 'dataBar' | 'iconSet' | 'value';
  condition: 'greaterThan' | 'lessThan' | 'equalTo' | 'between' | 'containsText' | 'topN' | 'bottomN' | 'aboveAverage' | 'belowAverage';
  value?: number | string;
  value2?: number | string;
  color?: string;
  bgColor?: string;
  minColor?: string;
  maxColor?: string;
}

export interface ValidationRule {
  type: 'number' | 'list' | 'textLength' | 'custom';
  operator?: 'between' | 'notBetween' | 'equal' | 'notEqual' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual';
  formula1?: string;
  formula2?: string;
  list?: string[];
  allowBlank?: boolean;
  errorMessage?: string;
}

export interface Cell {
  value: string;
  formula?: string;
  computed?: number | string;
  style?: CellStyle;
  numberFormat?: NumberFormat;
  comment?: string;
  validation?: ValidationRule;
}

export interface MergeRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Map<string, Cell>;
  colWidths: Map<number, number>;
  rowHeights: Map<number, number>;
  frozenRows: number;
  frozenCols: number;
  conditionalFormats: ConditionalFormat[];
  mergedCells: Map<string, MergeRange>;
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
  | 'GT'
  | 'LT'
  | 'GTE'
  | 'LTE'
  | 'NEQ'
  | 'AMPERSAND'
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
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '&'; left: ASTNode; right: ASTNode }
  | { type: 'comparison'; op: '>' | '<' | '>=' | '<=' | '=' | '<>'; left: ASTNode; right: ASTNode };

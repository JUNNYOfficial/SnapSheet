/**
 * @file types/index.ts
 * @description SnapSheet 全项目核心类型定义。包含单元格、工作表、工作簿、
 *              选择区域、公式 Token/AST 等数据结构的接口声明。
 *              所有业务模块都应从这里引用类型，避免各自重复定义。
 */

/** 单元格边框样式 */
export interface BorderStyle {
  /** 边框线型：细线、中线、粗线 */
  style: 'thin' | 'medium' | 'thick';
  /** 边框颜色（CSS 颜色值） */
  color: string;
}

/** 单元格样式：字体、对齐、颜色、边框等可视化属性 */
export interface CellStyle {
  /** 是否加粗 */
  bold?: boolean;
  /** 是否斜体 */
  italic?: boolean;
  /** 是否下划线 */
  underline?: boolean;
  /** 是否删除线 */
  strikethrough?: boolean;
  /** 水平对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 垂直对齐方式 */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** 字体颜色 */
  color?: string;
  /** 背景颜色 */
  bgColor?: string;
  /** 字体族 */
  fontFamily?: string;
  /** 字体大小（px） */
  fontSize?: number;
  /** 是否自动换行 */
  wrap?: boolean;
  /** 上边框 */
  borderTop?: BorderStyle;
  /** 下边框 */
  borderBottom?: BorderStyle;
  /** 左边框 */
  borderLeft?: BorderStyle;
  /** 右边框 */
  borderRight?: BorderStyle;
}

/** 数字/日期/时间格式配置 */
export interface NumberFormat {
  /** 格式类型 */
  type: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'custom';
  /** 小数位数 */
  decimalPlaces?: number;
  /** 货币符号 */
  currencySymbol?: string;
  /** 自定义格式模板 */
  pattern?: string;
}

/** 条件格式规则 */
export interface ConditionalFormat {
  /** 作用范围 */
  range: { startRow: number; startCol: number; endRow: number; endCol: number };
  /** 可视化类型 */
  type: 'colorScale' | 'dataBar' | 'iconSet' | 'value';
  /** 判定条件 */
  condition: 'greaterThan' | 'lessThan' | 'equalTo' | 'between' | 'containsText' | 'topN' | 'bottomN' | 'aboveAverage' | 'belowAverage';
  /** 比较值 1 */
  value?: number | string;
  /** 比较值 2（用于 between 等双值条件） */
  value2?: number | string;
  /** 字体颜色 */
  color?: string;
  /** 背景颜色 */
  bgColor?: string;
  /** 色阶最小值颜色 */
  minColor?: string;
  /** 色阶最大值颜色 */
  maxColor?: string;
}

/** 数据验证规则 */
export interface ValidationRule {
  /** 验证值类型 */
  type: 'number' | 'list' | 'textLength' | 'custom';
  /** 比较运算符 */
  operator?: 'between' | 'notBetween' | 'equal' | 'notEqual' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual';
  /** 比较公式/值 1 */
  formula1?: string;
  /** 比较公式/值 2 */
  formula2?: string;
  /** 下拉列表可选值 */
  list?: string[];
  /** 是否允许空值 */
  allowBlank?: boolean;
  /** 验证失败提示信息 */
  errorMessage?: string;
}

/**
 * 单元格数据对象。
 * value 始终保存用户输入的原始字符串；formula 保存以 '=' 开头的公式原文；
 * computed 保存公式计算后的结果（数字或错误字符串）。
 */
export interface Cell {
  /** 原始输入值 */
  value: string;
  /** 公式原文（以 = 开头），普通单元格可省略 */
  formula?: string;
  /** 公式计算结果或错误值，如 42 / '#REF!' */
  computed?: number | string;
  /** 单元格样式 */
  style?: CellStyle;
  /** 数字/日期格式 */
  numberFormat?: NumberFormat;
  /** 单元格批注 */
  comment?: string;
  /** 数据验证规则 */
  validation?: ValidationRule;
}

/** 合并单元格范围 */
export interface MergeRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** 图表类型 */
export type ChartType = 'bar' | 'line' | 'area' | 'scatter' | 'pie';

/** 图表对象 */
export interface Chart {
  /** 图表唯一标识 */
  id: string;
  /** 图表类型 */
  type: ChartType;
  /** 图表标题 */
  title: string;
  /** 数据范围 */
  range: { startRow: number; startCol: number; endRow: number; endCol: number };
  /** 类别所在列索引（范围相对列 0） */
  categoryCol: number;
  /** 数值所在列索引列表（范围相对列） */
  valueCols: number[];
  /** 图表位置与尺寸 */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 工作表数据模型。
 * 使用 Map 存储单元格（key 为 "A1" 形式引用）以及行列尺寸，
 * 保证大数据量下只保存有内容的单元格。
 */
export interface Sheet {
  /** 工作表唯一标识 */
  id: string;
  /** 工作表显示名称 */
  name: string;
  /** 单元格映射，key 为单元格引用（如 A1） */
  cells: Map<string, Cell>;
  /** 列宽映射，key 为列索引 */
  colWidths: Map<number, number>;
  /** 行高映射，key 为行索引 */
  rowHeights: Map<number, number>;
  /** 冻结行数 */
  frozenRows: number;
  /** 冻结列数 */
  frozenCols: number;
  /** 隐藏行索引列表 */
  hiddenRows: number[];
  /** 隐藏列索引列表 */
  hiddenCols: number[];
  /** 自动筛选配置 */
  autoFilter: AutoFilter | null;
  /** 条件格式列表 */
  conditionalFormats: ConditionalFormat[];
  /** 合并单元格映射，key 为左上角单元格引用 */
  mergedCells: Map<string, MergeRange>;
  /** 图表列表 */
  charts: Chart[];
}

/** 自动筛选配置 */
export interface AutoFilter {
  /** 表头行索引 */
  headerRow: number;
  /** 参与筛选的列范围 */
  startCol: number;
  endCol: number;
  /** 每列的可见值集合，key 为列索引 */
  filters: Record<number, string[]>;
}

/** 工作簿：包含多张工作表及当前激活表 */
export interface Workbook {
  sheets: Sheet[];
  activeSheetId: string;
}

/** 选择区域：矩形范围，支持单格与多格 */
export interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** 视口状态，用于 Canvas 渲染与滚动计算 */
export interface Viewport {
  scrollLeft: number;
  scrollTop: number;
  width: number;
  height: number;
}

/** 旧版公式词法单元类型（保留以兼容旧 Parser/Lexer/Evaluator） */
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

/** 旧版公式 Token */
export interface Token {
  type: TokenType;
  value: string;
}

/** 旧版公式抽象语法树节点 */
export type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'cell'; ref: string }
  | { type: 'range'; start: string; end: string }
  | { type: 'function'; name: string; args: ASTNode[] }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '&'; left: ASTNode; right: ASTNode }
  | { type: 'comparison'; op: '>' | '<' | '>=' | '<=' | '=' | '<>'; left: ASTNode; right: ASTNode };

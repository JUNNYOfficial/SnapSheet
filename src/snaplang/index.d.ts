/**
 * @file snaplang/index.d.ts
 * @description snaplang-v1.0.0 包的 TypeScript 类型声明文件。
 *              由于 snaplang-v1.0.0 是 CommonJS 模块且无自带类型，
 *              本项目通过此声明文件提供词法分析器、解析器、求值器及运行时 API 的类型支持。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'snaplang-v1.0.0' {
  /** 词法单元 */
  export interface Token {
    type: TokenType;
    value: string | number | boolean | null;
    line: number;
    column: number;
  }

  /** 词法单元类型枚举 */
  export enum TokenType {
    INT = 'INT',
    FLOAT = 'FLOAT',
    STRING = 'STRING',
    BOOL = 'BOOL',
    NIL = 'NIL',
    IDENT = 'IDENT',
    LET = 'LET',
    VAR = 'VAR',
    CONST = 'CONST',
    FN = 'FN',
    IF = 'IF',
    ELSE = 'ELSE',
    FOR = 'FOR',
    WHILE = 'WHILE',
    LOOP = 'LOOP',
    RETURN = 'RETURN',
    BREAK = 'BREAK',
    CONTINUE = 'CONTINUE',
    IMPORT = 'IMPORT',
    FROM = 'FROM',
    AS = 'AS',
    MODULE = 'MODULE',
    STRUCT = 'STRUCT',
    ENUM = 'ENUM',
    TYPE = 'TYPE',
    MATCH = 'MATCH',
    TRY = 'TRY',
    CATCH = 'CATCH',
    THROW = 'THROW',
    AND = 'AND',
    OR = 'OR',
    NOT = 'NOT',
    IN = 'IN',
    TRUE = 'TRUE',
    FALSE = 'FALSE',
    NIL_KW = 'NIL_KW',
    PLUS = 'PLUS',
    MINUS = 'MINUS',
    STAR = 'STAR',
    SLASH = 'SLASH',
    PERCENT = 'PERCENT',
    POWER = 'POWER',
    FLOOR_DIV = 'FLOOR_DIV',
    ASSIGN = 'ASSIGN',
    PLUS_ASSIGN = 'PLUS_ASSIGN',
    MINUS_ASSIGN = 'MINUS_ASSIGN',
    STAR_ASSIGN = 'STAR_ASSIGN',
    SLASH_ASSIGN = 'SLASH_ASSIGN',
    PERCENT_ASSIGN = 'PERCENT_ASSIGN',
    EQ = 'EQ',
    NE = 'NE',
    LT = 'LT',
    GT = 'GT',
    LE = 'LE',
    GE = 'GE',
    ARROW = 'ARROW',
    FAT_ARROW = 'FAT_ARROW',
    PIPE = 'PIPE',
    NIL_COALESCE = 'NIL_COALESCE',
    OPTIONAL_CHAIN = 'OPTIONAL_CHAIN',
    RANGE = 'RANGE',
    RANGE_INCLUSIVE = 'RANGE_INCLUSIVE',
    ELLIPSIS = 'ELLIPSIS',
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN',
    LBRACKET = 'LBRACKET',
    RBRACKET = 'RBRACKET',
    LBRACE = 'LBRACE',
    RBRACE = 'RBRACE',
    COMMA = 'COMMA',
    COLON = 'COLON',
    SEMICOLON = 'SEMICOLON',
    DOT = 'DOT',
    BANG = 'BANG',
    NEWLINE = 'NEWLINE',
    EOF = 'EOF',
  }

  /** 运行时环境：变量作用域 */
  export interface Environment {
    variables: Map<string, { value: any; mutable: boolean; isConst: boolean }>;
    parent?: Environment;
  }

  /** 用户定义函数 */
  export interface SnapFunction {
    kind: 'SnapFunction';
    name: string;
    params: any[];
    body: any;
    closure: Environment;
    isNative: boolean;
  }

  /** 原生函数 */
  export interface SnapNativeFunction {
    kind: 'SnapNativeFunction';
    name: string;
    fn: (...args: any[]) => any;
    isNative: true;
  }

  /** AST 基础节点 */
  export interface ASTNode {
    kind: string;
    line?: number;
    column?: number;
  }

  /** 程序根节点 */
  export interface Program extends ASTNode {
    kind: 'Program';
    statements: ASTNode[];
  }

  /** 词法分析器：将源代码转换为 Token 列表 */
  export class Lexer {
    constructor(source: string);
    tokenize(): Token[];
  }

  /** 语法分析器：将 Token 列表转换为 AST */
  export class Parser {
    constructor(tokens: Token[]);
    parse(): Program;
  }

  /** 表达式求值器：执行 AST 并返回结果 */
  export class Evaluator {
    constructor();
    evaluateProgram(program: Program): any;
    getOutput(): string;
    clearOutput(): void;
  }

  /** run 函数执行结果 */
  export interface RunResult {
    success: boolean;
    result: any;
    error?: string;
  }

  /** 直接运行源代码并返回结果 */
  export function run(source: string): RunResult;

  /** 创建新的运行时环境 */
  export function createEnvironment(parent?: Environment): Environment;
  /** 在环境中定义变量 */
  export function defineVariable(
    env: Environment,
    name: string,
    value: any,
    mutable?: boolean,
    isConst?: boolean
  ): void;
  /** 读取环境变量 */
  export function getVariable(env: Environment, name: string): any;
  /** 设置环境变量 */
  export function setVariable(env: Environment, name: string, value: any): void;
  /** 判断值是否为真 */
  export function isTruthy(value: any): boolean;
  /** 将值序列化为字符串 */
  export function stringify(value: any): string;
  /** 判断是否为 SnapFunction */
  export function isSnapFunction(value: any): boolean;
  /** 判断是否为 SnapNativeFunction */
  export function isSnapNativeFunction(value: any): boolean;
  /** 包装 JavaScript 函数为 SnapLang 原生函数 */
  export function makeNativeFunction(name: string, fn: (...args: any[]) => any): SnapNativeFunction;

  /** 运行时错误 */
  export class RuntimeError extends Error {
    constructor(message: string);
  }

  /** 词法错误 */
  export class LexerError extends Error {
    line: number;
    column: number;
    constructor(message: string, line: number, column: number);
  }

  /** 语法错误 */
  export class ParserError extends Error {
    line: number;
    column: number;
    constructor(message: string, line: number, column: number);
  }
}

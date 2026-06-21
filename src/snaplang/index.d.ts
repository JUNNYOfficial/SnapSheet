/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'snaplang-v1.0.0' {
  export interface Token {
    type: TokenType;
    value: string | number | boolean | null;
    line: number;
    column: number;
  }

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

  export interface Environment {
    variables: Map<string, { value: any; mutable: boolean; isConst: boolean }>;
    parent?: Environment;
  }

  export interface SnapFunction {
    kind: 'SnapFunction';
    name: string;
    params: any[];
    body: any;
    closure: Environment;
    isNative: boolean;
  }

  export interface SnapNativeFunction {
    kind: 'SnapNativeFunction';
    name: string;
    fn: (...args: any[]) => any;
    isNative: true;
  }

  export interface ASTNode {
    kind: string;
    line?: number;
    column?: number;
  }

  export interface Program extends ASTNode {
    kind: 'Program';
    statements: ASTNode[];
  }

  export class Lexer {
    constructor(source: string);
    tokenize(): Token[];
  }

  export class Parser {
    constructor(tokens: Token[]);
    parse(): Program;
  }

  export class Evaluator {
    constructor();
    evaluateProgram(program: Program): any;
    getOutput(): string;
    clearOutput(): void;
  }

  export interface RunResult {
    success: boolean;
    result: any;
    error?: string;
  }

  export function run(source: string): RunResult;

  export function createEnvironment(parent?: Environment): Environment;
  export function defineVariable(
    env: Environment,
    name: string,
    value: any,
    mutable?: boolean,
    isConst?: boolean
  ): void;
  export function getVariable(env: Environment, name: string): any;
  export function setVariable(env: Environment, name: string, value: any): void;
  export function isTruthy(value: any): boolean;
  export function stringify(value: any): string;
  export function isSnapFunction(value: any): boolean;
  export function isSnapNativeFunction(value: any): boolean;
  export function makeNativeFunction(name: string, fn: (...args: any[]) => any): SnapNativeFunction;

  export class RuntimeError extends Error {
    constructor(message: string);
  }

  export class LexerError extends Error {
    line: number;
    column: number;
    constructor(message: string, line: number, column: number);
  }

  export class ParserError extends Error {
    line: number;
    column: number;
    constructor(message: string, line: number, column: number);
  }
}
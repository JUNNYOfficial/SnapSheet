/**
 * @file snaplang/snaplang-wrapper.ts
 * @description SnapLang v1.0.0 ES 模块包装层。
 *              由于 snaplang-v1.0.0 是 CommonJS 模块，浏览器与 Vite 无法直接加载，
 *              项目通过 scripts/build-snaplang.js 将其打包为 vendor/snaplang.esm.js，
 *              本文件负责将该 ES 模块重新导出为统一的 SnapLang API。
 *              被 adapter.ts 引用以构建公式求值环境。
 */

// 将 CommonJS 的 SnapLang v1.0.0 包装为 ES 模块
import snaplangCjs from './vendor/snaplang.esm.js';

/** 从打包产物中导出的 SnapLang 模块接口 */
export interface SnapLangModule {
  /** 词法分析器 */
  Lexer: new (source: string) => { tokenize: () => unknown[] };
  /** 语法分析器 */
  Parser: new (tokens: unknown[]) => { parse: () => unknown };
  /** 表达式求值器 */
  Evaluator: new () => {
    evaluateProgram: (program: unknown) => unknown;
    getOutput: () => string;
    clearOutput: () => void;
  };
  /** 直接运行源代码 */
  run: (source: string) => { success: boolean; result: unknown; error?: string };
  /** 创建运行时环境 */
  createEnvironment: (parent?: unknown) => unknown;
  /** 定义变量 */
  defineVariable: (env: unknown, name: string, value: unknown, mutable?: boolean, isConst?: boolean) => void;
  /** 读取变量 */
  getVariable: (env: unknown, name: string) => unknown;
  /** 设置变量 */
  setVariable: (env: unknown, name: string, value: unknown) => void;
  /** 真值判断 */
  isTruthy: (value: unknown) => boolean;
  /** 序列化为字符串 */
  stringify: (value: unknown) => string;
  /** 包装原生函数 */
  makeNativeFunction: (name: string, fn: (...args: unknown[]) => unknown) => unknown;
  /** 运行时错误类型 */
  RuntimeError: new (message: string) => Error;
}

// 兼容 default 导出与命名空间导出
const snaplang = (snaplangCjs as { default?: SnapLangModule }).default || (snaplangCjs as SnapLangModule);

export const Lexer = snaplang.Lexer;
export const Parser = snaplang.Parser;
export const Evaluator = snaplang.Evaluator;
export const run = snaplang.run;
export const createEnvironment = snaplang.createEnvironment;
export const defineVariable = snaplang.defineVariable;
export const getVariable = snaplang.getVariable;
export const setVariable = snaplang.setVariable;
export const isTruthy = snaplang.isTruthy;
export const stringify = snaplang.stringify;
export const makeNativeFunction = snaplang.makeNativeFunction;
export const RuntimeError = snaplang.RuntimeError;

export default snaplang;

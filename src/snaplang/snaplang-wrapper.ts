// 将 CommonJS 的 SnapLang v1.0.0 包装为 ES 模块
import snaplangCjs from './vendor/snaplang.esm.js';

export interface SnapLangModule {
  Lexer: new (source: string) => { tokenize: () => unknown[] };
  Parser: new (tokens: unknown[]) => { parse: () => unknown };
  Evaluator: new () => {
    evaluateProgram: (program: unknown) => unknown;
    getOutput: () => string;
    clearOutput: () => void;
  };
  run: (source: string) => { success: boolean; result: unknown; error?: string };
  createEnvironment: (parent?: unknown) => unknown;
  defineVariable: (env: unknown, name: string, value: unknown, mutable?: boolean, isConst?: boolean) => void;
  getVariable: (env: unknown, name: string) => unknown;
  setVariable: (env: unknown, name: string, value: unknown) => void;
  isTruthy: (value: unknown) => boolean;
  stringify: (value: unknown) => string;
  makeNativeFunction: (name: string, fn: (...args: unknown[]) => unknown) => unknown;
  RuntimeError: new (message: string) => Error;
}

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

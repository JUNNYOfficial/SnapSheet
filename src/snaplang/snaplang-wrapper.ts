// SnapLang v1.0.0 ES 模块包装（由 snaplang-v1.0.0/dist 构建生成）
import snaplang from './vendor/snaplang.esm.js';

const s = snaplang as any;

export const Lexer = s.Lexer;
export const Parser = s.Parser;
export const Evaluator = s.Evaluator;
export const run = s.run;
export const createEnvironment = s.createEnvironment;
export const defineVariable = s.defineVariable;
export const getVariable = s.getVariable;
export const setVariable = s.setVariable;
export const isTruthy = s.isTruthy;
export const stringify = s.stringify;
export const makeNativeFunction = s.makeNativeFunction;
export const RuntimeError = s.RuntimeError;

export default s;

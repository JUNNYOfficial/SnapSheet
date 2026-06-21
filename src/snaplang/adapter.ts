/**
 * @file snaplang/adapter.ts
 * @description SnapLang 公式引擎适配层。
 *              将 SnapLang v1.0.0 运行时与 SnapSheet 的单元格模型桥接：
 *              - 公式预处理：将 A1 / A1:B5 等引用替换为 getCell / getCellRange 调用
 *              - 注册原生函数：sum/avg/max 等表格函数及数学/字符串/逻辑函数
 *              - 收集依赖、执行求值、统一错误码
 *              被 FormulaEngine.ts 调用。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Cell } from '../types';
import { getCellsInRange } from '../utils/cellRef';
import * as snaplangModule from './snaplang-wrapper';

/** 返回 SnapLang 模块对象 */
function loadSnaplang() {
  return snaplangModule;
}

/**
 * 公式预处理：将单元格引用替换为 getCell/getCellRange 原生调用。
 * 会跳过字符串常量中的内容，避免误替换。
 * @param formula 原始公式，以 '=' 开头或纯表达式
 * @returns 可供 SnapLang 解析的源代码
 */
function preprocessFormula(formula: string): string {
  let source = formula.startsWith('=') ? formula.slice(1) : formula;

  // 按字符串常量分割，避免替换字符串内部看起来像单元格引用的内容
  const segments: { text: string; isString: boolean }[] = [];
  let inString = false;
  let stringChar = '';
  let current = '';

  for (const ch of source) {
    if (inString) {
      current += ch;
      if (ch === stringChar) {
        inString = false;
        segments.push({ text: current, isString: true });
        current = '';
      }
    } else if (ch === '"' || ch === "'") {
      if (current) segments.push({ text: current, isString: false });
      inString = true;
      stringChar = ch;
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) segments.push({ text: current, isString: inString });

  // 只在非字符串部分替换单元格引用
  return segments
    .map(({ text, isString }) => {
      if (isString) return text;
      // 先替换单个单元格引用，再把相邻的 getCell("A1"):getCell("A3") 合并为区域
      let out = text.replace(/\b([A-Z]+[0-9]+)\b/g, 'getCell("$1")');
      out = out.replace(/getCell\("([A-Z]+[0-9]+)"\):getCell\("([A-Z]+[0-9]+)"\)/g, 'getCellRange("$1:$2")');
      return out;
    })
    .join('');
}

/** 公式引擎上下文：读写单元格数据 */
export interface FormulaContext {
  /** 获取单元格数据 */
  getCell: (ref: string) => Cell | undefined;
  /** 设置单元格计算结果 */
  setCellComputed: (ref: string, value: number | string) => void;
}

/**
 * SnapLang 公式引擎封装。
 * 负责将 SnapSheet 公式语法转换为 SnapLang 可执行代码，并注册所需的单元格/表格函数。
 */
export class SnapLangFormulaEngine {
  private ctx: FormulaContext;

  constructor(ctx: FormulaContext) {
    this.ctx = ctx;
  }

  /**
   * 在 Evaluator 全局环境中注册所有 SnapSheet 原生函数。
   * 包括单元格读写、区域读写、聚合函数、数学/字符串/逻辑函数。
   * @param snaplang SnapLang 模块
   * @param evaluator SnapLang 求值器实例
   */
  private setupCellFunctions(snaplang: any, evaluator: any) {
    const env = evaluator.globals;

    const getCellValue = snaplang.makeNativeFunction('getCell', (ref: string) => {
      const cell = this.ctx.getCell(ref);
      if (!cell) return null;
      if (cell.computed !== undefined) return cell.computed;
      if (cell.value !== undefined) {
        const num = parseFloat(cell.value);
        if (!isNaN(num) && cell.value.trim() !== '') return num;
        return cell.value;
      }
      return null;
    });

    const setCellValue = snaplang.makeNativeFunction('setCell', (ref: string, value: any) => {
      this.ctx.setCellComputed(ref, value);
      return value;
    });

    const getCellRange = snaplang.makeNativeFunction('getCellRange', (range: string) => {
      if (typeof range !== 'string') return [];
      try {
        return getCellsInRange(range).map((ref) => {
          const cell = this.ctx.getCell(ref);
          if (!cell) return null;
          if (cell.computed !== undefined) return cell.computed;
          const num = parseFloat(cell.value);
          if (!isNaN(num) && cell.value.trim() !== '') return num;
          return cell.value;
        });
      } catch {
        return [];
      }
    });

    const sumRange = snaplang.makeNativeFunction('sum', (...values: any[]) => {
      let sum = 0;
      for (const v of values.flat()) {
        if (typeof v === 'number') sum += v;
        else if (typeof v === 'string') {
          const n = parseFloat(v);
          if (!isNaN(n)) sum += n;
        }
      }
      return sum;
    });

    const avgRange = snaplang.makeNativeFunction('avg', (...values: any[]) => {
      let sum = 0;
      let count = 0;
      for (const v of values.flat()) {
        if (typeof v === 'number') {
          sum += v;
          count++;
        } else if (typeof v === 'string') {
          const n = parseFloat(v);
          if (!isNaN(n)) {
            sum += n;
            count++;
          }
        }
      }
      return count > 0 ? sum / count : 0;
    });

    const maxRange = snaplang.makeNativeFunction('max', (...values: any[]) => {
      let max = -Infinity;
      for (const v of values.flat()) {
        if (typeof v === 'number' && v > max) max = v;
        else if (typeof v === 'string') {
          const n = parseFloat(v);
          if (!isNaN(n) && n > max) max = n;
        }
      }
      return max === -Infinity ? 0 : max;
    });

    const minRange = snaplang.makeNativeFunction('min', (...values: any[]) => {
      let min = Infinity;
      for (const v of values.flat()) {
        if (typeof v === 'number' && v < min) min = v;
        else if (typeof v === 'string') {
          const n = parseFloat(v);
          if (!isNaN(n) && n < min) min = n;
        }
      }
      return min === Infinity ? 0 : min;
    });

    const countRange = snaplang.makeNativeFunction('count', (...values: any[]) => {
      return values.flat().length;
    });

    // 数学函数
    const absFunc = snaplang.makeNativeFunction('abs', (num: number) => {
      if (typeof num !== 'number') {
        const n = parseFloat(num);
        if (isNaN(n)) return '#NUM!';
        return Math.abs(n);
      }
      return Math.abs(num);
    });

    const sqrtFunc = snaplang.makeNativeFunction('sqrt', (num: number) => {
      if (typeof num !== 'number') {
        const n = parseFloat(num);
        if (isNaN(n)) return '#NUM!';
        num = n;
      }
      if (num < 0) return '#NUM!';
      return Math.sqrt(num);
    });

    const powerFunc = snaplang.makeNativeFunction('power', (base: number, exponent: number) => {
      if (typeof base !== 'number') {
        const b = parseFloat(base);
        if (isNaN(b)) return '#NUM!';
        base = b;
      }
      if (typeof exponent !== 'number') {
        const e = parseFloat(exponent);
        if (isNaN(e)) return '#NUM!';
        exponent = e;
      }
      return Math.pow(base, exponent);
    });

    const roundFunc = snaplang.makeNativeFunction('round', (num: number, decimals?: number) => {
      if (typeof num !== 'number') {
        const n = parseFloat(num);
        if (isNaN(n)) return '#NUM!';
        num = n;
      }
      const d = decimals !== undefined ? decimals : 0;
      if (typeof d !== 'number') {
        const dec = parseFloat(d);
        if (isNaN(dec)) return '#NUM!';
        decimals = dec;
      }
      const factor = Math.pow(10, d);
      return Math.round(num * factor) / factor;
    });

    const ceilFunc = snaplang.makeNativeFunction('ceil', (num: number) => {
      if (typeof num !== 'number') {
        const n = parseFloat(num);
        if (isNaN(n)) return '#NUM!';
        return Math.ceil(n);
      }
      return Math.ceil(num);
    });

    const floorFunc = snaplang.makeNativeFunction('floor', (num: number) => {
      if (typeof num !== 'number') {
        const n = parseFloat(num);
        if (isNaN(n)) return '#NUM!';
        return Math.floor(n);
      }
      return Math.floor(num);
    });

    // 字符串函数
    const concatFunc = snaplang.makeNativeFunction('concat', (...args: any[]) => {
      return args.map((arg) => String(arg)).join('');
    });

    const lenFunc = snaplang.makeNativeFunction('len', (str: string) => {
      return typeof str === 'string' ? str.length : String(str).length;
    });

    const upperFunc = snaplang.makeNativeFunction('upper', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : String(str).toUpperCase();
    });

    const lowerFunc = snaplang.makeNativeFunction('lower', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : String(str).toLowerCase();
    });

    const trimFunc = snaplang.makeNativeFunction('trim', (str: string) => {
      return typeof str === 'string' ? str.trim() : String(str).trim();
    });

    // 逻辑函数
    const ifFunc = snaplang.makeNativeFunction('if', (condition: any, trueValue: any, falseValue: any) => {
      return snaplang.isTruthy(condition) ? trueValue : falseValue;
    });

    const andFunc = snaplang.makeNativeFunction('and', (...args: any[]) => {
      return args.every((arg) => snaplang.isTruthy(arg));
    });

    const orFunc = snaplang.makeNativeFunction('or', (...args: any[]) => {
      return args.some((arg) => snaplang.isTruthy(arg));
    });

    const notFunc = snaplang.makeNativeFunction('not', (value: any) => {
      return !snaplang.isTruthy(value);
    });

    snaplang.defineVariable(env, 'getCell', getCellValue, false, true);
    snaplang.defineVariable(env, 'getCellRange', getCellRange, false, true);
    snaplang.defineVariable(env, 'setCell', setCellValue, false, true);
    snaplang.defineVariable(env, 'sum', sumRange, false, true);
    snaplang.defineVariable(env, 'avg', avgRange, false, true);
    snaplang.defineVariable(env, 'max', maxRange, false, true);
    snaplang.defineVariable(env, 'min', minRange, false, true);
    snaplang.defineVariable(env, 'count', countRange, false, true);
    snaplang.defineVariable(env, 'abs', absFunc, false, true);
    snaplang.defineVariable(env, 'sqrt', sqrtFunc, false, true);
    snaplang.defineVariable(env, 'power', powerFunc, false, true);
    snaplang.defineVariable(env, 'round', roundFunc, false, true);
    snaplang.defineVariable(env, 'ceil', ceilFunc, false, true);
    snaplang.defineVariable(env, 'floor', floorFunc, false, true);
    snaplang.defineVariable(env, 'concat', concatFunc, false, true);
    snaplang.defineVariable(env, 'len', lenFunc, false, true);
    snaplang.defineVariable(env, 'upper', upperFunc, false, true);
    snaplang.defineVariable(env, 'lower', lowerFunc, false, true);
    snaplang.defineVariable(env, 'trim', trimFunc, false, true);
    snaplang.defineVariable(env, 'if', ifFunc, false, true);
    snaplang.defineVariable(env, 'and', andFunc, false, true);
    snaplang.defineVariable(env, 'or', orFunc, false, true);
    snaplang.defineVariable(env, 'not', notFunc, false, true);
  }

  /**
   * 从公式文本中提取所有单元格依赖（包括区域展开后的单元格）。
   * 用于构建 DependencyGraph 的依赖关系。
   * @param formula 公式原文
   * @returns 去重后的单元格引用数组
   */
  collectDependencies(formula: string): string[] {
    const deps: string[] = [];
    const rangePattern = /\b([A-Z]+[0-9]+):([A-Z]+[0-9]+)\b/g;
    let rangeMatch;
    while ((rangeMatch = rangePattern.exec(formula)) !== null) {
      try {
        for (const cell of getCellsInRange(rangeMatch[0])) {
          if (!deps.includes(cell)) deps.push(cell);
        }
      } catch {
        // ignore
      }
    }

    const cellRefPattern = /\b[A-Z]+[0-9]+\b/g;
    let cellMatch;
    while ((cellMatch = cellRefPattern.exec(formula)) !== null) {
      const ref = cellMatch[0];
      let isPartOfRange = false;
      rangePattern.lastIndex = 0;
      while ((rangeMatch = rangePattern.exec(formula)) !== null) {
        try {
          if (getCellsInRange(rangeMatch[0]).includes(ref)) {
            isPartOfRange = true;
            break;
          }
        } catch {
          // ignore
        }
      }
      if (!isPartOfRange && !deps.includes(ref)) deps.push(ref);
    }

    return deps;
  }

  /**
   * 对公式进行求值，并返回计算结果或错误字符串。
   * 错误码统一为 #LEX! / #SYNTAX! / #RUNTIME! / #ERROR! 等格式。
   * @param formula 公式原文（以 = 开头）
   * @returns 计算结果或错误字符串
   */
  evaluate(formula: string): number | string {
    const snaplang = loadSnaplang();
    const source = preprocessFormula(formula);
    const evaluator = new snaplang.Evaluator();
    this.setupCellFunctions(snaplang, evaluator);

    try {
      const lexer = new snaplang.Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new snaplang.Parser(tokens);
      const ast = parser.parse();

      const result = evaluator.evaluateProgram(ast);

      if (result === null || result === undefined) return '';
      if (typeof result === 'number') {
        if (isNaN(result)) return '#NUM!';
        if (!isFinite(result)) return '#NUM!';
        return result;
      }
      if (typeof result === 'string') {
        if (result.startsWith('#')) return result;
        return result;
      }
      if (typeof result === 'boolean') return result ? 1 : 0;
      return snaplang.stringify(result);
    } catch (e: any) {
      if (e.name === 'LexerError') {
        const line = e.line || 1;
        const column = e.column || 1;
        const msg = e.message?.replace('[词法错误] ', '') || '未知词法错误';
        return `#LEX! 第${line}行第${column}列: ${msg}`;
      }

      if (e.name === 'ParserError') {
        const line = e.line || 1;
        const column = e.column || 1;
        const msg = e.message?.replace('[语法错误] ', '') || '未知语法错误';
        return `#SYNTAX! 第${line}行第${column}列: ${msg}`;
      }

      if (e.name === 'RuntimeError') {
        const msg = e.message?.replace('[运行时错误] ', '') || '未知运行时错误';

        if (msg.includes('未定义的标识符')) {
          const match = msg.match(/'([^']+)'/);
          if (match) {
            const ident = match[1];
            if (/^[A-Z]+[0-9]+$/.test(ident)) {
              const cell = this.ctx.getCell(ident);
              if (cell) {
                const val = cell.computed !== undefined ? cell.computed : cell.value;
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                  const n = parseFloat(val);
                  if (!isNaN(n)) return n;
                  return val;
                }
              }
              return `#REF! 单元格 '${ident}' 不存在`;
            }
            return `#NAME! 未定义的函数或变量 '${ident}'`;
          }
        }

        if (msg.includes('不能重新赋值常量')) {
          return `#CONST! ${msg}`;
        }

        if (msg.includes('不能重新赋值不可变变量')) {
          return `#IMMUT! ${msg}`;
        }

        return `#RUNTIME! ${msg}`;
      }

      const errorMsg = e.message || '未知错误';
      return `#ERROR! ${errorMsg}`;
    }
  }
}

/**
 * 创建 SnapLang 公式引擎实例的工厂函数。
 * @param ctx 公式引擎上下文
 * @returns SnapLangFormulaEngine 实例
 */
export function createSnapLangEngine(ctx: FormulaContext): SnapLangFormulaEngine {
  return new SnapLangFormulaEngine(ctx);
}

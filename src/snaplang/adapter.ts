import type { Cell } from '../types';
import { getCellsInRange } from '../utils/cellRef';
import * as snaplangModule from './snaplang-wrapper';

function loadSnaplang() {
  return snaplangModule;
}

export interface FormulaContext {
  getCell: (ref: string) => Cell | undefined;
  setCellComputed: (ref: string, value: number | string) => void;
}

export class SnapLangFormulaEngine {
  private ctx: FormulaContext;
  private evaluator: any;
  private env: any;

  constructor(ctx: FormulaContext) {
    this.ctx = ctx;
    const snaplang = loadSnaplang();
    this.evaluator = new snaplang.Evaluator();
    this.env = snaplang.createEnvironment();
    this.setupCellFunctions(snaplang);
  }

  private setupCellFunctions(snaplang: any) {
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

    const sumRange = snaplang.makeNativeFunction('sum', (...refs: string[]) => {
      let sum = 0;
      for (const ref of refs) {
        const cell = this.ctx.getCell(ref);
        if (cell) {
          const val = cell.computed !== undefined ? cell.computed : cell.value;
          if (typeof val === 'number') sum += val;
          else if (typeof val === 'string') {
            const n = parseFloat(val);
            if (!isNaN(n)) sum += n;
          }
        }
      }
      return sum;
    });

    const avgRange = snaplang.makeNativeFunction('avg', (...refs: string[]) => {
      let sum = 0;
      let count = 0;
      for (const ref of refs) {
        const cell = this.ctx.getCell(ref);
        if (cell) {
          const val = cell.computed !== undefined ? cell.computed : cell.value;
          if (typeof val === 'number') {
            sum += val;
            count++;
          } else if (typeof val === 'string') {
            const n = parseFloat(val);
            if (!isNaN(n)) {
              sum += n;
              count++;
            }
          }
        }
      }
      return count > 0 ? sum / count : 0;
    });

    const maxRange = snaplang.makeNativeFunction('max', (...refs: string[]) => {
      let max = -Infinity;
      for (const ref of refs) {
        const cell = this.ctx.getCell(ref);
        if (cell) {
          const val = cell.computed !== undefined ? cell.computed : cell.value;
          if (typeof val === 'number' && val > max) max = val;
          else if (typeof val === 'string') {
            const n = parseFloat(val);
            if (!isNaN(n) && n > max) max = n;
          }
        }
      }
      return max === -Infinity ? 0 : max;
    });

    const minRange = snaplang.makeNativeFunction('min', (...refs: string[]) => {
      let min = Infinity;
      for (const ref of refs) {
        const cell = this.ctx.getCell(ref);
        if (cell) {
          const val = cell.computed !== undefined ? cell.computed : cell.value;
          if (typeof val === 'number' && val < min) min = val;
          else if (typeof val === 'string') {
            const n = parseFloat(val);
            if (!isNaN(n) && n < min) min = n;
          }
        }
      }
      return min === Infinity ? 0 : min;
    });

    const countRange = snaplang.makeNativeFunction('count', (...refs: string[]) => {
      return refs.length;
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

    snaplang.defineVariable(this.env, 'getCell', getCellValue, false, true);
    snaplang.defineVariable(this.env, 'setCell', setCellValue, false, true);
    snaplang.defineVariable(this.env, 'sum', sumRange, false, true);
    snaplang.defineVariable(this.env, 'avg', avgRange, false, true);
    snaplang.defineVariable(this.env, 'max', maxRange, false, true);
    snaplang.defineVariable(this.env, 'min', minRange, false, true);
    snaplang.defineVariable(this.env, 'count', countRange, false, true);
    
    // 数学函数
    snaplang.defineVariable(this.env, 'abs', absFunc, false, true);
    snaplang.defineVariable(this.env, 'sqrt', sqrtFunc, false, true);
    snaplang.defineVariable(this.env, 'power', powerFunc, false, true);
    snaplang.defineVariable(this.env, 'round', roundFunc, false, true);
    snaplang.defineVariable(this.env, 'ceil', ceilFunc, false, true);
    snaplang.defineVariable(this.env, 'floor', floorFunc, false, true);
    
    // 字符串函数
    const concatFunc = snaplang.makeNativeFunction('concat', (...args: any[]) => {
      return args.map(arg => String(arg)).join('');
    });

    const lenFunc = snaplang.makeNativeFunction('len', (str: string) => {
      if (typeof str !== 'string') {
        return String(str).length;
      }
      return str.length;
    });

    const upperFunc = snaplang.makeNativeFunction('upper', (str: string) => {
      if (typeof str !== 'string') {
        return String(str).toUpperCase();
      }
      return str.toUpperCase();
    });

    const lowerFunc = snaplang.makeNativeFunction('lower', (str: string) => {
      if (typeof str !== 'string') {
        return String(str).toLowerCase();
      }
      return str.toLowerCase();
    });

    const trimFunc = snaplang.makeNativeFunction('trim', (str: string) => {
      if (typeof str !== 'string') {
        return String(str).trim();
      }
      return str.trim();
    });

    snaplang.defineVariable(this.env, 'concat', concatFunc, false, true);
    snaplang.defineVariable(this.env, 'len', lenFunc, false, true);
    snaplang.defineVariable(this.env, 'upper', upperFunc, false, true);
    snaplang.defineVariable(this.env, 'lower', lowerFunc, false, true);
    snaplang.defineVariable(this.env, 'trim', trimFunc, false, true);
    
    // 逻辑函数
    const ifFunc = snaplang.makeNativeFunction('if', (condition: any, trueValue: any, falseValue: any) => {
      const isTrue = snaplang.isTruthy(condition);
      return isTrue ? trueValue : falseValue;
    });

    const andFunc = snaplang.makeNativeFunction('and', (...args: any[]) => {
      return args.every(arg => snaplang.isTruthy(arg));
    });

    const orFunc = snaplang.makeNativeFunction('or', (...args: any[]) => {
      return args.some(arg => snaplang.isTruthy(arg));
    });

    const notFunc = snaplang.makeNativeFunction('not', (value: any) => {
      return !snaplang.isTruthy(value);
    });

    snaplang.defineVariable(this.env, 'if', ifFunc, false, true);
    snaplang.defineVariable(this.env, 'and', andFunc, false, true);
    snaplang.defineVariable(this.env, 'or', orFunc, false, true);
    snaplang.defineVariable(this.env, 'not', notFunc, false, true);
  }

  collectDependencies(formula: string): string[] {
    const deps: string[] = [];
    
    // 匹配区域引用（如 A1:B5）
    const rangePattern = /\b([A-Z]+[0-9]+):([A-Z]+[0-9]+)\b/g;
    let rangeMatch;
    while ((rangeMatch = rangePattern.exec(formula)) !== null) {
      const range = rangeMatch[0];
      try {
        const cells = getCellsInRange(range);
        for (const cell of cells) {
          if (!deps.includes(cell)) {
            deps.push(cell);
          }
        }
      } catch {
        // 如果区域解析失败，跳过
      }
    }
    
    // 匹配单个单元格引用（排除已经在区域中的）
    const cellRefPattern = /\b[A-Z]+[0-9]+\b/g;
    let cellMatch;
    while ((cellMatch = cellRefPattern.exec(formula)) !== null) {
      const ref = cellMatch[0];
      // 检查是否在区域引用中（避免重复添加）
      const isInRange = /\b([A-Z]+[0-9]+):([A-Z]+[0-9]+)\b/g.test(formula);
      if (!isInRange && !deps.includes(ref)) {
        // 检查是否是区域的一部分
        let isPartOfRange = false;
        rangePattern.lastIndex = 0;
        while ((rangeMatch = rangePattern.exec(formula)) !== null) {
          try {
            const cells = getCellsInRange(rangeMatch[0]);
            if (cells.includes(ref)) {
              isPartOfRange = true;
              break;
            }
          } catch {
            // 忽略解析错误
          }
        }
        if (!isPartOfRange && !deps.includes(ref)) {
          deps.push(ref);
        }
      }
    }
    
    return deps;
  }

  evaluate(formula: string): number | string {
    const snaplang = loadSnaplang();

    try {
      const lexer = new snaplang.Lexer(formula);
      const tokens = lexer.tokenize();
      const parser = new snaplang.Parser(tokens);
      const ast = parser.parse();

      const result = this.evaluator.evaluateProgram(ast);

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
      // 词法错误
      if (e.name === 'LexerError') {
        const line = e.line || 1;
        const column = e.column || 1;
        const msg = e.message?.replace('[词法错误] ', '') || '未知词法错误';
        return `#LEX! 第${line}行第${column}列: ${msg}`;
      }
      
      // 语法错误
      if (e.name === 'ParserError') {
        const line = e.line || 1;
        const column = e.column || 1;
        const msg = e.message?.replace('[语法错误] ', '') || '未知语法错误';
        return `#SYNTAX! 第${line}行第${column}列: ${msg}`;
      }
      
      // 运行时错误
      if (e.name === 'RuntimeError') {
        const msg = e.message?.replace('[运行时错误] ', '') || '未知运行时错误';
        
        // 处理未定义的标识符
        if (msg.includes('未定义的标识符')) {
          const match = msg.match(/'([^']+)'/);
          if (match) {
            const ident = match[1];
            // 如果是单元格引用
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
            // 如果是未定义的函数
            return `#NAME! 未定义的函数或变量 '${ident}'`;
          }
        }
        
        // 处理常量重新赋值错误
        if (msg.includes('不能重新赋值常量')) {
          return `#CONST! ${msg}`;
        }
        
        // 处理不可变变量重新赋值错误
        if (msg.includes('不能重新赋值不可变变量')) {
          return `#IMMUT! ${msg}`;
        }
        
        return `#RUNTIME! ${msg}`;
      }
      
      // 其他错误
      const errorMsg = e.message || '未知错误';
      return `#ERROR! ${errorMsg}`;
    }
  }
}

export function createSnapLangEngine(ctx: FormulaContext): SnapLangFormulaEngine {
  return new SnapLangFormulaEngine(ctx);
}
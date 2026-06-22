/**
 * @file engine/Evaluator.ts
 * @description 公式表达式求值器。
 *              遍历 Parser 生成的 AST 节点，执行数值、文本、日期、逻辑及工程公式计算。
 *              所有内置函数通过 switch-case 注册；工程领域公式委托至 engineeringFormulas Map。
 *              负责单元格引用求值、范围展开及统一错误码（如 #VALUE!、#NAME?、#REF!）。
 *              被 engine/index.ts 与 FormulaEngine.ts 间接使用。
 */

import { getCellsInRange, parseRange, coordsToCell } from '../utils/cellRef';
import { engineeringFormulas } from './engineeringFormulas';
import type { ASTNode, Cell } from '../types';

export interface EvaluationContext {
  getCell: (ref: string) => Cell | undefined;
}

export class Evaluator {
  private ctx: EvaluationContext;
  /** 中文函数别名映射（便于 K12 学生使用母语公式） */
  private static readonly CN_FUNCTION_ALIASES: Record<string, string> = {
    '求和': 'SUM',
    '平均值': 'AVERAGE',
    '平均': 'AVERAGE',
    '最大': 'MAX',
    '最小': 'MIN',
    '计数': 'COUNT',
    '非空计数': 'COUNTA',
    '空值计数': 'COUNTBLANK',
    '中位数': 'MEDIAN',
    '众数': 'MODE',
    '方差': 'VAR',
    '标准差': 'STDEV',
    '排名': 'RANK',
    '百分位': 'PERCENTILE',
    '四分位': 'QUARTILE',
  };

  constructor(ctx: EvaluationContext) {
    this.ctx = ctx;
  }

  private normalizeFunctionName(name: string): string {
    const upper = name.toUpperCase();
    if (upper in Evaluator.CN_FUNCTION_ALIASES) {
      return Evaluator.CN_FUNCTION_ALIASES[upper];
    }
    return Evaluator.CN_FUNCTION_ALIASES[name] || upper;
  }

  evaluate(ast: ASTNode): number | string {
    return this.evalNode(ast);
  }

  private evalNode(node: ASTNode): number | string {
    switch (node.type) {
      case 'number':
        return node.value;
      case 'string':
        return node.value;
      case 'cell':
        return this.evalCell(node.ref);
      case 'range':
        throw new Error('Range cannot be used directly outside of function');
      case 'function':
        return this.evalFunction(node.name, node.args);
      case 'binary':
        return this.evalBinary(node.op, node.left, node.right);
      case 'comparison':
        return this.evalComparison(node.op, node.left, node.right);
    }
  }

  private evalCell(ref: string): number | string {
    const cell = this.ctx.getCell(ref);
    if (!cell) return 0;
    if (cell.formula) {
      if (cell.computed !== undefined) return cell.computed;
      return cell.value;
    }
    const num = parseFloat(cell.value);
    if (!isNaN(num) && cell.value.trim() !== '') return num;
    return cell.value;
  }

  private evalFunction(rawName: string, args: ASTNode[]): number | string {
    const name = this.normalizeFunctionName(rawName);
    const flatValues: (number | string)[] = [];

    const addArg = (node: ASTNode) => {
      if (node.type === 'range') {
        const cells = getCellsInRange(node.start + ':' + node.end);
        for (const c of cells) {
          const v = this.evalCell(c);
          if (typeof v === 'string' && v.startsWith('#')) return v;
          flatValues.push(v);
        }
      } else {
        const v = this.evalNode(node);
        if (typeof v === 'string' && v.startsWith('#')) return v;
        flatValues.push(v);
      }
      return null;
    };

    for (const arg of args) {
      const err = addArg(arg);
      if (err) return err;
    }

    const numbers = flatValues
      .map(v => (typeof v === 'number' ? v : parseFloat(v as string)))
      .filter(v => !isNaN(v));

    switch (name) {
      case 'SUM':
        return numbers.reduce((a, b) => a + b, 0);
      case 'AVG':
      case 'AVERAGE':
        return numbers.length === 0 ? 0 : numbers.reduce((a, b) => a + b, 0) / numbers.length;
      case 'MAX':
        return numbers.length === 0 ? 0 : Math.max(...numbers);
      case 'MIN':
        return numbers.length === 0 ? 0 : Math.min(...numbers);
      case 'COUNT':
        return numbers.length;
      case 'COUNTA':
        return flatValues.filter(v => v !== '' && v !== undefined && v !== null).length;
      case 'COUNTBLANK':
        return flatValues.filter(v => v === '' || v === undefined || v === null).length;
      case 'MEDIAN': {
        if (numbers.length === 0) return 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      }
      case 'MODE': {
        if (numbers.length === 0) return '#N/A';
        const freq = new Map<number, number>();
        for (const n of numbers) {
          freq.set(n, (freq.get(n) || 0) + 1);
        }
        let maxFreq = 0;
        let modeVal = numbers[0];
        for (const [n, f] of freq) {
          if (f > maxFreq) {
            maxFreq = f;
            modeVal = n;
          }
        }
        return modeVal;
      }
      case 'VAR':
      case 'VAR.S': {
        if (numbers.length < 2) return '#DIV/0!';
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / (numbers.length - 1);
        return variance;
      }
      case 'VARP':
      case 'VAR.P': {
        if (numbers.length === 0) return '#DIV/0!';
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
        return variance;
      }
      case 'STDEV':
      case 'STDEV.S': {
        if (numbers.length < 2) return '#DIV/0!';
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / (numbers.length - 1);
        return Math.sqrt(variance);
      }
      case 'STDEVP':
      case 'STDEV.P': {
        if (numbers.length === 0) return '#DIV/0!';
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
        return Math.sqrt(variance);
      }
      case 'RANK': {
        if (args.length < 2) return '#VALUE!';
        const num = this.evalNode(args[0]);
        const range = this.getRangeArg(args[1]);
        if (!range) return '#VALUE!';
        const order = args.length >= 3 ? this.evalNode(args[2]) : 0;
        const asc = typeof order === 'number' ? order !== 0 : String(order).toLowerCase() !== 'false';
        const n = typeof num === 'number' ? num : parseFloat(num as string);
        if (isNaN(n)) return '#VALUE!';
        const values = this.getRangeValues(range)
          .map(v => typeof v === 'number' ? v : parseFloat(v as string))
          .filter(v => !isNaN(v))
          .sort((a, b) => asc ? a - b : b - a);
        const idx = values.indexOf(n);
        return idx === -1 ? '#N/A' : idx + 1;
      }
      case 'PERCENTILE': {
        if (args.length < 2) return '#VALUE!';
        const k = this.evalNode(args[1]);
        const kp = typeof k === 'number' ? k : parseFloat(k as string);
        if (isNaN(kp) || kp < 0 || kp > 1) return '#NUM!';
        if (numbers.length === 0) return '#N/A';
        const sorted = [...numbers].sort((a, b) => a - b);
        if (sorted.length === 1) return sorted[0];
        const idx = (sorted.length - 1) * kp;
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        if (lower === upper) return sorted[lower];
        const weight = idx - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
      }
      case 'QUARTILE': {
        if (args.length < 2) return '#VALUE!';
        const q = this.evalNode(args[1]);
        const qi = typeof q === 'number' ? q : parseInt(q as string, 10);
        if (isNaN(qi) || qi < 0 || qi > 4) return '#NUM!';
        if (numbers.length === 0) return '#N/A';
        const sorted = [...numbers].sort((a, b) => a - b);
        if (qi === 0) return sorted[0];
        if (qi === 4) return sorted[sorted.length - 1];
        const idx = (sorted.length - 1) * (qi / 4);
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        if (lower === upper) return sorted[lower];
        const weight = idx - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
      }
      case 'ROUND': {
        if (args.length < 1) return '#VALUE!';
        const value = this.evalNode(args[0]);
        const digits = args.length >= 2 ? this.evalNode(args[1]) : 0;
        const n = typeof value === 'number' ? value : parseFloat(value as string);
        const d = typeof digits === 'number' ? digits : parseInt(digits as string, 10);
        if (isNaN(n) || isNaN(d)) return '#VALUE!';
        return parseFloat(n.toFixed(d));
      }
      case 'ROUNDUP': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const d = args.length >= 2 ? this.evalNode(args[1]) : 0;
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        const digits = typeof d === 'number' ? d : parseInt(d as string, 10);
        if (isNaN(n) || isNaN(digits)) return '#VALUE!';
        const factor = Math.pow(10, digits);
        return Math.ceil(n * factor) / factor;
      }
      case 'ROUNDDOWN': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const d = args.length >= 2 ? this.evalNode(args[1]) : 0;
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        const digits = typeof d === 'number' ? d : parseInt(d as string, 10);
        if (isNaN(n) || isNaN(digits)) return '#VALUE!';
        const factor = Math.pow(10, digits);
        return Math.floor(n * factor) / factor;
      }
      case 'ABS': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.abs(n);
      }
      case 'INT': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.floor(n);
      }
      case 'CEILING': {
        if (args.length < 2) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const s = this.evalNode(args[1]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        const sig = typeof s === 'number' ? s : parseFloat(s as string);
        if (isNaN(n) || isNaN(sig) || sig === 0) return '#VALUE!';
        return Math.ceil(n / sig) * sig;
      }
      case 'FLOOR': {
        if (args.length < 2) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const s = this.evalNode(args[1]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        const sig = typeof s === 'number' ? s : parseFloat(s as string);
        if (isNaN(n) || isNaN(sig) || sig === 0) return '#VALUE!';
        return Math.floor(n / sig) * sig;
      }
      case 'MOD': {
        if (args.length < 2) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const d = this.evalNode(args[1]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        const div = typeof d === 'number' ? d : parseFloat(d as string);
        if (isNaN(n) || isNaN(div) || div === 0) return '#VALUE!';
        return n % div;
      }
      case 'PI':
        return Math.PI;
      case 'RAND':
        return Math.random();
      case 'RANDBETWEEN': {
        if (args.length < 2) return '#VALUE!';
        const b = this.evalNode(args[0]);
        const e = this.evalNode(args[1]);
        const bottom = typeof b === 'number' ? b : parseInt(b as string, 10);
        const top = typeof e === 'number' ? e : parseInt(e as string, 10);
        if (isNaN(bottom) || isNaN(top)) return '#VALUE!';
        return Math.floor(Math.random() * (top - bottom + 1)) + bottom;
      }
      case 'EXP': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.exp(n);
      }
      case 'LOG': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const base = args.length >= 2 ? this.evalNode(args[1]) : 10;
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        const b = typeof base === 'number' ? base : parseFloat(base as string);
        if (isNaN(n) || isNaN(b) || n <= 0 || b <= 0 || b === 1) return '#NUM!';
        return Math.log(n) / Math.log(b);
      }
      case 'LOG10': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        if (isNaN(n) || n <= 0) return '#NUM!';
        return Math.log10(n);
      }
      case 'SQRT': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        if (isNaN(n)) return '#VALUE!';
        if (n < 0) return '#NUM!';
        return Math.sqrt(n);
      }
      case 'POWER': {
        if (args.length < 2) return '#VALUE!';
        const b = this.evalNode(args[0]);
        const e = this.evalNode(args[1]);
        const base = typeof b === 'number' ? b : parseFloat(b as string);
        const exp = typeof e === 'number' ? e : parseFloat(e as string);
        if (isNaN(base) || isNaN(exp)) return '#VALUE!';
        return Math.pow(base, exp);
      }
      case 'SIN': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.sin(n);
      }
      case 'COS': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.cos(n);
      }
      case 'TAN': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.tan(n);
      }
      case 'ASIN': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        if (isNaN(n) || n < -1 || n > 1) return '#NUM!';
        return Math.asin(n);
      }
      case 'ACOS': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        if (isNaN(n) || n < -1 || n > 1) return '#NUM!';
        return Math.acos(n);
      }
      case 'ATAN': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.atan(n);
      }
      case 'ATAN2': {
        if (args.length < 2) return '#VALUE!';
        const x = this.evalNode(args[0]);
        const y = this.evalNode(args[1]);
        const nx = typeof x === 'number' ? x : parseFloat(x as string);
        const ny = typeof y === 'number' ? y : parseFloat(y as string);
        if (isNaN(nx) || isNaN(ny)) return '#VALUE!';
        return Math.atan2(ny, nx);
      }
      case 'SIGN': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const n = typeof v === 'number' ? v : parseFloat(v as string);
        return isNaN(n) ? '#VALUE!' : Math.sign(n);
      }
      case 'IF': {
        if (args.length < 3) return '#VALUE!';
        const cond = this.evalNode(args[0]);
        if (typeof cond === 'string' && cond.startsWith('#')) return cond;
        const condTrue = typeof cond === 'number' ? cond !== 0 : cond !== '' && cond !== '0' && cond !== 'false';
        return this.evalNode(condTrue ? args[1] : args[2]);
      }
      case 'IFERROR': {
        if (args.length < 2) return '#VALUE!';
        const value = this.evalNode(args[0]);
        if (typeof value === 'string' && value.startsWith('#')) {
          return this.evalNode(args[1]);
        }
        return value;
      }
      case 'IFNA': {
        if (args.length < 2) return '#VALUE!';
        const v = this.evalNode(args[0]);
        if (typeof v === 'string' && v === '#N/A') {
          return this.evalNode(args[1]);
        }
        return v;
      }
      case 'AND': {
        for (const arg of args) {
          const v = this.evalNode(arg);
          if (typeof v === 'string' && v.startsWith('#')) return v;
          const cond = typeof v === 'number' ? v !== 0 : v !== '' && v !== '0' && v !== 'false';
          if (!cond) return 0;
        }
        return 1;
      }
      case 'OR': {
        for (const arg of args) {
          const v = this.evalNode(arg);
          if (typeof v === 'string' && v.startsWith('#')) return v;
          const cond = typeof v === 'number' ? v !== 0 : v !== '' && v !== '0' && v !== 'false';
          if (cond) return 1;
        }
        return 0;
      }
      case 'NOT': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        if (typeof v === 'string' && v.startsWith('#')) return v;
        const cond = typeof v === 'number' ? v !== 0 : v !== '' && v !== '0' && v !== 'false';
        return cond ? 0 : 1;
      }
      case 'XOR': {
        let trueCount = 0;
        for (const arg of args) {
          const v = this.evalNode(arg);
          if (typeof v === 'string' && v.startsWith('#')) return v;
          const cond = typeof v === 'number' ? v !== 0 : v !== '' && v !== '0' && v !== 'false';
          if (cond) trueCount++;
        }
        return trueCount % 2 === 1 ? 1 : 0;
      }
      case 'ISNUMBER': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return typeof v === 'number' ? 1 : (isNaN(parseFloat(v as string)) ? 0 : 1);
      }
      case 'ISTEXT': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return typeof v === 'string' && !v.startsWith('#') && isNaN(parseFloat(v)) ? 1 : 0;
      }
      case 'ISBLANK': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return (v === '' || v === undefined || v === null) ? 1 : 0;
      }
      case 'ISERROR': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return typeof v === 'string' && v.startsWith('#') ? 1 : 0;
      }
      case 'CHOOSE': {
        if (args.length < 2) return '#VALUE!';
        const idx = this.evalNode(args[0]);
        const i = typeof idx === 'number' ? idx : parseInt(idx as string, 10);
        if (isNaN(i) || i < 1 || i >= args.length) return '#VALUE!';
        return this.evalNode(args[i]);
      }
      case 'SWITCH': {
        if (args.length < 3) return '#VALUE!';
        const expr = this.evalNode(args[0]);
        for (let i = 1; i < args.length - 1; i += 2) {
          const match = this.evalNode(args[i]);
          if (String(expr) === String(match)) {
            return this.evalNode(args[i + 1]);
          }
        }
        if (args.length % 2 === 0) {
          return this.evalNode(args[args.length - 1]);
        }
        return '#N/A';
      }
      case 'CONCAT':
      case 'CONCATENATE':
        return flatValues.map(v => String(v)).join('');
      case 'LEFT': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const num = args.length >= 2 ? this.evalNode(args[1]) : 1;
        const n = typeof num === 'number' ? num : parseInt(num as string, 10);
        if (isNaN(n)) return '#VALUE!';
        return text.slice(0, Math.max(0, n));
      }
      case 'RIGHT': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const num = args.length >= 2 ? this.evalNode(args[1]) : 1;
        const n = typeof num === 'number' ? num : parseInt(num as string, 10);
        if (isNaN(n)) return '#VALUE!';
        return text.slice(-Math.max(0, n));
      }
      case 'MID': {
        if (args.length < 3) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const start = this.evalNode(args[1]);
        const len = this.evalNode(args[2]);
        const s = typeof start === 'number' ? start : parseInt(start as string, 10);
        const l = typeof len === 'number' ? len : parseInt(len as string, 10);
        if (isNaN(s) || isNaN(l)) return '#VALUE!';
        return text.slice(Math.max(0, s - 1), Math.max(0, s - 1) + Math.max(0, l));
      }
      case 'LEN': {
        if (args.length < 1) return '#VALUE!';
        return String(this.evalNode(args[0])).length;
      }
      case 'TRIM': {
        if (args.length < 1) return '#VALUE!';
        return String(this.evalNode(args[0])).trim();
      }
      case 'UPPER': {
        if (args.length < 1) return '#VALUE!';
        return String(this.evalNode(args[0])).toUpperCase();
      }
      case 'LOWER': {
        if (args.length < 1) return '#VALUE!';
        return String(this.evalNode(args[0])).toLowerCase();
      }
      case 'PROPER': {
        if (args.length < 1) return '#VALUE!';
        return String(this.evalNode(args[0])).replace(/\b\w/g, ch => ch.toUpperCase());
      }
      case 'REPT': {
        if (args.length < 2) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const num = this.evalNode(args[1]);
        const n = typeof num === 'number' ? num : parseInt(num as string, 10);
        if (isNaN(n) || n < 0) return '#VALUE!';
        return text.repeat(n);
      }
      case 'FIND': {
        if (args.length < 2) return '#VALUE!';
        const findText = String(this.evalNode(args[0]));
        const withinText = String(this.evalNode(args[1]));
        const startNum = args.length >= 3 ? this.evalNode(args[2]) : 1;
        const s = typeof startNum === 'number' ? startNum : parseInt(startNum as string, 10);
        if (isNaN(s) || s < 1) return '#VALUE!';
        const idx = withinText.indexOf(findText, s - 1);
        return idx === -1 ? '#VALUE!' : idx + 1;
      }
      case 'SEARCH': {
        if (args.length < 2) return '#VALUE!';
        const findText = String(this.evalNode(args[0]));
        const withinText = String(this.evalNode(args[1]));
        const startNum = args.length >= 3 ? this.evalNode(args[2]) : 1;
        const s = typeof startNum === 'number' ? startNum : parseInt(startNum as string, 10);
        if (isNaN(s) || s < 1) return '#VALUE!';
        const idx = withinText.toLowerCase().indexOf(findText.toLowerCase(), s - 1);
        return idx === -1 ? '#VALUE!' : idx + 1;
      }
      case 'SUBSTITUTE': {
        if (args.length < 3) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const oldText = String(this.evalNode(args[1]));
        const newText = String(this.evalNode(args[2]));
        const instanceNum = args.length >= 4 ? this.evalNode(args[3]) : undefined;
        if (oldText === '') return text;
        if (instanceNum !== undefined) {
          const n = typeof instanceNum === 'number' ? instanceNum : parseInt(instanceNum as string, 10);
          if (isNaN(n) || n < 1) return '#VALUE!';
          let count = 0;
          return text.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
            count++;
            return count === n ? newText : match;
          });
        }
        return text.split(oldText).join(newText);
      }
      case 'REPLACE': {
        if (args.length < 4) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const startNum = this.evalNode(args[1]);
        const numChars = this.evalNode(args[2]);
        const newText = String(this.evalNode(args[3]));
        const s = typeof startNum === 'number' ? startNum : parseInt(startNum as string, 10);
        const n = typeof numChars === 'number' ? numChars : parseInt(numChars as string, 10);
        if (isNaN(s) || isNaN(n) || s < 1) return '#VALUE!';
        return text.slice(0, s - 1) + newText + text.slice(s - 1 + n);
      }
      case 'EXACT': {
        if (args.length < 2) return '#VALUE!';
        return String(this.evalNode(args[0])) === String(this.evalNode(args[1])) ? 1 : 0;
      }
      case 'TEXT': {
        if (args.length < 2) return '#VALUE!';
        const value = this.evalNode(args[0]);
        const format = String(this.evalNode(args[1]));
        const n = typeof value === 'number' ? value : parseFloat(value as string);
        if (!isNaN(n)) {
          if (format.includes('0.00')) return n.toFixed(2);
          if (format.includes('0.0')) return n.toFixed(1);
          if (format.includes('0')) return String(Math.round(n));
          if (format.includes('yyyy')) {
            const date = new Date(n);
            if (!isNaN(date.getTime())) {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
          }
        }
        return String(value);
      }
      case 'TODAY':
        return new Date().toISOString().split('T')[0];
      case 'NOW':
        return new Date().toISOString();
      case 'DATE': {
        if (args.length < 3) return '#VALUE!';
        const y = this.evalNode(args[0]);
        const m = this.evalNode(args[1]);
        const d = this.evalNode(args[2]);
        const year = typeof y === 'number' ? y : parseInt(y as string, 10);
        const month = typeof m === 'number' ? m : parseInt(m as string, 10);
        const day = typeof d === 'number' ? d : parseInt(d as string, 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return '#VALUE!';
        const date = new Date(year, month - 1, day);
        return date.toISOString().split('T')[0];
      }
      case 'TIME': {
        if (args.length < 3) return '#VALUE!';
        const h = this.evalNode(args[0]);
        const m = this.evalNode(args[1]);
        const s = this.evalNode(args[2]);
        const hour = typeof h === 'number' ? h : parseInt(h as string, 10);
        const minute = typeof m === 'number' ? m : parseInt(m as string, 10);
        const second = typeof s === 'number' ? s : parseInt(s as string, 10);
        if (isNaN(hour) || isNaN(minute) || isNaN(second)) return '#VALUE!';
        return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':' + String(second).padStart(2, '0');
      }
      case 'YEAR': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        return date.getFullYear();
      }
      case 'MONTH': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        return date.getMonth() + 1;
      }
      case 'DAY': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        return date.getDate();
      }
      case 'HOUR': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        return date.getHours();
      }
      case 'MINUTE': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        return date.getMinutes();
      }
      case 'SECOND': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        return date.getSeconds();
      }
      case 'WEEKDAY': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        return date.getDay() + 1;
      }
      case 'WEEKNUM': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        const date = new Date(String(v));
        if (isNaN(date.getTime())) return '#VALUE!';
        const start = new Date(date.getFullYear(), 0, 1);
        const diff = date.getTime() - start.getTime();
        return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
      }
      case 'DATEDIF': {
        if (args.length < 3) return '#VALUE!';
        const start = new Date(String(this.evalNode(args[0])));
        const end = new Date(String(this.evalNode(args[1])));
        const unit = String(this.evalNode(args[2])).toLowerCase();
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '#VALUE!';
        const diffMs = end.getTime() - start.getTime();
        if (unit === 'd') return Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (unit === 'm') {
          return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        }
        if (unit === 'y') return end.getFullYear() - start.getFullYear();
        return '#VALUE!';
      }
      case 'COUNTIF':
        return this.evalCountIf(args);
      case 'SUMIF':
        return this.evalSumIf(args);
      case 'AVERAGEIF':
        return this.evalAverageIf(args);
      case 'SUMIFS': {
        if (args.length < 3 || args.length % 2 === 0) return '#VALUE!';
        const sumRange = this.getRangeArg(args[0]);
        if (!sumRange) return '#VALUE!';
        const criteriaRanges: string[][] = [];
        const criteriaValues: (number | string)[] = [];
        for (let i = 1; i < args.length; i += 2) {
          const cr = this.getRangeArg(args[i]);
          if (!cr) return '#VALUE!';
          criteriaRanges.push(cr);
          const cv = this.evalNode(args[i + 1]);
          criteriaValues.push(cv);
        }
        const len = sumRange.length;
        for (const cr of criteriaRanges) {
          if (cr.length !== len) return '#VALUE!';
        }
        let sum = 0;
        for (let i = 0; i < len; i++) {
          let allMatch = true;
          for (let j = 0; j < criteriaRanges.length; j++) {
            const v = this.getRangeValues(criteriaRanges[j])[i];
            if (!this.matchesCriteria(v, criteriaValues[j])) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            const raw = this.evalCell(sumRange[i]);
            const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
            if (!isNaN(n)) sum += n;
          }
        }
        return sum;
      }
      case 'COUNTIFS': {
        if (args.length < 2 || args.length % 2 === 1) return '#VALUE!';
        const criteriaRanges: string[][] = [];
        const criteriaValues: (number | string)[] = [];
        for (let i = 0; i < args.length; i += 2) {
          const cr = this.getRangeArg(args[i]);
          if (!cr) return '#VALUE!';
          criteriaRanges.push(cr);
          const cv = this.evalNode(args[i + 1]);
          criteriaValues.push(cv);
        }
        const len = criteriaRanges[0].length;
        for (const cr of criteriaRanges) {
          if (cr.length !== len) return '#VALUE!';
        }
        let count = 0;
        for (let i = 0; i < len; i++) {
          let allMatch = true;
          for (let j = 0; j < criteriaRanges.length; j++) {
            const v = this.getRangeValues(criteriaRanges[j])[i];
            if (!this.matchesCriteria(v, criteriaValues[j])) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) count++;
        }
        return count;
      }
      case 'AVERAGEIFS': {
        if (args.length < 3 || args.length % 2 === 0) return '#VALUE!';
        const avgRange = this.getRangeArg(args[0]);
        if (!avgRange) return '#VALUE!';
        const criteriaRanges: string[][] = [];
        const criteriaValues: (number | string)[] = [];
        for (let i = 1; i < args.length; i += 2) {
          const cr = this.getRangeArg(args[i]);
          if (!cr) return '#VALUE!';
          criteriaRanges.push(cr);
          const cv = this.evalNode(args[i + 1]);
          criteriaValues.push(cv);
        }
        const len = avgRange.length;
        for (const cr of criteriaRanges) {
          if (cr.length !== len) return '#VALUE!';
        }
        let sum = 0;
        let count = 0;
        for (let i = 0; i < len; i++) {
          let allMatch = true;
          for (let j = 0; j < criteriaRanges.length; j++) {
            const v = this.getRangeValues(criteriaRanges[j])[i];
            if (!this.matchesCriteria(v, criteriaValues[j])) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            const raw = this.evalCell(avgRange[i]);
            const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
            if (!isNaN(n)) {
              sum += n;
              count++;
            }
          }
        }
        return count === 0 ? '#DIV/0!' : sum / count;
      }
      case 'VLOOKUP':
        return this.evalVLookup(args);
      case 'HLOOKUP':
        return this.evalHLookup(args);
      case 'MATCH':
        return this.evalMatch(args);
      case 'INDEX':
        return this.evalIndex(args);
      case 'SUMPRODUCT': {
        if (args.length < 2) return '#VALUE!';
        const ranges: string[][] = [];
        for (const arg of args) {
          const range = this.getRangeArg(arg);
          if (!range) return '#VALUE!';
          ranges.push(range);
        }
        const len = ranges[0].length;
        for (const r of ranges) {
          if (r.length !== len) return '#VALUE!';
        }
        let sum = 0;
        for (let i = 0; i < len; i++) {
          let product = 1;
          for (const r of ranges) {
            const v = this.evalCell(r[i]);
            const n = typeof v === 'number' ? v : parseFloat(v as string);
            if (isNaN(n)) return '#VALUE!';
            product *= n;
          }
          sum += product;
        }
        return sum;
      }
      case 'OFFSET': {
        if (args.length < 3) return '#VALUE!';
        const ref = this.getRangeArg(args[0]);
        if (!ref || ref.length === 0) return '#VALUE!';
        const baseRef = ref[0];
        const rows = this.evalNode(args[1]);
        const cols = this.evalNode(args[2]);
        const height = args.length >= 4 ? this.evalNode(args[3]) : 1;
        const width = args.length >= 5 ? this.evalNode(args[4]) : 1;
        const rOffset = typeof rows === 'number' ? rows : parseInt(rows as string, 10);
        const cOffset = typeof cols === 'number' ? cols : parseInt(cols as string, 10);
        const h = typeof height === 'number' ? height : parseInt(height as string, 10);
        const w = typeof width === 'number' ? width : parseInt(width as string, 10);
        if (isNaN(rOffset) || isNaN(cOffset) || isNaN(h) || isNaN(w)) return '#VALUE!';
        return this.evalCell(baseRef);
      }
      case 'INDIRECT': {
        if (args.length < 1) return '#VALUE!';
        const refText = String(this.evalNode(args[0]));
        return this.evalCell(refText);
      }

      // ==================== 逻辑基础函数 ====================
      case 'TRUE':
        return 1;
      case 'FALSE':
        return 0;
      case 'NAND': {
        if (args.length < 2) return '#VALUE!';
        return !(this.toLogical(this.evalNode(args[0])) && this.toLogical(this.evalNode(args[1]))) ? 1 : 0;
      }
      case 'NOR': {
        if (args.length < 2) return '#VALUE!';
        return !(this.toLogical(this.evalNode(args[0])) || this.toLogical(this.evalNode(args[1]))) ? 1 : 0;
      }
      case 'XNOR': {
        if (args.length < 2) return '#VALUE!';
        return (this.toLogical(this.evalNode(args[0])) === this.toLogical(this.evalNode(args[1]))) ? 1 : 0;
      }
      case 'IMPLIES': {
        if (args.length < 2) return '#VALUE!';
        return (!this.toLogical(this.evalNode(args[0])) || this.toLogical(this.evalNode(args[1]))) ? 1 : 0;
      }
      case 'EQ': {
        if (args.length < 2) return '#VALUE!';
        return String(this.evalNode(args[0])) === String(this.evalNode(args[1])) ? 1 : 0;
      }
      case 'ISEVEN': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        return isNaN(n) ? '#VALUE!' : (n % 2 === 0 ? 1 : 0);
      }
      case 'ISODD': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        return isNaN(n) ? '#VALUE!' : (n % 2 !== 0 ? 1 : 0);
      }
      case 'ISLOGICAL': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return (v === 0 || v === 1) ? 1 : 0;
      }
      case 'ISNONTEXT': {
        if (args.length < 1) return '#VALUE!';
        return typeof this.evalNode(args[0]) === 'number' ? 1 : 0;
      }
      case 'ISREF': {
        if (args.length < 1) return '#VALUE!';
        const t = args[0].type;
        return (t === 'cell' || t === 'range') ? 1 : 0;
      }
      case 'TYPE': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        if (typeof v === 'number') return 1;
        if (typeof v === 'string' && v.startsWith('#')) return 16;
        return 2;
      }
      case 'NA':
        return '#N/A';
      case 'ISERR': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return (typeof v === 'string' && v.startsWith('#') && v !== '#N/A') ? 1 : 0;
      }
      case 'ISNA': {
        if (args.length < 1) return '#VALUE!';
        return this.evalNode(args[0]) === '#N/A' ? 1 : 0;
      }
      case 'ERROR.TYPE': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        if (typeof v !== 'string' || !v.startsWith('#')) return '#N/A';
        const map: Record<string, number> = {
          '#NULL!': 1, '#DIV/0!': 2, '#VALUE!': 3, '#REF!': 4,
          '#NAME?': 5, '#NUM!': 6, '#N/A': 7
        };
        return map[v] || 8;
      }
      case 'ISNULL': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return (v === '' || v === undefined || v === null) ? 1 : 0;
      }
      case 'ISDATE': {
        if (args.length < 1) return '#VALUE!';
        return !isNaN(new Date(String(this.evalNode(args[0]))).getTime()) ? 1 : 0;
      }
      case 'ISEMPTY': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return (v === '' || v === undefined || v === null) ? 1 : 0;
      }
      case 'NOTEMPTY': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return (v !== '' && v !== undefined && v !== null) ? 1 : 0;
      }
      case 'BOOL': {
        if (args.length < 1) return '#VALUE!';
        return this.toLogical(this.evalNode(args[0])) ? 1 : 0;
      }
      case 'IN': {
        if (args.length < 2) return '#VALUE!';
        const target = String(this.evalNode(args[0]));
        for (let i = 1; i < args.length; i++) {
          if (String(this.evalNode(args[i])) === target) return 1;
        }
        return 0;
      }
      case 'BETWEEN': {
        if (args.length < 3) return '#VALUE!';
        const v = this.toNumber(this.evalNode(args[0]));
        const min = this.toNumber(this.evalNode(args[1]));
        const max = this.toNumber(this.evalNode(args[2]));
        if (isNaN(v) || isNaN(min) || isNaN(max)) return '#VALUE!';
        return (v >= min && v <= max) ? 1 : 0;
      }
      case 'COALESCE': {
        for (const arg of args) {
          const v = this.evalNode(arg);
          if (v !== '' && v !== undefined && v !== null) return v;
        }
        return '';
      }
      case 'ALL': {
        if (args.length < 2) return '#VALUE!';
        const range = this.getRangeArg(args[0]);
        const criteria = this.evalNode(args[1]);
        if (!range) return '#VALUE!';
        return this.getRangeValues(range).every(v => this.matchesCriteria(v, criteria)) ? 1 : 0;
      }
      case 'ANY': {
        if (args.length < 2) return '#VALUE!';
        const range = this.getRangeArg(args[0]);
        const criteria = this.evalNode(args[1]);
        if (!range) return '#VALUE!';
        return this.getRangeValues(range).some(v => this.matchesCriteria(v, criteria)) ? 1 : 0;
      }
      case 'SHEET':
        return 1;
      case 'SHEETS':
        return 1;

      // ==================== 数学文本函数 ====================
      case 'EVAL': {
        if (args.length < 1) return '#VALUE!';
        const expr = String(this.evalNode(args[0]));
        try {
          const safeExpr = expr.replace(/[^0-9+\-*/().\s]/g, '');
          if (!safeExpr) return '#VALUE!';
          const result = new Function(`return (${safeExpr})`)();
          return typeof result === 'number' && !isNaN(result) ? result : '#VALUE!';
        } catch {
          return '#VALUE!';
        }
      }
      case 'EXTRACTNUM': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const match = text.match(/-?\d+(\.\d+)?/);
        return match ? parseFloat(match[0]) : '#VALUE!';
      }
      case 'SCI': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        if (isNaN(n)) return '#VALUE!';
        const digits = args.length >= 2 ? this.toInteger(this.evalNode(args[1])) : 2;
        return n.toExponential(digits);
      }
      case 'ENG': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        if (isNaN(n) || n === 0) return '#VALUE!';
        const digits = args.length >= 2 ? this.toInteger(this.evalNode(args[1])) : 2;
        const exp = Math.floor(Math.log10(Math.abs(n)) / 3) * 3;
        const mantissa = n / Math.pow(10, exp);
        return `${mantissa.toFixed(digits)}E${exp}`;
      }
      case 'CONVERT': {
        if (args.length < 3) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        if (isNaN(n)) return '#VALUE!';
        const from = String(this.evalNode(args[1])).toLowerCase();
        const to = String(this.evalNode(args[2])).toLowerCase();
        const length: Record<string, number> = { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
        if (from in length && to in length) return n * length[from] / length[to];
        const mass: Record<string, number> = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.0283495 };
        if (from in mass && to in mass) return n * mass[from] / mass[to];
        if (from === 'c' && to === 'f') return n * 9 / 5 + 32;
        if (from === 'f' && to === 'c') return (n - 32) * 5 / 9;
        if (from === 'c' && to === 'k') return n + 273.15;
        if (from === 'k' && to === 'c') return n - 273.15;
        return '#VALUE!';
      }
      case 'BASE': {
        if (args.length < 2) return '#VALUE!';
        const n = this.toInteger(this.evalNode(args[0]));
        const radix = this.toInteger(this.evalNode(args[1]));
        if (isNaN(n) || isNaN(radix) || radix < 2 || radix > 36) return '#VALUE!';
        const minLen = args.length >= 3 ? this.toInteger(this.evalNode(args[2])) : 0;
        let result = n.toString(radix).toUpperCase();
        while (result.length < minLen) result = '0' + result;
        return result;
      }
      case 'DECIMAL': {
        if (args.length < 2) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const radix = this.toInteger(this.evalNode(args[1]));
        if (isNaN(radix) || radix < 2 || radix > 36) return '#VALUE!';
        const result = parseInt(text, radix);
        return isNaN(result) ? '#VALUE!' : result;
      }
      case 'ROMAN': {
        if (args.length < 1) return '#VALUE!';
        let n = this.toInteger(this.evalNode(args[0]));
        if (isNaN(n) || n <= 0 || n >= 4000) return '#VALUE!';
        const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let result = '';
        for (let i = 0; i < values.length; i++) {
          while (n >= values[i]) {
            result += symbols[i];
            n -= values[i];
          }
        }
        return result;
      }
      case 'ARABIC': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0])).toUpperCase();
        const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        let total = 0;
        for (let i = 0; i < text.length; i++) {
          const current = map[text[i]] || 0;
          const next = map[text[i + 1]] || 0;
          total += next > current ? -current : current;
        }
        return total;
      }
      case 'FACTDOUBLE': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toInteger(this.evalNode(args[0]));
        if (isNaN(n) || n < 0 || n > 170) return '#VALUE!';
        let result = 1;
        for (let i = n; i >= 1; i -= 2) result *= i;
        return result;
      }
      case 'GCD': {
        if (args.length < 1) return '#VALUE!';
        const nums = args.map(a => this.toNumber(this.evalNode(a))).filter(n => !isNaN(n) && n > 0);
        if (nums.length === 0) return '#VALUE!';
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        return nums.reduce((a, b) => gcd(a, b));
      }
      case 'LCM': {
        if (args.length < 1) return '#VALUE!';
        const nums = args.map(a => this.toNumber(this.evalNode(a))).filter(n => !isNaN(n) && n > 0);
        if (nums.length === 0) return '#VALUE!';
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
        return nums.reduce((a, b) => lcm(a, b));
      }
      case 'MROUND': {
        if (args.length < 2) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        const m = this.toNumber(this.evalNode(args[1]));
        if (isNaN(n) || isNaN(m) || m === 0) return '#VALUE!';
        return Math.round(n / m) * m;
      }
      case 'QUOTIENT': {
        if (args.length < 2) return '#VALUE!';
        const a = this.toNumber(this.evalNode(args[0]));
        const b = this.toNumber(this.evalNode(args[1]));
        if (isNaN(a) || isNaN(b) || b === 0) return '#VALUE!';
        return Math.trunc(a / b);
      }
      case 'SQRTPI': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        return isNaN(n) || n < 0 ? '#VALUE!' : Math.sqrt(n * Math.PI);
      }
      case 'SUMSQ': {
        return numbers.reduce((sum, n) => sum + n * n, 0);
      }
      case 'FACT': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toInteger(this.evalNode(args[0]));
        if (isNaN(n) || n < 0 || n > 170) return '#VALUE!';
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
      }
      case 'COMBIN': {
        if (args.length < 2) return '#VALUE!';
        const n = this.toInteger(this.evalNode(args[0]));
        const k = this.toInteger(this.evalNode(args[1]));
        if (isNaN(n) || isNaN(k) || n < 0 || k < 0 || k > n) return '#VALUE!';
        let result = 1;
        for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
        return result;
      }
      case 'PERMUT': {
        if (args.length < 2) return '#VALUE!';
        const n = this.toInteger(this.evalNode(args[0]));
        const k = this.toInteger(this.evalNode(args[1]));
        if (isNaN(n) || isNaN(k) || n < 0 || k < 0 || k > n) return '#VALUE!';
        let result = 1;
        for (let i = 0; i < k; i++) result *= (n - i);
        return result;
      }
      case 'GEOMEAN': {
        if (numbers.length === 0) return '#NUM!';
        const product = numbers.reduce((p, n) => p * n, 1);
        if (product <= 0) return '#NUM!';
        return Math.pow(product, 1 / numbers.length);
      }
      case 'HARMEAN': {
        if (numbers.length === 0) return '#DIV/0!';
        const reciprocals = numbers.filter(n => n !== 0);
        if (reciprocals.length === 0) return '#DIV/0!';
        return reciprocals.length / reciprocals.reduce((sum, n) => sum + 1 / n, 0);
      }
      case 'LARGE': {
        if (args.length < 2) return '#VALUE!';
        const k = this.toInteger(this.evalNode(args[1]));
        if (isNaN(k) || k < 1 || k > numbers.length) return '#VALUE!';
        return [...numbers].sort((a, b) => b - a)[k - 1];
      }
      case 'SMALL': {
        if (args.length < 2) return '#VALUE!';
        const k = this.toInteger(this.evalNode(args[1]));
        if (isNaN(k) || k < 1 || k > numbers.length) return '#VALUE!';
        return [...numbers].sort((a, b) => a - b)[k - 1];
      }
      case 'TRIMMEAN': {
        if (args.length < 2) return '#VALUE!';
        const percent = this.toNumber(this.evalNode(args[1]));
        if (isNaN(percent) || percent < 0 || percent >= 1) return '#NUM!';
        if (numbers.length === 0) return '#DIV/0!';
        const sorted = [...numbers].sort((a, b) => a - b);
        const trimCount = Math.floor(sorted.length * percent / 2);
        const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
        return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      }
      case 'TEXTJOIN': {
        if (args.length < 3) return '#VALUE!';
        const delimiter = String(this.evalNode(args[0]));
        const ignoreEmpty = this.toLogical(this.evalNode(args[1]));
        const texts = flatValues.slice(2).map(v => String(v)).filter(v => !ignoreEmpty || v !== '');
        return texts.join(delimiter);
      }
      case 'CHAR': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toInteger(this.evalNode(args[0]));
        return isNaN(n) || n < 1 || n > 255 ? '#VALUE!' : String.fromCharCode(n);
      }
      case 'CODE': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        return text.length === 0 ? '#VALUE!' : text.charCodeAt(0);
      }
      case 'UNICHAR': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toInteger(this.evalNode(args[0]));
        return isNaN(n) ? '#VALUE!' : String.fromCodePoint(n);
      }
      case 'UNICODE': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        return text.length === 0 ? '#VALUE!' : (text.codePointAt(0) ?? 0);
      }
      case 'CLEAN': {
        if (args.length < 1) return '#VALUE!';
        // eslint-disable-next-line no-control-regex
        return String(this.evalNode(args[0])).replace(/[\x00-\x1F]/g, '');
      }
      case 'DOLLAR': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        if (isNaN(n)) return '#VALUE!';
        const decimals = args.length >= 2 ? this.toInteger(this.evalNode(args[1])) : 2;
        return '$' + n.toFixed(decimals);
      }
      case 'FIXED': {
        if (args.length < 1) return '#VALUE!';
        const n = this.toNumber(this.evalNode(args[0]));
        if (isNaN(n)) return '#VALUE!';
        const decimals = args.length >= 2 ? this.toInteger(this.evalNode(args[1])) : 2;
        return n.toFixed(decimals);
      }
      case 'VALUE': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0])).trim();
        const n = parseFloat(text.replace(/[$,%]/g, ''));
        return isNaN(n) ? '#VALUE!' : n;
      }
      case 'T': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        return typeof v === 'string' ? v : '';
      }
      case 'N': {
        if (args.length < 1) return '#VALUE!';
        const v = this.evalNode(args[0]);
        if (typeof v === 'number') return v;
        const n = parseFloat(String(v));
        return isNaN(n) ? 0 : n;
      }
      case 'WORDCOUNT': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0])).trim();
        return text === '' ? 0 : text.split(/\s+/).length;
      }
      case 'SENTENCECOUNT': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0])).trim();
        return text === '' ? 0 : text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0).length;
      }
      case 'REVERSE': {
        if (args.length < 1) return '#VALUE!';
        return String(this.evalNode(args[0])).split('').reverse().join('');
      }
      case 'PADSTART': {
        if (args.length < 3) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const len = this.toInteger(this.evalNode(args[1]));
        const pad = String(this.evalNode(args[2]));
        if (isNaN(len)) return '#VALUE!';
        return text.padStart(len, pad);
      }
      case 'PADEND': {
        if (args.length < 3) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const len = this.toInteger(this.evalNode(args[1]));
        const pad = String(this.evalNode(args[2]));
        if (isNaN(len)) return '#VALUE!';
        return text.padEnd(len, pad);
      }
      case 'TRUNCATE': {
        if (args.length < 2) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const len = this.toInteger(this.evalNode(args[1]));
        if (isNaN(len)) return '#VALUE!';
        return text.slice(0, len);
      }
      case 'ELLIPSIS': {
        if (args.length < 2) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const maxLen = this.toInteger(this.evalNode(args[1]));
        if (isNaN(maxLen)) return '#VALUE!';
        return text.length <= maxLen ? text : text.slice(0, maxLen - 1) + '…';
      }

      // ==================== 日期时间函数 ====================
      case 'DATEVALUE': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        return d ? Math.floor(d.getTime() / (24 * 60 * 60 * 1000)) + 25569 : '#VALUE!';
      }
      case 'TIMEVALUE': {
        if (args.length < 1) return '#VALUE!';
        const text = String(this.evalNode(args[0]));
        const parts = text.split(':').map(p => parseFloat(p));
        if (parts.some(isNaN)) return '#VALUE!';
        const [h = 0, m = 0, s = 0] = parts;
        return (h * 3600 + m * 60 + s) / 86400;
      }
      case 'DATEDIFF': {
        if (args.length < 2) return '#VALUE!';
        const d1 = this.parseDate(this.evalNode(args[0]));
        const d2 = this.parseDate(this.evalNode(args[1]));
        if (!d1 || !d2) return '#VALUE!';
        return Math.floor((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
      }
      case 'EDATE': {
        if (args.length < 2) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const months = this.toInteger(this.evalNode(args[1]));
        if (!d || isNaN(months)) return '#VALUE!';
        return this.formatDate(this.addMonths(d, months));
      }
      case 'EOMONTH': {
        if (args.length < 2) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const months = this.toInteger(this.evalNode(args[1]));
        if (!d || isNaN(months)) return '#VALUE!';
        const next = this.addMonths(d, months + 1);
        next.setDate(0);
        return this.formatDate(next);
      }
      case 'WORKDAY': {
        if (args.length < 2) return '#VALUE!';
        const start = this.parseDate(this.evalNode(args[0]));
        const days = this.toInteger(this.evalNode(args[1]));
        if (!start || isNaN(days)) return '#VALUE!';
        const holidays = this.getHolidays(args, 2);
        const current = new Date(start);
        const step = days > 0 ? 1 : -1;
        let remaining = Math.abs(days);
        while (remaining > 0) {
          current.setDate(current.getDate() + step);
          if (!this.isWeekend(current) && !holidays.has(this.formatDate(current))) {
            remaining--;
          }
        }
        return this.formatDate(current);
      }
      case 'NETWORKDAYS': {
        if (args.length < 2) return '#VALUE!';
        const start = this.parseDate(this.evalNode(args[0]));
        const end = this.parseDate(this.evalNode(args[1]));
        if (!start || !end) return '#VALUE!';
        const holidays = this.getHolidays(args, 2);
        let count = 0;
        const current = new Date(start);
        const last = new Date(end);
        const step = start <= end ? 1 : -1;
        while (true) {
          if (!this.isWeekend(current) && !holidays.has(this.formatDate(current))) count++;
          if (this.formatDate(current) === this.formatDate(last)) break;
          current.setDate(current.getDate() + step);
        }
        return count;
      }
      case 'YEARFRAC': {
        if (args.length < 2) return '#VALUE!';
        const start = this.parseDate(this.evalNode(args[0]));
        const end = this.parseDate(this.evalNode(args[1]));
        if (!start || !end) return '#VALUE!';
        return (end.getTime() - start.getTime()) / (365 * 24 * 60 * 60 * 1000);
      }
      case 'DAYS': {
        if (args.length < 2) return '#VALUE!';
        const start = this.parseDate(this.evalNode(args[0]));
        const end = this.parseDate(this.evalNode(args[1]));
        if (!start || !end) return '#VALUE!';
        return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      }
      case 'DAYS360': {
        if (args.length < 2) return '#VALUE!';
        const start = this.parseDate(this.evalNode(args[0]));
        const end = this.parseDate(this.evalNode(args[1]));
        if (!start || !end) return '#VALUE!';
        const method = args.length >= 3 ? String(this.evalNode(args[2])).toLowerCase() : 'us';
        let d1 = start.getDate();
        let d2 = end.getDate();
        if (method === 'us') {
          if (d1 === 31) d1 = 30;
          if (d2 === 31 && d1 === 30) d2 = 30;
        } else {
          if (d1 === 31) d1 = 30;
          if (d2 === 31) d2 = 30;
        }
        return ((end.getFullYear() - start.getFullYear()) * 360 +
          (end.getMonth() - start.getMonth()) * 30 +
          (d2 - d1));
      }
      case 'ISOWEEKNUM': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 60 * 60 * 1000));
      }
      case 'MONTHNAME': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return names[d.getMonth()];
      }
      case 'DAYNAME': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return names[d.getDay()];
      }
      case 'DAYSINMONTH': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      }
      case 'DAYSINYEAR': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        const year = d.getFullYear();
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
      }
      case 'LEAPYEAR': {
        if (args.length < 1) return '#VALUE!';
        const year = this.toInteger(this.evalNode(args[0]));
        if (isNaN(year)) {
          const d = this.parseDate(this.evalNode(args[0]));
          if (!d) return '#VALUE!';
          const y = d.getFullYear();
          return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 1 : 0;
        }
        return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 1 : 0;
      }
      case 'AGE': {
        if (args.length < 2) return '#VALUE!';
        const birth = this.parseDate(this.evalNode(args[0]));
        const now = this.parseDate(this.evalNode(args[1]));
        if (!birth || !now) return '#VALUE!';
        let years = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
        return years;
      }
      case 'ADDDAYS': {
        if (args.length < 2) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const days = this.toInteger(this.evalNode(args[1]));
        if (!d || isNaN(days)) return '#VALUE!';
        const result = new Date(d);
        result.setDate(result.getDate() + days);
        return this.formatDate(result);
      }
      case 'ADDMONTHS': {
        if (args.length < 2) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const months = this.toInteger(this.evalNode(args[1]));
        if (!d || isNaN(months)) return '#VALUE!';
        return this.formatDate(this.addMonths(d, months));
      }
      case 'ADDYEARS': {
        if (args.length < 2) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const years = this.toInteger(this.evalNode(args[1]));
        if (!d || isNaN(years)) return '#VALUE!';
        return this.formatDate(this.addYears(d, years));
      }
      case 'STARTOFMONTH': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        return this.formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
      case 'STARTOFYEAR': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        return this.formatDate(new Date(d.getFullYear(), 0, 1));
      }
      case 'ENDOFMONTH': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        return this.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      }
      case 'ENDOFYEAR': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        return this.formatDate(new Date(d.getFullYear(), 11, 31));
      }
      case 'NTHWEEKDAY': {
        if (args.length < 3) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const weekday = this.toInteger(this.evalNode(args[1]));
        const n = this.toInteger(this.evalNode(args[2]));
        if (!d || isNaN(weekday) || isNaN(n) || weekday < 1 || weekday > 7) return '#VALUE!';
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        const diff = (weekday - 1 - first.getDay() + 7) % 7;
        const result = new Date(first);
        result.setDate(first.getDate() + diff + (n - 1) * 7);
        return this.formatDate(result);
      }
      case 'LASTWEEKDAY': {
        if (args.length < 2) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const weekday = this.toInteger(this.evalNode(args[1]));
        if (!d || isNaN(weekday) || weekday < 1 || weekday > 7) return '#VALUE!';
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const diff = (last.getDay() - (weekday - 1) + 7) % 7;
        last.setDate(last.getDate() - diff);
        return this.formatDate(last);
      }
      case 'ISHOLIDAY': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        const holidays = this.getHolidays(args, 1);
        return holidays.has(this.formatDate(d)) ? 1 : 0;
      }
      case 'NEXTWORKDAY': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        const holidays = this.getHolidays(args, 1);
        const current = new Date(d);
        do {
          current.setDate(current.getDate() + 1);
        } while (this.isWeekend(current) || holidays.has(this.formatDate(current)));
        return this.formatDate(current);
      }
      case 'PREVWORKDAY': {
        if (args.length < 1) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        if (!d) return '#VALUE!';
        const holidays = this.getHolidays(args, 1);
        const current = new Date(d);
        do {
          current.setDate(current.getDate() - 1);
        } while (this.isWeekend(current) || holidays.has(this.formatDate(current)));
        return this.formatDate(current);
      }
      case 'DATEFORMAT': {
        if (args.length < 2) return '#VALUE!';
        const d = this.parseDate(this.evalNode(args[0]));
        const fmt = String(this.evalNode(args[1]));
        if (!d) return '#VALUE!';
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        return fmt
          .replace('yyyy', String(y))
          .replace('yy', String(y).slice(-2))
          .replace('MM', String(m).padStart(2, '0'))
          .replace('M', String(m))
          .replace('dd', String(day).padStart(2, '0'))
          .replace('d', String(day))
          .replace('HH', h)
          .replace('H', String(d.getHours()))
          .replace('mm', min)
          .replace('ss', s);
      }

      // ==================== 工程领域专业公式 ====================
      default: {
        const handler = engineeringFormulas.get(name);
        if (handler) {
          return handler(args, {
            evalNode: this.evalNode.bind(this),
            evalCell: this.evalCell.bind(this),
            getRangeArg: this.getRangeArg.bind(this),
            toNumber: this.toNumber.bind(this),
            toInteger: this.toInteger.bind(this),
          });
        }
        return '#NAME?';
      }
    }
  }

  private getRangeArg(node: ASTNode): string[] | null {
    if (node.type === 'range') {
      return getCellsInRange(node.start + ':' + node.end);
    }
    if (node.type === 'cell') {
      return [node.ref];
    }
    return null;
  }

  private getRangeValues(refs: string[]): (number | string)[] {
    return refs.map(ref => this.evalCell(ref));
  }

  private toNumber(value: number | string): number {
    return typeof value === 'number' ? value : parseFloat(value);
  }

  private toInteger(value: number | string): number {
    return typeof value === 'number' ? value : parseInt(value, 10);
  }

  private toLogical(value: number | string): boolean {
    if (typeof value === 'number') return value !== 0;
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false' || value === '' || value === '0') return false;
    const n = parseFloat(value);
    return !isNaN(n) && n !== 0;
  }

  private parseDate(value: number | string): Date | null {
    if (typeof value === 'number') {
      if (value < 0 || value > 50000) return null;
      const date = new Date((value - 25569) * 24 * 60 * 60 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? null : date;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private getHolidays(args: ASTNode[], startIndex: number): Set<string> {
    const holidays = new Set<string>();
    for (let i = startIndex; i < args.length; i++) {
      const range = this.getRangeArg(args[i]);
      if (range) {
        for (const ref of range) {
          const v = this.evalCell(ref);
          const d = this.parseDate(v);
          if (d) holidays.add(this.formatDate(d));
        }
      } else {
        const v = this.evalNode(args[i]);
        const d = this.parseDate(v);
        if (d) holidays.add(this.formatDate(d));
      }
    }
    return holidays;
  }

  private matchesCriteria(value: number | string, criteria: number | string): boolean {
    const strValue = String(value).trim();
    const strCriteria = String(criteria).trim();
    if (strCriteria.startsWith('>=')) {
      const n = parseFloat(strCriteria.slice(2));
      const v = parseFloat(strValue);
      return !isNaN(v) && !isNaN(n) && v >= n;
    }
    if (strCriteria.startsWith('<=')) {
      const n = parseFloat(strCriteria.slice(2));
      const v = parseFloat(strValue);
      return !isNaN(v) && !isNaN(n) && v <= n;
    }
    if (strCriteria.startsWith('>')) {
      const n = parseFloat(strCriteria.slice(1));
      const v = parseFloat(strValue);
      return !isNaN(v) && !isNaN(n) && v > n;
    }
    if (strCriteria.startsWith('<')) {
      const n = parseFloat(strCriteria.slice(1));
      const v = parseFloat(strValue);
      return !isNaN(v) && !isNaN(n) && v < n;
    }
    if (strCriteria.startsWith('=')) {
      return strValue === strCriteria.slice(1);
    }
    if (strCriteria.includes('*') || strCriteria.includes('?')) {
      const regex = new RegExp('^' + strCriteria.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return regex.test(strValue);
    }
    return strValue === strCriteria;
  }

  private evalCountIf(args: ASTNode[]): number | string {
    if (args.length < 2) return '#VALUE!';
    const range = this.getRangeArg(args[0]);
    if (!range) return '#VALUE!';
    const criteria = this.evalNode(args[1]);
    const values = this.getRangeValues(range);
    return values.filter(v => this.matchesCriteria(v, criteria)).length;
  }

  private evalSumIf(args: ASTNode[]): number | string {
    if (args.length < 2) return '#VALUE!';
    const range = this.getRangeArg(args[0]);
    if (!range) return '#VALUE!';
    const criteria = this.evalNode(args[1]);
    const sumRange = args.length >= 3 ? this.getRangeArg(args[2]) : range;
    if (!sumRange) return '#VALUE!';
    const checkValues = this.getRangeValues(range);
    const sumValues = this.getRangeValues(sumRange);
    let sum = 0;
    for (let i = 0; i < checkValues.length; i++) {
      if (this.matchesCriteria(checkValues[i], criteria)) {
        const raw = sumValues[i];
        const v = typeof raw === 'number' ? raw : parseFloat(raw as string);
        if (!isNaN(v)) {
          sum += v;
        }
      }
    }
    return sum;
  }

  private evalAverageIf(args: ASTNode[]): number | string {
    const result = this.evalSumIf(args);
    if (typeof result === 'string' && result.startsWith('#')) return result;
    const countResult = this.evalCountIf(args);
    if (typeof countResult === 'string' && countResult.startsWith('#')) return countResult;
    if (countResult === 0) return '#DIV/0!';
    return (result as number) / (countResult as number);
  }

  private evalVLookup(args: ASTNode[]): number | string {
    if (args.length < 3) return '#VALUE!';
    const lookupValue = this.evalNode(args[0]);
    const tableArray = this.getRangeArg(args[1]);
    if (!tableArray) return '#VALUE!';
    const colIndex = this.evalNode(args[2]);
    const rangeLookup = args.length >= 4 ? this.evalNode(args[3]) : true;
    const colIdx = typeof colIndex === 'number' ? colIndex : parseInt(colIndex as string, 10);
    if (isNaN(colIdx) || colIdx < 1) return '#VALUE!';
    const approximate = typeof rangeLookup === 'number' ? rangeLookup !== 0 : String(rangeLookup).toLowerCase() !== 'false';

    const parsed = parseRange(tableArray[0] + ':' + tableArray[tableArray.length - 1]);
    if (colIdx > parsed.endCol - parsed.startCol + 1) return '#REF!';

    const tableRows: string[][] = [];
    for (let r = parsed.startRow; r <= parsed.endRow; r++) {
      const rowRefs: string[] = [];
      for (let c = parsed.startCol; c <= parsed.endCol; c++) {
        rowRefs.push(coordsToCell(r, c));
      }
      tableRows.push(rowRefs);
    }

    const lookupNum = typeof lookupValue === 'number' ? lookupValue : parseFloat(lookupValue as string);
    const isNumericLookup = !isNaN(lookupNum);

    for (let i = 0; i < tableRows.length; i++) {
      const firstCellValue = this.evalCell(tableRows[i][0]);
      const firstNum = typeof firstCellValue === 'number' ? firstCellValue : parseFloat(firstCellValue as string);
      if (approximate && isNumericLookup && !isNaN(firstNum)) {
        if (firstNum > lookupNum) {
          return i === 0 ? '#N/A' : this.evalCell(tableRows[i - 1][colIdx - 1]);
        }
        if (i === tableRows.length - 1) {
          return this.evalCell(tableRows[i][colIdx - 1]);
        }
      } else {
        if (String(firstCellValue) === String(lookupValue)) {
          return this.evalCell(tableRows[i][colIdx - 1]);
        }
      }
    }
    return '#N/A';
  }

  private evalHLookup(args: ASTNode[]): number | string {
    if (args.length < 3) return '#VALUE!';
    const lookupValue = this.evalNode(args[0]);
    const tableArray = this.getRangeArg(args[1]);
    if (!tableArray) return '#VALUE!';
    const rowIndex = this.evalNode(args[2]);
    const rangeLookup = args.length >= 4 ? this.evalNode(args[3]) : true;
    const rowIdx = typeof rowIndex === 'number' ? rowIndex : parseInt(rowIndex as string, 10);
    if (isNaN(rowIdx) || rowIdx < 1) return '#VALUE!';
    const approximate = typeof rangeLookup === 'number' ? rangeLookup !== 0 : String(rangeLookup).toLowerCase() !== 'false';

    const parsed = parseRange(tableArray[0] + ':' + tableArray[tableArray.length - 1]);
    if (rowIdx > parsed.endRow - parsed.startRow + 1) return '#REF!';

    const tableCols: string[][] = [];
    for (let c = parsed.startCol; c <= parsed.endCol; c++) {
      const colRefs: string[] = [];
      for (let r = parsed.startRow; r <= parsed.endRow; r++) {
        colRefs.push(coordsToCell(r, c));
      }
      tableCols.push(colRefs);
    }

    const lookupNum = typeof lookupValue === 'number' ? lookupValue : parseFloat(lookupValue as string);
    const isNumericLookup = !isNaN(lookupNum);

    for (let i = 0; i < tableCols.length; i++) {
      const firstCellValue = this.evalCell(tableCols[i][0]);
      const firstNum = typeof firstCellValue === 'number' ? firstCellValue : parseFloat(firstCellValue as string);
      if (approximate && isNumericLookup && !isNaN(firstNum)) {
        if (firstNum > lookupNum) {
          return i === 0 ? '#N/A' : this.evalCell(tableCols[i - 1][rowIdx - 1]);
        }
        if (i === tableCols.length - 1) {
          return this.evalCell(tableCols[i][rowIdx - 1]);
        }
      } else {
        if (String(firstCellValue) === String(lookupValue)) {
          return this.evalCell(tableCols[i][rowIdx - 1]);
        }
      }
    }
    return '#N/A';
  }

  private evalMatch(args: ASTNode[]): number | string {
    if (args.length < 2) return '#VALUE!';
    const lookupValue = this.evalNode(args[0]);
    const lookupArray = this.getRangeArg(args[1]);
    if (!lookupArray) return '#VALUE!';
    const matchType = args.length >= 3 ? this.evalNode(args[2]) : 1;
    const type = typeof matchType === 'number' ? matchType : parseInt(matchType as string, 10);
    if (isNaN(type)) return '#VALUE!';

    const values = this.getRangeValues(lookupArray);
    const lookupNum = typeof lookupValue === 'number' ? lookupValue : parseFloat(lookupValue as string);
    const isNumericLookup = !isNaN(lookupNum);

    if (type === 0) {
      const idx = values.findIndex(v => String(v) === String(lookupValue));
      return idx === -1 ? '#N/A' : idx + 1;
    }

    if (!isNumericLookup) return '#N/A';
    let bestIdx = -1;
    let bestValue = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const raw = values[i];
      const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
      if (isNaN(n)) continue;
      if (type > 0) {
        if (n <= lookupNum && (bestIdx === -1 || n > bestValue)) {
          bestIdx = i;
          bestValue = n;
        }
      } else {
        if (n >= lookupNum && (bestIdx === -1 || n < bestValue)) {
          bestIdx = i;
          bestValue = n;
        }
      }
    }
    return bestIdx === -1 ? '#N/A' : bestIdx + 1;
  }

  private evalIndex(args: ASTNode[]): number | string {
    if (args.length < 2) return '#VALUE!';
    const array = this.getRangeArg(args[0]);
    if (!array) return '#VALUE!';
    const rowNum = this.evalNode(args[1]);
    const colNum = args.length >= 3 ? this.evalNode(args[2]) : 1;
    const row = typeof rowNum === 'number' ? rowNum : parseInt(rowNum as string, 10);
    const col = typeof colNum === 'number' ? colNum : parseInt(colNum as string, 10);
    if (isNaN(row) || row < 1 || isNaN(col) || col < 1) return '#VALUE!';

    const parsed = parseRange(array[0] + ':' + array[array.length - 1]);
    const actualRow = parsed.startRow + row - 1;
    const actualCol = parsed.startCol + col - 1;
    if (actualRow > parsed.endRow || actualCol > parsed.endCol) return '#REF!';
    return this.evalCell(coordsToCell(actualRow, actualCol));
  }

  private evalBinary(op: '+' | '-' | '*' | '/' | '&', left: ASTNode, right: ASTNode): number | string {
    const lv = this.evalNode(left);
    const rv = this.evalNode(right);
    if (typeof lv === 'string' && lv.startsWith('#')) return lv;
    if (typeof rv === 'string' && rv.startsWith('#')) return rv;
    
    if (op === '&') {
      return String(lv) + String(rv);
    }
    
    const ln = typeof lv === 'number' ? lv : parseFloat(lv as string) || 0;
    const rn = typeof rv === 'number' ? rv : parseFloat(rv as string) || 0;

    if (op === '+') return ln + rn;
    if (op === '-') return ln - rn;
    if (op === '*') return ln * rn;
    if (op === '/') {
      if (rn === 0) return '#DIV/0!';
      return ln / rn;
    }
    return 0;
  }

  private evalComparison(op: '>' | '<' | '>=' | '<=' | '=' | '<>', left: ASTNode, right: ASTNode): number | string {
    const lv = this.evalNode(left);
    const rv = this.evalNode(right);
    if (typeof lv === 'string' && lv.startsWith('#')) return lv;
    if (typeof rv === 'string' && rv.startsWith('#')) return rv;

    const ln = typeof lv === 'number' ? lv : parseFloat(lv as string);
    const rn = typeof rv === 'number' ? rv : parseFloat(rv as string);
    const bothNumeric = !isNaN(ln) && !isNaN(rn);

    let result = false;
    if (bothNumeric) {
      if (op === '>') result = ln > rn;
      else if (op === '<') result = ln < rn;
      else if (op === '>=') result = ln >= rn;
      else if (op === '<=') result = ln <= rn;
      else if (op === '=') result = ln === rn;
      else if (op === '<>') result = ln !== rn;
    } else {
      const ls = String(lv);
      const rs = String(rv);
      if (op === '>') result = ls > rs;
      else if (op === '<') result = ls < rs;
      else if (op === '>=') result = ls >= rs;
      else if (op === '<=') result = ls <= rs;
      else if (op === '=') result = ls === rs;
      else if (op === '<>') result = ls !== rs;
    }
    return result ? 1 : 0;
  }
}

export function collectDependencies(ast: ASTNode): string[] {
  const deps: string[] = [];
  const walk = (node: ASTNode) => {
    if (node.type === 'cell') deps.push(node.ref);
    else if (node.type === 'range') {
      const cells = getCellsInRange(node.start + ':' + node.end);
      deps.push(...cells);
    } else if (node.type === 'function') {
      node.args.forEach(walk);
    } else if (node.type === 'binary') {
      walk(node.left);
      walk(node.right);
    } else if (node.type === 'comparison') {
      walk(node.left);
      walk(node.right);
    }
  };
  walk(ast);
  return deps;
}

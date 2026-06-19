import { getCellsInRange, parseRange, coordsToCell } from '../utils/cellRef';
import type { ASTNode, Cell } from '../types';

export interface EvaluationContext {
  getCell: (ref: string) => Cell | undefined;
}

export class Evaluator {
  private ctx: EvaluationContext;

  constructor(ctx: EvaluationContext) {
    this.ctx = ctx;
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

  private evalFunction(name: string, args: ASTNode[]): number | string {
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
      default:
        return '#NAME?';
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

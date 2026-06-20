import type { Cell } from '../types';

const SNAPLANG_PATH = '../../snaplang-v1.0.0/dist';

let snaplangModule: {
  Lexer: any;
  Parser: any;
  Evaluator: any;
  run: (source: string) => { success: boolean; result: any; error?: string };
  createEnvironment: any;
  defineVariable: any;
  getVariable: any;
  setVariable: any;
  isTruthy: any;
  stringify: any;
  makeNativeFunction: any;
} | null = null;

function loadSnaplang() {
  if (!snaplangModule) {
    try {
      snaplangModule = require(SNAPLANG_PATH);
    } catch (e) {
      console.error('Failed to load SnapLang module:', e);
      throw new Error('SnapLang v1.0.0 module not found. Please ensure snaplang-v1.0.0/dist exists.');
    }
  }
  return snaplangModule!;
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

    snaplang.defineVariable(this.env, 'getCell', getCellValue, false, true);
    snaplang.defineVariable(this.env, 'setCell', setCellValue, false, true);
    snaplang.defineVariable(this.env, 'sum', sumRange, false, true);
    snaplang.defineVariable(this.env, 'avg', avgRange, false, true);
    snaplang.defineVariable(this.env, 'max', maxRange, false, true);
    snaplang.defineVariable(this.env, 'min', minRange, false, true);
    snaplang.defineVariable(this.env, 'count', countRange, false, true);
  }

  collectDependencies(formula: string): string[] {
    const deps: string[] = [];
    const cellRefPattern = /\b[A-Z]+[0-9]+\b/g;
    let match;
    while ((match = cellRefPattern.exec(formula)) !== null) {
      if (!deps.includes(match[0])) {
        deps.push(match[0]);
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
      if (e.message?.includes('未定义的标识符')) {
        const match = e.message.match(/'([^']+)'/);
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
            return '#REF!';
          }
        }
      }
      return '#ERROR!';
    }
  }
}

export function createSnapLangEngine(ctx: FormulaContext): SnapLangFormulaEngine {
  return new SnapLangFormulaEngine(ctx);
}
import { getCellsInRange } from '../utils/cellRef';
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
      case 'IF': {
        if (args.length < 3) return '#VALUE!';
        const cond = this.evalNode(args[0]);
        if (typeof cond === 'string' && cond.startsWith('#')) return cond;
        const condTrue = typeof cond === 'number' ? cond !== 0 : cond !== '' && cond !== '0' && cond !== 'false';
        return this.evalNode(condTrue ? args[1] : args[2]);
      }
      case 'CONCAT':
      case 'CONCATENATE':
        return flatValues.map(v => String(v)).join('');
      default:
        return '#NAME?';
    }
  }

  private evalBinary(op: '+' | '-' | '*' | '/', left: ASTNode, right: ASTNode): number | string {
    const lv = this.evalNode(left);
    const rv = this.evalNode(right);
    if (typeof lv === 'string' && lv.startsWith('#')) return lv;
    if (typeof rv === 'string' && rv.startsWith('#')) return rv;
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
    }
  };
  walk(ast);
  return deps;
}

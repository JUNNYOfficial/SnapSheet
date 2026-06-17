import type { ASTNode, Cell } from '../types';
import { getCellsInRange } from '../utils/cellRef';

export type CellGetter = (ref: string) => Cell | undefined;

export function evaluate(ast: ASTNode, getCell: CellGetter): number | string {
  const result = evaluateInternal(ast, getCell);
  if (Array.isArray(result)) {
    return result.length > 0 ? result.reduce((a, b) => a + b, 0) : 0;
  }
  return result;
}

function evaluateInternal(ast: ASTNode, getCell: CellGetter): number | string | number[] {
  switch (ast.type) {
    case 'number':
      return ast.value;

    case 'string':
      return ast.value;

    case 'cell': {
      const cell = getCell(ast.ref);
      if (cell?.computed !== undefined) {
        return cell.computed;
      }
      if (cell?.value) {
        const num = parseFloat(cell.value);
        return isNaN(num) ? cell.value : num;
      }
      return 0;
    }

    case 'range': {
      const cells = getCellsInRange(ast.start + ':' + ast.end);
      const values: number[] = [];
      for (const ref of cells) {
        const cell = getCell(ref);
        if (cell?.computed !== undefined) {
          if (typeof cell.computed === 'number') {
            values.push(cell.computed);
          }
        } else if (cell?.value) {
          const num = parseFloat(cell.value);
          if (!isNaN(num)) {
            values.push(num);
          }
        }
      }
      return values;
    }

    case 'function': {
      const args = ast.args.map(arg => evaluateInternal(arg, getCell));
      return evaluateFunction(ast.name, args);
    }

    case 'binary': {
      const left = evaluateInternal(ast.left, getCell);
      const right = evaluateInternal(ast.right, getCell);

      const leftNum = toNumber(left);
      const rightNum = toNumber(right);

      if (leftNum === null || rightNum === null) {
        return '#VALUE!';
      }

      switch (ast.op) {
        case '+': return leftNum + rightNum;
        case '-': return leftNum - rightNum;
        case '*': return leftNum * rightNum;
        case '/': return rightNum !== 0 ? leftNum / rightNum : '#DIV/0!';
      }
    }
  }
}

function toNumber(val: number | string | number[]): number | null {
  if (Array.isArray(val)) return null;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function evaluateFunction(name: string, args: (number | string | number[])[]): number | string {
  const nums = args.flatMap(arg => {
    if (Array.isArray(arg)) return arg;
    if (typeof arg === 'number') return [arg];
    const n = parseFloat(String(arg));
    return isNaN(n) ? [] : [n];
  });

  switch (name) {
    case 'SUM':
      return nums.reduce((acc, n) => acc + n, 0);

    case 'AVG':
    case 'AVERAGE':
      return nums.length > 0 ? nums.reduce((acc, n) => acc + n, 0) / nums.length : 0;

    case 'MAX':
      return nums.length > 0 ? Math.max(...nums) : 0;

    case 'MIN':
      return nums.length > 0 ? Math.min(...nums) : 0;

    case 'COUNT':
      return nums.length;

    case 'IF': {
      if (args.length >= 2) {
        const condition = args[0];
        const condNum = toNumber(condition);
        if (condNum === null) return '#VALUE!';
        const result = condNum !== 0 ? args[1] : (args[2] ?? 0);
        if (Array.isArray(result)) {
          return result.length > 0 ? result.reduce((a, b) => a + b, 0) : 0;
        }
        return result;
      }
      return 0;
    }

    case 'ABS':
      return nums.length > 0 ? Math.abs(nums[0]) : 0;

    case 'ROUND':
      if (nums.length >= 1) {
        const decimalsArg = args.length > 1 ? args[1] : 0;
        const decimals = toNumber(decimalsArg);
        if (decimals === null) return '#VALUE!';
        const factor = Math.pow(10, decimals);
        return Math.round(nums[0] * factor) / factor;
      }
      return 0;

    case 'SQRT':
      return nums.length > 0 && nums[0] >= 0 ? Math.sqrt(nums[0]) : '#VALUE!';

    case 'POWER':
      if (nums.length >= 2) {
        return Math.pow(nums[0], nums[1]);
      }
      return '#VALUE!';

    case 'CONCAT':
    case 'CONCATENATE':
      return args.map(arg => Array.isArray(arg) ? arg.join(',') : String(arg)).join('');

    case 'LEN':
      if (args.length > 0) {
        return String(args[0]).length;
      }
      return 0;

    case 'UPPER':
      return args.length > 0 ? String(args[0]).toUpperCase() : '';

    case 'LOWER':
      return args.length > 0 ? String(args[0]).toLowerCase() : '';

    case 'TRIM':
      return args.length > 0 ? String(args[0]).trim() : '';

    case 'NOW':
      return new Date().toISOString();

    case 'TODAY':
      return new Date().toISOString().split('T')[0];

    case 'TRUE':
      return 1;

    case 'FALSE':
      return 0;

    case 'AND': {
      for (const arg of args) {
        const val = Array.isArray(arg) ? arg : [arg];
        for (const v of val) {
          const n = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
          if (n === 0) return 0;
        }
      }
      return 1;
    }

    case 'OR': {
      for (const arg of args) {
        const val = Array.isArray(arg) ? arg : [arg];
        for (const v of val) {
          const n = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
          if (n !== 0) return 1;
        }
      }
      return 0;
    }

    case 'NOT': {
      if (args.length > 0) {
        const val = Array.isArray(args[0]) ? args[0][0] : args[0];
        const n = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
        return n === 0 ? 1 : 0;
      }
      return 1;
    }

    default:
      return '#NAME?';
  }
}

export function extractDependencies(ast: ASTNode): string[] {
  const deps: string[] = [];

  function walk(node: ASTNode) {
    switch (node.type) {
      case 'cell':
        deps.push(node.ref);
        break;
      case 'range':
        deps.push(...getCellsInRange(node.start + ':' + node.end));
        break;
      case 'function':
        for (const arg of node.args) {
          walk(arg);
        }
        break;
      case 'binary':
        walk(node.left);
        walk(node.right);
        break;
    }
  }

  walk(ast);
  return [...new Set(deps)];
}

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
      case 'ROUND': {
        if (args.length < 1) return '#VALUE!';
        const value = this.evalNode(args[0]);
        const digits = args.length >= 2 ? this.evalNode(args[1]) : 0;
        const n = typeof value === 'number' ? value : parseFloat(value as string);
        const d = typeof digits === 'number' ? digits : parseInt(digits as string, 10);
        if (isNaN(n) || isNaN(d)) return '#VALUE!';
        return parseFloat(n.toFixed(d));
      }
      case 'IFERROR': {
        if (args.length < 2) return '#VALUE!';
        const value = this.evalNode(args[0]);
        if (typeof value === 'string' && value.startsWith('#')) {
          return this.evalNode(args[1]);
        }
        return value;
      }
      case 'COUNTIF':
        return this.evalCountIf(args);
      case 'SUMIF':
        return this.evalSumIf(args);
      case 'AVERAGEIF':
        return this.evalAverageIf(args);
      case 'VLOOKUP':
        return this.evalVLookup(args);
      case 'HLOOKUP':
        return this.evalHLookup(args);
      case 'MATCH':
        return this.evalMatch(args);
      case 'INDEX':
        return this.evalIndex(args);
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

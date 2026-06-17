import { Parser } from './Parser';
import { Evaluator, collectDependencies } from './Evaluator';
import type { ASTNode, Cell } from '../types';

export class DependencyGraph {
  private dependents: Map<string, Set<string>> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();

  setDependencies(cellRef: string, deps: string[]): void {
    this.clearCell(cellRef);
    const depSet = new Set(deps);
    this.dependencies.set(cellRef, depSet);
    for (const dep of deps) {
      if (!this.dependents.has(dep)) this.dependents.set(dep, new Set());
      this.dependents.get(dep)!.add(cellRef);
    }
  }

  clearCell(cellRef: string): void {
    const oldDeps = this.dependencies.get(cellRef);
    if (oldDeps) {
      for (const dep of oldDeps) {
        this.dependents.get(dep)?.delete(cellRef);
      }
    }
    this.dependencies.delete(cellRef);
  }

  getDependents(cellRef: string): string[] {
    return Array.from(this.dependents.get(cellRef) || []);
  }

  getTopologicalOrder(changedCells: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const stack: Set<string> = new Set();

    const visit = (cell: string): void => {
      if (stack.has(cell)) return;
      if (visited.has(cell)) return;
      stack.add(cell);
      const deps = this.dependencies.get(cell);
      if (deps) {
        for (const dep of deps) {
          if (changedCells.includes(dep) || this.isInSubgraph(dep, changedCells)) {
            visit(dep);
          }
        }
      }
      stack.delete(cell);
      visited.add(cell);
      result.push(cell);
    };

    for (const changed of changedCells) {
      for (const dep of this.getAllAffected([changed])) {
        visit(dep);
      }
    }
    return result;
  }

  private isInSubgraph(cell: string, roots: string[]): boolean {
    const visited = new Set<string>();
    const queue = [...roots];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === cell) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const deps = this.dependents.get(current);
      if (deps) queue.push(...deps);
    }
    return false;
  }

  private getAllAffected(changedCells: string[]): string[] {
    const affected: string[] = [];
    const visited = new Set<string>();
    const queue = [...changedCells];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const dependents = this.dependents.get(current);
      if (dependents) {
        for (const dep of dependents) {
          if (!visited.has(dep)) {
            affected.push(dep);
            queue.push(dep);
          }
        }
      }
    }
    return affected;
  }
}

export interface FormulaEngineContext {
  getCell: (ref: string) => Cell | undefined;
  setCellComputed: (ref: string, value: number | string) => void;
}

export class FormulaEngine {
  private ctx: FormulaEngineContext;
  private graph: DependencyGraph;
  private cache: Map<string, ASTNode> = new Map();

  constructor(ctx: FormulaEngineContext, graph: DependencyGraph) {
    this.ctx = ctx;
    this.graph = graph;
  }

  parse(formula: string): ASTNode | null {
    try {
      const parser = new Parser(formula);
      return parser.parse();
    } catch {
      return null;
    }
  }

  evaluate(ref: string, formula: string): number | string {
    const ast = this.parse(formula);
    if (!ast) return '#VALUE!';

    const deps = collectDependencies(ast);
    this.graph.setDependencies(ref, deps);
    this.cache.set(ref, ast);

    const evaluator = new Evaluator({
      getCell: (r: string) => this.ctx.getCell(r),
    });
    try {
      return evaluator.evaluate(ast);
    } catch {
      return '#ERROR!';
    }
  }

  recalculate(changedRef: string): Map<string, number | string> {
    const results = new Map<string, number | string>();
    const order = this.graph.getTopologicalOrder([changedRef]);
    for (const ref of order) {
      const cell = this.ctx.getCell(ref);
      if (cell && cell.formula) {
        const val = this.evaluate(ref, cell.formula);
        results.set(ref, val);
        this.ctx.setCellComputed(ref, val);
      }
    }
    return results;
  }
}

export function createDefaultFormulaEngine(
  getCell: (ref: string) => Cell | undefined,
  setCellComputed: (ref: string, value: number | string) => void,
): { engine: FormulaEngine; graph: DependencyGraph } {
  const graph = new DependencyGraph();
  const engine = new FormulaEngine({ getCell, setCellComputed }, graph);
  return { engine, graph };
}

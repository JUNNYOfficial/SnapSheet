import { SnapLangFormulaEngine } from '../snaplang/adapter';
import type { Cell } from '../types';

export class CycleError extends Error {
  constructor(public cells: string[]) {
    super(`Circular reference detected: ${cells.join(' -> ')}`);
    this.name = 'CycleError';
  }
}

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
    const cycleCells = new Set<string>();

    const visit = (cell: string): void => {
      if (visited.has(cell)) return;
      if (stack.has(cell)) {
        cycleCells.add(cell);
        return;
      }
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

    if (cycleCells.size > 0) {
      throw new CycleError(Array.from(cycleCells));
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
  private snaplangEngine: SnapLangFormulaEngine;

  constructor(ctx: FormulaEngineContext, graph: DependencyGraph) {
    this.ctx = ctx;
    this.graph = graph;
    this.snaplangEngine = new SnapLangFormulaEngine(ctx);
  }

  evaluate(ref: string, formula: string): number | string {
    const deps = this.snaplangEngine.collectDependencies(formula);
    this.graph.setDependencies(ref, deps);

    const result = this.snaplangEngine.evaluate(formula);
    return result;
  }

  recalculate(changedRef: string): Map<string, number | string> {
    return this.recalculateMany([changedRef]);
  }

  recalculateMany(changedRefs: string[]): Map<string, number | string> {
    const results = new Map<string, number | string>();
    try {
      const order = this.graph.getTopologicalOrder(changedRefs);
      for (const ref of order) {
        const cell = this.ctx.getCell(ref);
        if (cell && cell.formula) {
          const val = this.evaluate(ref, cell.formula);
          results.set(ref, val);
          this.ctx.setCellComputed(ref, val);
        }
      }
    } catch (err) {
      if (err instanceof CycleError) {
        const cycleValue = '#CYCLE!';
        for (const ref of changedRefs) {
          const cell = this.ctx.getCell(ref);
          if (cell && cell.formula) {
            results.set(ref, cycleValue);
            this.ctx.setCellComputed(ref, cycleValue);
          }
        }
      } else {
        throw err;
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

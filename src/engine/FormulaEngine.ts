/**
 * @file engine/FormulaEngine.ts
 * @description 公式引擎主入口。
 *              负责管理单元格依赖图、检测循环引用、并按拓扑顺序重算公式。
 *              底层求值委托给 SnapLang 适配层（SnapLangFormulaEngine）。
 *              被 useSpreadsheetStore 在单元格修改时调用。
 */

import { SnapLangFormulaEngine } from '../snaplang/adapter';
import type { Cell } from '../types';

/** 循环引用错误，cells 记录构成环的单元格引用链 */
export class CycleError extends Error {
  constructor(public cells: string[]) {
    super(`Circular reference detected: ${cells.join(' -> ')}`);
    this.name = 'CycleError';
  }
}

/**
 * 单元格依赖有向图。
 * 维护 "单元格 -> 依赖单元格" 以及反向 "单元格 -> 依赖我的单元格" 关系，
 * 支持循环检测与按拓扑顺序重算。
 */
export class DependencyGraph {
  /** 反向依赖图：key 为被依赖单元格，value 为依赖它的单元格集合 */
  private dependents: Map<string, Set<string>> = new Map();
  /** 正向依赖图：key 为单元格，value 为它依赖的单元格集合 */
  private dependencies: Map<string, Set<string>> = new Map();

  /**
   * 设置某个单元格的依赖列表，并自动清理旧的依赖关系。
   * @param cellRef 单元格引用
   * @param deps 该单元格依赖的其他单元格引用列表
   */
  setDependencies(cellRef: string, deps: string[]): void {
    this.clearCell(cellRef);
    const depSet = new Set(deps);
    this.dependencies.set(cellRef, depSet);
    for (const dep of deps) {
      if (!this.dependents.has(dep)) this.dependents.set(dep, new Set());
      this.dependents.get(dep)!.add(cellRef);
    }
  }

  /**
   * 清除某个单元格的依赖关系（常用于删除或覆盖单元格时）。
   * @param cellRef 单元格引用
   */
  clearCell(cellRef: string): void {
    const oldDeps = this.dependencies.get(cellRef);
    if (oldDeps) {
      for (const dep of oldDeps) {
        this.dependents.get(dep)?.delete(cellRef);
      }
    }
    this.dependencies.delete(cellRef);
  }

  /**
   * 获取依赖指定单元格的所有单元格。
   * @param cellRef 单元格引用
   * @returns 依赖它的单元格引用数组
   */
  getDependents(cellRef: string): string[] {
    return Array.from(this.dependents.get(cellRef) || []);
  }

  /**
   * 获取受 changedCells 影响的所有单元格的拓扑排序。
   * 若检测到循环引用，则抛出 CycleError。
   * @param changedCells 发生变化的单元格引用
   * @returns 按依赖顺序排列的单元格引用数组
   */
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

  /**
   * 判断某个单元格是否在给定根节点的依赖子图中。
   * @param cell 待判断单元格
   * @param roots 根单元格引用数组
   * @returns 是否在子图中
   */
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

  /**
   * 获取所有受 changedCells 影响的下游单元格（包括自身）。
   * @param changedCells 发生变化的单元格引用
   * @returns 受影响的单元格引用数组
   */
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

/** 公式引擎上下文：读写单元格数据 */
export interface FormulaEngineContext {
  /** 获取单元格数据 */
  getCell: (ref: string) => Cell | undefined;
  /** 设置单元格计算结果 */
  setCellComputed: (ref: string, value: number | string) => void;
}

/**
 * 公式引擎封装类。
 * 通过 DependencyGraph 维护依赖关系，通过 SnapLangFormulaEngine 执行公式求值，
 * 并提供单格/多格重算能力。
 */
export class FormulaEngine {
  private ctx: FormulaEngineContext;
  private graph: DependencyGraph;
  private snaplangEngine: SnapLangFormulaEngine;

  constructor(ctx: FormulaEngineContext, graph: DependencyGraph) {
    this.ctx = ctx;
    this.graph = graph;
    this.snaplangEngine = new SnapLangFormulaEngine(ctx);
  }

  /**
   * 计算指定单元格的公式，并更新其依赖关系。
   * @param ref 单元格引用
   * @param formula 公式原文（以 = 开头）
   * @returns 计算结果或错误字符串
   */
  evaluate(ref: string, formula: string): number | string {
    const deps = this.snaplangEngine.collectDependencies(formula);
    this.graph.setDependencies(ref, deps);

    const result = this.snaplangEngine.evaluate(formula);
    return result;
  }

  /**
   * 当单个单元格发生变化时，重算所有受影响的公式单元格。
   * @param changedRef 发生变化的单元格引用
   * @returns 各单元格重算结果映射
   */
  recalculate(changedRef: string): Map<string, number | string> {
    return this.recalculateMany([changedRef]);
  }

  /**
   * 批量重算多个变化单元格的下游公式。
   * 若存在循环引用，会将相关公式标记为 '#CYCLE!'。
   * @param changedRefs 发生变化的单元格引用数组
   * @returns 各单元格重算结果映射
   */
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

/**
 * 使用默认配置创建公式引擎与依赖图。
 * @param getCell 获取单元格数据的回调
 * @param setCellComputed 设置单元格计算结果的回调
 * @returns 包含 engine 与 graph 的对象
 */
export function createDefaultFormulaEngine(
  getCell: (ref: string) => Cell | undefined,
  setCellComputed: (ref: string, value: number | string) => void,
): { engine: FormulaEngine; graph: DependencyGraph } {
  const graph = new DependencyGraph();
  const engine = new FormulaEngine({ getCell, setCellComputed }, graph);
  return { engine, graph };
}

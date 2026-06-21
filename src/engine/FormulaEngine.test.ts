import { describe, it, expect } from 'vitest';
import { DependencyGraph, CycleError, createDefaultFormulaEngine } from './FormulaEngine';
import type { Cell } from '../types';

describe('DependencyGraph', () => {
  it('tracks dependencies and dependents', () => {
    const graph = new DependencyGraph();
    graph.setDependencies('B1', ['A1', 'A2']);
    expect(graph.getDependents('A1')).toContain('B1');
    expect(graph.getDependents('A2')).toContain('B1');
  });

  it('clears old dependencies when setting new ones', () => {
    const graph = new DependencyGraph();
    graph.setDependencies('B1', ['A1']);
    graph.setDependencies('B1', ['A2']);
    expect(graph.getDependents('A1')).not.toContain('B1');
    expect(graph.getDependents('A2')).toContain('B1');
  });

  it('detects circular references', () => {
    const graph = new DependencyGraph();
    graph.setDependencies('A1', ['B1']);
    graph.setDependencies('B1', ['A1']);
    expect(() => graph.getTopologicalOrder(['A1'])).toThrow(CycleError);
  });
});

describe('FormulaEngine', () => {
  function createEngine(cells: Map<string, Cell>) {
    return createDefaultFormulaEngine(
      (ref) => cells.get(ref),
      (ref, value) => {
        const cell = cells.get(ref);
        if (cell) cell.computed = value;
      }
    );
  }

  it('evaluates simple formulas', () => {
    const cells = new Map<string, Cell>();
    const { engine } = createEngine(cells);

    const result = engine.evaluate('A1', '=1+2');
    expect(result).toBe(3);
  });

  it('recalculates dependent cells', () => {
    const cells = new Map<string, Cell>([
      ['A1', { value: '10' }],
      ['B1', { value: '=A1*2', formula: '=A1*2' }],
    ]);
    const { engine } = createEngine(cells);

    engine.evaluate('B1', '=A1*2');
    engine.recalculate('A1');

    expect(cells.get('B1')?.computed).toBe(20);
  });

  it('marks circular references as #CYCLE!', () => {
    const cells = new Map<string, Cell>([
      ['A1', { value: '=B1', formula: '=B1' }],
      ['B1', { value: '=A1', formula: '=A1' }],
    ]);
    const { engine } = createEngine(cells);

    engine.evaluate('A1', '=B1');
    engine.evaluate('B1', '=A1');
    const results = engine.recalculateMany(['A1', 'B1']);

    expect(results.get('A1')).toBe('#CYCLE!');
    expect(results.get('B1')).toBe('#CYCLE!');
  });
});

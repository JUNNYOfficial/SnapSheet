import { Parser } from './Parser';
import { Evaluator } from './Evaluator';
import type { ASTNode, Cell } from '../types';

export function evaluate(ast: ASTNode, getCell: (ref: string) => Cell | undefined): number | string {
  const evaluator = new Evaluator({ getCell });
  return evaluator.evaluate(ast);
}

export { Parser, Evaluator };

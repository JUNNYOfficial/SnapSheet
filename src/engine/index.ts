/**
 * @file engine/index.ts
 * @description 旧版公式引擎入口文件。
 *              导出 Parser、Evaluator 与 evaluate 便捷函数，
 *              用于解析并计算旧版 AST 形式的公式表达式。
 *              当前系统主公式引擎已迁移至 SnapLang，此模块保留用于兼容。
 */

import { Parser } from './Parser';
import { Evaluator } from './Evaluator';
import type { ASTNode, Cell } from '../types';

/**
 * 直接对 AST 节点进行求值。
 * @param ast 旧版公式 AST
 * @param getCell 获取单元格数据的回调
 * @returns 计算结果（数字或字符串）
 */
export function evaluate(ast: ASTNode, getCell: (ref: string) => Cell | undefined): number | string {
  const evaluator = new Evaluator({ getCell });
  return evaluator.evaluate(ast);
}

export { Parser, Evaluator };

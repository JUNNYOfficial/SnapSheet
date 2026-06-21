/**
 * @file snaplang/index.ts
 * @description SnapLang 公式引擎适配层入口。
 *              统一导出 adapter.ts 中的 createSnapLangEngine 等 API，
 *              供 store 与 FormulaEngine 集成使用。
 */

export * from './adapter';

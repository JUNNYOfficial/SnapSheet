/**
 * @file utils/deleteConfirmation.ts
 * @description 删除确认中枢。
 *              通过注册表把分散在各组件中的删除/清空操作集中到 App 层的确认对话框处理，
 *              未注册时直接执行删除操作，避免破坏独立运行能力。
 */

export type DeleteAction = () => void;

export interface DeleteConfirmationRequest {
  /** 用户确认后要执行的删除操作 */
  action: DeleteAction;
  /** 操作名称，用于对话框展示 */
  label: string;
}

let handler: ((request: DeleteConfirmationRequest) => void) | null = null;

/**
 * 注册删除确认处理器。
 * @param cb 收到删除请求时的回调，通常由 App 组件提供并弹出确认对话框
 * @returns 注销函数
 */
export function registerDeleteConfirmation(cb: (request: DeleteConfirmationRequest) => void) {
  handler = cb;
  return () => {
    handler = null;
  };
}

/**
 * 请求删除确认。
 * 如果当前没有注册处理器，直接执行删除操作。
 * @param action 确认后执行的删除操作
 * @param label 操作名称
 */
export function requestDeleteConfirmation(action: DeleteAction, label = '删除') {
  if (typeof handler !== 'function') {
    action();
    return;
  }
  handler({ action, label });
}

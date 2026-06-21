/**
 * @file lib/utils.ts
 * @description Tailwind CSS 类名组合工具。
 *              结合 clsx 与 tailwind-merge，用于在组件中安全地合并动态类名，
 *              避免 Tailwind 工具类冲突。被所有 shadcn/ui 风格组件使用。
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并多个类名输入，并自动解决 Tailwind 类名冲突。
 * @param inputs 任意类名值（字符串、对象、数组等）
 * @returns 合并后的单一类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * @file utils/theme.ts
 * @description Canvas 渲染使用的主题色定义。
 *              提供浅色/深色两套配色方案，被 CanvasRenderer 根据当前主题模式调用。
 *              颜色值与 CSS 变量保持语义一致，确保 Canvas 与 DOM UI 视觉统一。
 */

/** Canvas 渲染所需的完整主题色集合 */
export interface ThemeColors {
  /** 工作表背景色 */
  bg: string;
  /** 网格线颜色 */
  grid: string;
  /** 行列标题栏背景色 */
  headerBg: string;
  /** 行列标题栏文字颜色 */
  headerText: string;
  /** 单元格文字颜色 */
  cellText: string;
  /** 选中框边框颜色 */
  selectedBorder: string;
  /** 选中区域背景色 */
  selectedBg: string;
  /** 错误值文字颜色 */
  errorText: string;
  /** 当前行列标题高亮背景 */
  headerHighlightBg: string;
  /** 当前行列标题高亮文字 */
  headerHighlightText: string;
  /** 批注标记颜色 */
  commentMarker: string;
  /** 填充柄背景色 */
  fillHandleBg: string;
  /** 填充柄边框色 */
  fillHandleBorder: string;
  /** 填充区域背景色 */
  fillAreaBg: string;
  /** 填充区域边框色 */
  fillAreaBorder: string;
}

/** 浅色主题配色 */
const LIGHT: ThemeColors = {
  bg: '#ffffff',
  grid: '#e5e5e5',
  headerBg: '#f0f0f0',
  headerText: '#525252',
  cellText: '#171717',
  selectedBorder: '#262626',
  selectedBg: 'rgba(0, 0, 0, 0.06)',
  errorText: '#525252',
  headerHighlightBg: '#e5e5e5',
  headerHighlightText: '#171717',
  commentMarker: '#525252',
  fillHandleBg: '#262626',
  fillHandleBorder: '#ffffff',
  fillAreaBg: 'rgba(0, 0, 0, 0.04)',
  fillAreaBorder: '#525252',
};

/** 深色主题配色 */
const DARK: ThemeColors = {
  bg: '#0a0a0a',
  grid: '#3d3d3d',
  headerBg: '#1a1a1a',
  headerText: '#a3a3a3',
  cellText: '#e5e5e5',
  selectedBorder: '#e5e5e5',
  selectedBg: 'rgba(255, 255, 255, 0.08)',
  errorText: '#a3a3a3',
  headerHighlightBg: '#333333',
  headerHighlightText: '#e5e5e5',
  commentMarker: '#a3a3a3',
  fillHandleBg: '#e5e5e5',
  fillHandleBorder: '#171717',
  fillAreaBg: 'rgba(255, 255, 255, 0.06)',
  fillAreaBorder: '#a3a3a3',
};

/**
 * 根据是否深色模式返回对应的主题色。
 * @param isDark 是否为深色模式
 * @returns 主题色对象
 */
export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? DARK : LIGHT;
}

export interface ThemeColors {
  bg: string;
  grid: string;
  headerBg: string;
  headerText: string;
  cellText: string;
  selectedBorder: string;
  selectedBg: string;
  errorText: string;
  headerHighlightBg: string;
  headerHighlightText: string;
  commentMarker: string;
  fillHandleBg: string;
  fillHandleBorder: string;
  fillAreaBg: string;
  fillAreaBorder: string;
}

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

const DARK: ThemeColors = {
  bg: '#0a0a0a',
  grid: '#333333',
  headerBg: '#1f1f1f',
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

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? DARK : LIGHT;
}

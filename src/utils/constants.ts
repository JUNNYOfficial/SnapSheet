export const FONT_SIZE_OPTIONS: { label: string; value: number }[] = [
  { label: '9', value: 9 },
  { label: '10', value: 10 },
  { label: '11', value: 11 },
  { label: '12', value: 12 },
  { label: '13', value: 13 },
  { label: '14', value: 14 },
  { label: '16', value: 16 },
  { label: '18', value: 18 },
  { label: '20', value: 20 },
  { label: '24', value: 24 },
  { label: '28', value: 28 },
  { label: '32', value: 32 },
  { label: '36', value: 36 },
  { label: '48', value: 48 },
  { label: '72', value: 72 },
];

export const DEFAULT_COL_WIDTH = 100;
export const DEFAULT_ROW_HEIGHT = 26;
export const HEADER_ROW_HEIGHT = 30;
export const HEADER_COL_WIDTH = 52;
export const MIN_COL_WIDTH = 40;
export const MIN_ROW_HEIGHT = 20;

/* ============================================================
   字体栈规范
   - UI 统一使用系统无衬线字体（现代感、屏幕显示清晰）
   - 等宽字体仅用于单元格地址、公式输入
   - 禁止在 UI 中使用宋体/黑体（SimSun/SimHei）
   ============================================================ */

export const FONT_FAMILY_UI = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
export const FONT_FAMILY_MONO = '"SF Mono", "Fira Code", "Cascadia Code", Consolas, "Courier New", monospace';
export const FONT_FAMILY = FONT_FAMILY_UI;

export const FONT_SIZE = 13;
export const HEADER_FONT = '500 12px ' + FONT_FAMILY;
export const CELL_FONT = FONT_SIZE + 'px ' + FONT_FAMILY;

export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: '默认', value: FONT_FAMILY },
  { label: '黑体', value: '"SimHei", "黑体", "Microsoft YaHei", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { label: '楷体', value: '"KaiTi", "楷体", "STKaiti", serif' },
  { label: '仿宋', value: '"FangSong", "仿宋", "STFangsong", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

export const SHEET_ROW_COUNT = 5000;
export const SHEET_COL_COUNT = 200;

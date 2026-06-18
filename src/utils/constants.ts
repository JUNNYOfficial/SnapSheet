export const DEFAULT_COL_WIDTH = 100;
export const DEFAULT_ROW_HEIGHT = 26;
export const HEADER_ROW_HEIGHT = 30;
export const HEADER_COL_WIDTH = 52;
export const MIN_COL_WIDTH = 40;
export const MIN_ROW_HEIGHT = 20;

export const FONT_FAMILY = '"SimSun", "宋体", "SimHei", "黑体", "Songti SC", "STSong", monospace';
export const FONT_SIZE = 13;
export const HEADER_FONT = '500 12px ' + FONT_FAMILY;
export const CELL_FONT = FONT_SIZE + 'px ' + FONT_FAMILY;

export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: '默认宋体', value: FONT_FAMILY },
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

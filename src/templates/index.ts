/**
 * @file templates/index.ts
 * @description 工作表模板库。
 *              提供月度预算、待办清单、简单日历等预设模板。
 *              用户新建工作表时可通过 Toolbar 调用 applyTemplateToSheet 填充初始数据。
 */

import type { Cell, Sheet } from '../types';
import { coordsToCell } from '../utils/cellRef';

export const TEMPLATES = [
  { id: 'budget', name: '月度预算' },
  { id: 'todo', name: '待办清单' },
  { id: 'calendar', name: '简单日历' },
  { id: 'class-scores', name: '班级成绩表' },
  { id: 'science-experiment', name: '科学实验记录' },
  { id: 'class-survey', name: '班级调查统计' },
  { id: 'class-fund', name: '班费收支明细' },
  { id: 'reading-log', name: '图书阅读记录' },
];

function setCell(cells: Map<string, Cell>, row: number, col: number, value: string, style?: Cell['style']): void {
  cells.set(coordsToCell(row, col), { value, style });
}

export function applyTemplateToSheet(sheet: Sheet, templateId: string): void {
  sheet.cells.clear();

  if (templateId === 'budget') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5' };
    setCell(sheet.cells, 0, 0, '项目', headerStyle);
    setCell(sheet.cells, 0, 1, '预算', headerStyle);
    setCell(sheet.cells, 0, 2, '实际', headerStyle);
    setCell(sheet.cells, 0, 3, '差额', headerStyle);
    setCell(sheet.cells, 1, 0, '收入');
    setCell(sheet.cells, 1, 1, '10000');
    setCell(sheet.cells, 1, 2, '0');
    setCell(sheet.cells, 1, 3, '=B2-C2');
    setCell(sheet.cells, 2, 0, '房租');
    setCell(sheet.cells, 2, 1, '3000');
    setCell(sheet.cells, 2, 2, '0');
    setCell(sheet.cells, 2, 3, '=B3-C3');
    setCell(sheet.cells, 3, 0, '餐饮');
    setCell(sheet.cells, 3, 1, '2000');
    setCell(sheet.cells, 3, 2, '0');
    setCell(sheet.cells, 3, 3, '=B4-C4');
    setCell(sheet.cells, 4, 0, '交通');
    setCell(sheet.cells, 4, 1, '500');
    setCell(sheet.cells, 4, 2, '0');
    setCell(sheet.cells, 4, 3, '=B5-C5');
    setCell(sheet.cells, 5, 0, '合计', { bold: true });
    setCell(sheet.cells, 5, 1, '=SUM(B2:B5)');
    setCell(sheet.cells, 5, 2, '=SUM(C2:C5)');
    setCell(sheet.cells, 5, 3, '=SUM(D2:D5)');
  }

  if (templateId === 'todo') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5' };
    setCell(sheet.cells, 0, 0, '任务', headerStyle);
    setCell(sheet.cells, 0, 1, '状态', headerStyle);
    setCell(sheet.cells, 0, 2, '优先级', headerStyle);
    setCell(sheet.cells, 0, 3, '截止日期', headerStyle);
    setCell(sheet.cells, 1, 0, '示例任务 1');
    setCell(sheet.cells, 1, 1, '进行中');
    setCell(sheet.cells, 1, 2, '高');
    setCell(sheet.cells, 1, 3, '2026-06-30');
    setCell(sheet.cells, 2, 0, '示例任务 2');
    setCell(sheet.cells, 2, 1, '待开始');
    setCell(sheet.cells, 2, 2, '中');
    setCell(sheet.cells, 2, 3, '2026-07-05');
  }

  if (templateId === 'calendar') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5', align: 'center' };
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    days.forEach((d, i) => setCell(sheet.cells, 0, i, d, headerStyle));
    for (let r = 1; r <= 5; r++) {
      for (let c = 0; c < 7; c++) {
        const day = (r - 1) * 7 + c + 1;
        if (day <= 31) {
          setCell(sheet.cells, r, c, String(day), { align: 'center' });
        }
      }
    }
  }

  if (templateId === 'class-scores') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5' };
    const names = ['小明', '小红', '小刚', '小丽', '小军'];
    setCell(sheet.cells, 0, 0, '姓名', headerStyle);
    setCell(sheet.cells, 0, 1, '语文', headerStyle);
    setCell(sheet.cells, 0, 2, '数学', headerStyle);
    setCell(sheet.cells, 0, 3, '英语', headerStyle);
    setCell(sheet.cells, 0, 4, '总分', headerStyle);
    setCell(sheet.cells, 0, 5, '平均分', headerStyle);
    setCell(sheet.cells, 0, 6, '排名', headerStyle);
    const scores: number[][] = [
      [85, 92, 78],
      [90, 88, 95],
      [78, 85, 80],
      [92, 94, 88],
      [88, 76, 90],
    ];
    scores.forEach((row, i) => {
      const r = i + 1;
      setCell(sheet.cells, r, 0, names[i]);
      row.forEach((score, c) => setCell(sheet.cells, r, c + 1, String(score)));
      setCell(sheet.cells, r, 4, `=SUM(B${r + 1}:D${r + 1})`);
      setCell(sheet.cells, r, 5, `=AVERAGE(B${r + 1}:D${r + 1})`);
      setCell(sheet.cells, r, 6, `=RANK(E${r + 1},E$2:E$6,0)`);
    });
    const totalRow = names.length + 1;
    setCell(sheet.cells, totalRow, 0, '单科平均分', { bold: true });
    for (let c = 1; c <= 3; c++) {
      setCell(sheet.cells, totalRow, c, `=AVERAGE(${String.fromCharCode(64 + c)}2:${String.fromCharCode(64 + c)}6)`);
    }
  }

  if (templateId === 'science-experiment') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5' };
    setCell(sheet.cells, 0, 0, '实验次数', headerStyle);
    setCell(sheet.cells, 0, 1, '测量值1', headerStyle);
    setCell(sheet.cells, 0, 2, '测量值2', headerStyle);
    setCell(sheet.cells, 0, 3, '测量值3', headerStyle);
    setCell(sheet.cells, 0, 4, '平均值', headerStyle);
    setCell(sheet.cells, 0, 5, '最大误差', headerStyle);
    const data = [
      [12.5, 12.8, 12.4],
      [15.2, 15.0, 15.3],
      [9.8, 9.9, 9.7],
      [20.1, 20.0, 20.2],
    ];
    data.forEach((row, i) => {
      const r = i + 1;
      setCell(sheet.cells, r, 0, String(r));
      row.forEach((v, c) => setCell(sheet.cells, r, c + 1, String(v)));
      setCell(sheet.cells, r, 4, `=AVERAGE(B${r + 1}:D${r + 1})`);
      setCell(sheet.cells, r, 5, `=MAX(ABS(B${r + 1}-E${r + 1}),ABS(C${r + 1}-E${r + 1}),ABS(D${r + 1}-E${r + 1}))`);
    });
  }

  if (templateId === 'class-survey') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5' };
    setCell(sheet.cells, 0, 0, '喜欢的运动', headerStyle);
    setCell(sheet.cells, 0, 1, '人数', headerStyle);
    setCell(sheet.cells, 0, 2, '百分比', headerStyle);
    const items = [
      ['篮球', 12],
      ['足球', 8],
      ['羽毛球', 6],
      ['跑步', 4],
      ['其他', 5],
    ];
    items.forEach((item, i) => {
      const r = i + 1;
      setCell(sheet.cells, r, 0, item[0] as string);
      setCell(sheet.cells, r, 1, String(item[1]));
      setCell(sheet.cells, r, 2, `=B${r + 1}/SUM(B$2:B$6)`);
    });
  }

  if (templateId === 'class-fund') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5' };
    setCell(sheet.cells, 0, 0, '日期', headerStyle);
    setCell(sheet.cells, 0, 1, '项目', headerStyle);
    setCell(sheet.cells, 0, 2, '收入', headerStyle);
    setCell(sheet.cells, 0, 3, '支出', headerStyle);
    setCell(sheet.cells, 0, 4, '余额', headerStyle);
    const records = [
      ['2026-09-01', '班费收取', 500, 0],
      ['2026-09-05', '购买粉笔', 0, 35],
      ['2026-09-10', '打印资料', 0, 80],
      ['2026-09-15', '义卖收入', 120, 0],
    ];
    records.forEach((rec, i) => {
      const r = i + 1;
      setCell(sheet.cells, r, 0, rec[0] as string);
      setCell(sheet.cells, r, 1, rec[1] as string);
      setCell(sheet.cells, r, 2, String(rec[2]));
      setCell(sheet.cells, r, 3, String(rec[3]));
      setCell(sheet.cells, r, 4, `=SUM(C$2:C${r + 1})-SUM(D$2:D${r + 1})`);
    });
  }

  if (templateId === 'reading-log') {
    const headerStyle: Cell['style'] = { bold: true, bgColor: '#f5f5f5' };
    setCell(sheet.cells, 0, 0, '书名', headerStyle);
    setCell(sheet.cells, 0, 1, '页数', headerStyle);
    setCell(sheet.cells, 0, 2, '评分', headerStyle);
    setCell(sheet.cells, 0, 3, '阅读日期', headerStyle);
    const books = [
      ['《西游记》', 820, 9],
      ['《草房子》', 280, 8],
      ['《小王子》', 160, 9],
      ['《昆虫记》', 320, 7],
    ];
    books.forEach((book, i) => {
      const r = i + 1;
      setCell(sheet.cells, r, 0, book[0] as string);
      setCell(sheet.cells, r, 1, String(book[1]));
      setCell(sheet.cells, r, 2, String(book[2]));
      setCell(sheet.cells, r, 3, '2026-06-01');
    });
  }
}

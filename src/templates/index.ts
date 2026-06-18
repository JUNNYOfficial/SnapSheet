import type { Cell, Sheet } from '../types';
import { coordsToCell } from '../utils/cellRef';

export const TEMPLATES = [
  { id: 'budget', name: '月度预算' },
  { id: 'todo', name: '待办清单' },
  { id: 'calendar', name: '简单日历' },
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
}

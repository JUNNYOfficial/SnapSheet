import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  HEADER_ROW_HEIGHT,
  HEADER_COL_WIDTH,
  GRID_COLOR,
  HEADER_BG,
  HEADER_TEXT,
  CELL_TEXT,
  SELECTED_BORDER,
  SELECTED_BG,
  ERROR_TEXT,
  HEADER_FONT,
  CELL_FONT,
  FONT_SIZE,
} from '../utils/constants';
import { colToLetter } from '../utils/cellRef';
import type { Cell, Selection } from '../types';

export interface CanvasRendererOptions {
  canvas: HTMLCanvasElement;
  getCell: (row: number, col: number) => Cell | undefined;
  getColWidth: (col: number) => number;
  getRowHeight: (row: number) => number;
  setColWidth: (col: number, width: number) => void;
  onSelect: (row: number, col: number) => void;
  onSelection: (selection: Selection) => void;
  onEdit: (row: number, col: number) => void;
  onEditWithChar: (row: number, col: number, ch: string) => void;
  onClearSelection: () => void;
  onCopy: () => string;
  onPaste: (text: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onScrollChange: (scrollLeft: number, scrollTop: number) => void;
  maxRows: number;
  maxCols: number;
  selection: Selection;
}

export class CanvasRenderer {
  private opts: CanvasRendererOptions;
  private ctx: CanvasRenderingContext2D;
  private scrollLeft = 0;
  private scrollTop = 0;
  private selection: Selection;
  private mouseDown = false;
  private dragStart: { row: number; col: number } | null = null;
  private resizingCol: number | null = null;
  private lastMouseX = 0;

  constructor(opts: CanvasRendererOptions) {
    this.opts = opts;
    this.selection = opts.selection;
    const ctx = opts.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
    this.bindEvents();
  }

  resize(): void {
    const canvas = this.opts.canvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setScroll(scrollLeft: number, scrollTop: number): void {
    this.scrollLeft = scrollLeft;
    this.scrollTop = scrollTop;
  }

  setSelection(selection: Selection): void {
    this.selection = selection;
  }

  scrollIntoView(row: number, col: number): void {
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    let colX = HEADER_COL_WIDTH;
    for (let c = 0; c < col; c++) {
      colX += this.opts.getColWidth(c);
    }
    const cellWidth = this.opts.getColWidth(col);

    let rowY = HEADER_ROW_HEIGHT;
    for (let r = 0; r < row; r++) {
      rowY += this.opts.getRowHeight(r);
    }
    const cellHeight = this.opts.getRowHeight(row);

    const viewX = colX - this.scrollLeft;
    const viewY = rowY - this.scrollTop;
    const viewRight = viewX + cellWidth;
    const viewBottom = viewY + cellHeight;

    let newScrollLeft = this.scrollLeft;
    let newScrollTop = this.scrollTop;

    if (viewX < HEADER_COL_WIDTH) {
      newScrollLeft = colX - HEADER_COL_WIDTH;
    } else if (viewRight > width) {
      newScrollLeft = colX + cellWidth - width;
    }

    if (viewY < HEADER_ROW_HEIGHT) {
      newScrollTop = rowY - HEADER_ROW_HEIGHT;
    } else if (viewBottom > height) {
      newScrollTop = rowY + cellHeight - height;
    }

    newScrollLeft = Math.max(0, newScrollLeft);
    newScrollTop = Math.max(0, newScrollTop);

    const maxScrollLeft = this.computeMaxScrollLeft();
    const maxScrollTop = this.computeMaxScrollTop();
    newScrollLeft = Math.min(newScrollLeft, maxScrollLeft);
    newScrollTop = Math.min(newScrollTop, maxScrollTop);

    if (newScrollLeft !== this.scrollLeft || newScrollTop !== this.scrollTop) {
      this.opts.onScrollChange(newScrollLeft, newScrollTop);
    }
  }

  private computeMaxScrollLeft(): number {
    let totalWidth = 0;
    for (let c = 0; c < this.opts.maxCols; c++) {
      totalWidth += this.opts.getColWidth(c);
    }
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, totalWidth - (rect.width - HEADER_COL_WIDTH));
  }

  private computeMaxScrollTop(): number {
    let totalHeight = 0;
    for (let r = 0; r < this.opts.maxRows; r++) {
      totalHeight += this.opts.getRowHeight(r);
    }
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, totalHeight - (rect.height - HEADER_ROW_HEIGHT));
  }

  render(): void {
    const ctx = this.ctx;
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const visibleCols: { col: number; x: number; width: number }[] = [];
    const visibleRows: { row: number; y: number; height: number }[] = [];

    let colX = HEADER_COL_WIDTH - this.scrollLeft;
    for (let c = 0; c < this.opts.maxCols; c++) {
      const cw = this.opts.getColWidth(c);
      if (colX + cw >= 0 && colX <= width) {
        visibleCols.push({ col: c, x: colX, width: cw });
      }
      colX += cw;
      if (colX > width) break;
    }

    let rowY = HEADER_ROW_HEIGHT - this.scrollTop;
    for (let r = 0; r < this.opts.maxRows; r++) {
      const rh = this.opts.getRowHeight(r);
      if (rowY + rh >= 0 && rowY <= height) {
        visibleRows.push({ row: r, y: rowY, height: rh });
      }
      rowY += rh;
      if (rowY > height) break;
    }

    const sel = this.selection;
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);

    for (const r of visibleRows) {
      for (const c of visibleCols) {
        const cell = this.opts.getCell(r.row, c.col);
        const isSelected =
          r.row >= minRow && r.row <= maxRow &&
          c.col >= minCol && c.col <= maxCol;

        if (cell?.style?.bgColor) {
          ctx.fillStyle = cell.style.bgColor;
          ctx.fillRect(c.x, r.y, c.width, r.height);
        }

        if (isSelected) {
          ctx.fillStyle = SELECTED_BG;
          ctx.fillRect(c.x, r.y, c.width, r.height);
        }

        if (cell && cell.value) {
          const display = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
          const isError = display.startsWith('#');
          const isNumeric = !isError && !isNaN(parseFloat(display)) && !cell.formula;
          const hasExplicitAlign = cell.style?.align !== undefined;
          ctx.font = cell.style?.bold ? 'bold ' + CELL_FONT : CELL_FONT;
          ctx.fillStyle = isError ? ERROR_TEXT : (cell.style?.color || CELL_TEXT);
          ctx.textBaseline = 'middle';
          ctx.textAlign = hasExplicitAlign
            ? cell.style!.align === 'right'
              ? 'right'
              : cell.style!.align === 'center'
                ? 'center'
                : 'left'
            : isNumeric
              ? 'right'
              : 'left';

          const textPadding = 6;
          let textX = c.x + textPadding;
          if (ctx.textAlign === 'right') textX = c.x + c.width - textPadding;
          if (ctx.textAlign === 'center') textX = c.x + c.width / 2;

          const textY = r.y + r.height / 2;
          const text = display;
          const maxTextWidth = c.width - textPadding * 2;

          const truncated = this.truncateText(ctx, text, maxTextWidth);
          ctx.fillText(truncated, textX, textY);
        }
      }
    }

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (const c of visibleCols) {
      ctx.beginPath();
      ctx.moveTo(c.x + c.width, 0);
      ctx.lineTo(c.x + c.width, height);
      ctx.stroke();
    }
    for (const r of visibleRows) {
      ctx.beginPath();
      ctx.moveTo(0, r.y + r.height);
      ctx.lineTo(width, r.y + r.height);
      ctx.stroke();
    }

    this.renderCorner(ctx, 0, 0, HEADER_COL_WIDTH, HEADER_ROW_HEIGHT);

    for (const c of visibleCols) {
      const isHighlighted = c.col >= minCol && c.col <= maxCol;
      this.renderColumnHeader(ctx, c.x, 0, c.width, HEADER_ROW_HEIGHT, colToLetter(c.col), isHighlighted);
    }
    for (const r of visibleRows) {
      const isHighlighted = r.row >= minRow && r.row <= maxRow;
      this.renderRowHeader(ctx, 0, r.y, HEADER_COL_WIDTH, r.height, String(r.row + 1), isHighlighted);
    }

    if (visibleCols.length > 0 && visibleRows.length > 0) {
      const minRow = Math.min(sel.startRow, sel.endRow);
      const maxRow = Math.max(sel.startRow, sel.endRow);
      const minCol = Math.min(sel.startCol, sel.endCol);
      const maxCol = Math.max(sel.startCol, sel.endCol);

      let leftX = 0, topY = 0, selWidth = 0, selHeight = 0;
      let foundLeft = false, foundTop = false, foundRight = false, foundBottom = false;

      let curX = HEADER_COL_WIDTH - this.scrollLeft;
      for (let c = 0; c <= maxCol && c < this.opts.maxCols; c++) {
        const cw = this.opts.getColWidth(c);
        if (c === minCol) {
          leftX = curX;
          foundLeft = true;
        }
        if (c === maxCol) {
          selWidth = curX + cw - leftX;
          foundRight = true;
          break;
        }
        curX += cw;
      }

      let curY = HEADER_ROW_HEIGHT - this.scrollTop;
      for (let r = 0; r <= maxRow && r < this.opts.maxRows; r++) {
        const rh = this.opts.getRowHeight(r);
        if (r === minRow) {
          topY = curY;
          foundTop = true;
        }
        if (r === maxRow) {
          selHeight = curY + rh - topY;
          foundBottom = true;
          break;
        }
        curY += rh;
      }

      if (foundLeft && foundRight && foundTop && foundBottom) {
        ctx.save();
        ctx.strokeStyle = SELECTED_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(leftX + 1, topY + 1, selWidth - 2, selHeight - 2);
        ctx.restore();
      }

      const activeCol = visibleCols.find((c) => c.col === sel.startCol);
      const activeRow = visibleRows.find((r) => r.row === sel.startRow);
      if (activeCol && activeRow && (sel.startRow !== sel.endRow || sel.startCol !== sel.endCol)) {
        ctx.save();
        ctx.strokeStyle = '#525252';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(activeCol.x + 1.5, activeRow.y + 1.5, activeCol.width - 3, activeRow.height - 3);
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  private renderCorner(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = HEADER_BG;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private renderColumnHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, highlighted = false): void {
    ctx.fillStyle = highlighted ? '#d4d4d4' : HEADER_BG;
    ctx.fillRect(x, y, w, h);
    ctx.font = highlighted ? 'bold ' + HEADER_FONT : HEADER_FONT;
    ctx.fillStyle = highlighted ? '#171717' : HEADER_TEXT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private renderRowHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, highlighted = false): void {
    ctx.fillStyle = highlighted ? '#d4d4d4' : HEADER_BG;
    ctx.fillRect(x, y, w, h);
    ctx.font = highlighted ? 'bold ' + HEADER_FONT : HEADER_FONT;
    ctx.fillStyle = highlighted ? '#171717' : HEADER_TEXT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;
    let result = text;
    while (result.length > 0 && ctx.measureText(result + '...').width > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + '...';
  }

  getCellAtPoint(clientX: number, clientY: number): { row: number; col: number } | null {
    const rect = this.opts.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < HEADER_COL_WIDTH || y < HEADER_ROW_HEIGHT) return null;

    let colX = HEADER_COL_WIDTH - this.scrollLeft;
    let foundCol = -1;
    for (let c = 0; c < this.opts.maxCols; c++) {
      const cw = this.opts.getColWidth(c);
      if (x >= colX && x < colX + cw) {
        foundCol = c;
        break;
      }
      colX += cw;
    }

    let rowY = HEADER_ROW_HEIGHT - this.scrollTop;
    let foundRow = -1;
    for (let r = 0; r < this.opts.maxRows; r++) {
      const rh = this.opts.getRowHeight(r);
      if (y >= rowY && y < rowY + rh) {
        foundRow = r;
        break;
      }
      rowY += rh;
    }

    if (foundCol >= 0 && foundRow >= 0) {
      return { row: foundRow, col: foundCol };
    }
    return null;
  }

  getColResizeAt(clientX: number): number | null {
    const rect = this.opts.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < HEADER_COL_WIDTH) return null;

    let colX = HEADER_COL_WIDTH - this.scrollLeft;
    for (let c = 0; c < this.opts.maxCols; c++) {
      const cw = this.opts.getColWidth(c);
      const boundary = colX + cw;
      if (x >= boundary - 4 && x <= boundary + 4) {
        return c;
      }
      colX += cw;
      if (colX > rect.width) break;
    }
    return null;
  }

  private bindEvents(): void {
    const canvas = this.opts.canvas;

    canvas.addEventListener('mousedown', (e) => {
      const resizeCol = this.getColResizeAt(e.clientX);
      if (resizeCol !== null) {
        this.resizingCol = resizeCol;
        this.lastMouseX = e.clientX;
        this.mouseDown = true;
        canvas.style.cursor = 'col-resize';
        return;
      }

      const cell = this.getCellAtPoint(e.clientX, e.clientY);
      if (cell) {
        this.mouseDown = true;
        this.dragStart = { row: cell.row, col: cell.col };
        this.opts.onSelect(cell.row, cell.col);
        this.opts.onSelection({ startRow: cell.row, startCol: cell.col, endRow: cell.row, endCol: cell.col });
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.mouseDown && this.resizingCol !== null) {
        const delta = e.clientX - this.lastMouseX;
        const currentWidth = this.opts.getColWidth(this.resizingCol);
        const newWidth = Math.max(40, currentWidth + delta);
        this.opts.setColWidth(this.resizingCol, newWidth);
        this.lastMouseX = e.clientX;
        return;
      }

      const resizeCol = this.getColResizeAt(e.clientX);
      canvas.style.cursor = resizeCol !== null ? 'col-resize' : 'cell';

      if (this.mouseDown && this.dragStart) {
        const cell = this.getCellAtPoint(e.clientX, e.clientY);
        if (cell) {
          this.opts.onSelection({
            startRow: this.dragStart.row,
            startCol: this.dragStart.col,
            endRow: cell.row,
            endCol: cell.col,
          });
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
      this.dragStart = null;
      this.resizingCol = null;
      canvas.style.cursor = 'cell';
    });

    canvas.addEventListener('dblclick', (e) => {
      const resizeCol = this.getColResizeAt(e.clientX);
      if (resizeCol !== null) {
        const textPadding = 12;
        let maxWidth = 40;
        const ctx = this.ctx;
        ctx.font = CELL_FONT;
        const headerWidth = ctx.measureText(colToLetter(resizeCol)).width + textPadding;
        for (let r = 0; r < this.opts.maxRows; r++) {
          const cell = this.opts.getCell(r, resizeCol);
          if (cell && cell.value) {
            const display = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
            const w = ctx.measureText(display).width + textPadding;
            if (w > maxWidth) maxWidth = w;
          }
        }
        maxWidth = Math.max(maxWidth, headerWidth);
        this.opts.setColWidth(resizeCol, maxWidth);
        return;
      }

      const cell = this.getCellAtPoint(e.clientX, e.clientY);
      if (cell) {
        this.opts.onEdit(cell.row, cell.col);
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const maxLeft = this.computeMaxScrollLeft();
      const maxTop = this.computeMaxScrollTop();
      const newLeft = Math.min(Math.max(0, this.scrollLeft + e.deltaX), maxLeft);
      const newTop = Math.min(Math.max(0, this.scrollTop + e.deltaY), maxTop);
      this.opts.onScrollChange(newLeft, newTop);
    });

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.target && (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const sel = this.selection;
      let row = sel.startRow;
      let col = sel.startCol;
      let changed = false;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          const text = this.opts.onCopy();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
          e.preventDefault();
          return;
        }
        if (e.key === 'v' || e.key === 'V') {
          const handlePaste = (clipboardText: string) => {
            this.opts.onPaste(clipboardText);
          };
          if (navigator.clipboard) {
            navigator.clipboard.readText().then(handlePaste).catch(() => {});
          }
          e.preventDefault();
          return;
        }
        if (e.key === 'x' || e.key === 'X') {
          const text = this.opts.onCopy();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
          this.opts.onClearSelection();
          e.preventDefault();
          return;
        }
        if (e.key === 'z' || e.key === 'Z') {
          this.opts.onUndo();
          e.preventDefault();
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          this.opts.onRedo();
          e.preventDefault();
          return;
        }
      }

      if (e.key === 'ArrowUp') {
        row = Math.max(0, row - 1);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        row = Math.min(this.opts.maxRows - 1, row + 1);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        col = Math.max(0, col - 1);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        col = Math.min(this.opts.maxCols - 1, col + 1);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'Home') {
        if (e.ctrlKey || e.metaKey) {
          row = 0;
          col = 0;
        } else {
          col = 0;
        }
        changed = true;
        e.preventDefault();
      } else if (e.key === 'End') {
        if (e.ctrlKey || e.metaKey) {
          row = this.opts.maxRows - 1;
          col = this.opts.maxCols - 1;
        } else {
          col = this.opts.maxCols - 1;
        }
        changed = true;
        e.preventDefault();
      } else if (e.key === 'PageUp') {
        const canvas = this.opts.canvas;
        const rect = canvas.getBoundingClientRect();
        const visibleRows = Math.max(1, Math.floor((rect.height - HEADER_ROW_HEIGHT) / DEFAULT_ROW_HEIGHT));
        row = Math.max(0, row - visibleRows);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'PageDown') {
        const canvas2 = this.opts.canvas;
        const rect2 = canvas2.getBoundingClientRect();
        const visibleRows2 = Math.max(1, Math.floor((rect2.height - HEADER_ROW_HEIGHT) / DEFAULT_ROW_HEIGHT));
        row = Math.min(this.opts.maxRows - 1, row + visibleRows2);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'Tab') {
        col = Math.min(this.opts.maxCols - 1, col + 1);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'Enter') {
        row = Math.min(this.opts.maxRows - 1, row + 1);
        changed = true;
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const minRow = Math.min(sel.startRow, sel.endRow);
        const maxRow = Math.max(sel.startRow, sel.endRow);
        const minCol = Math.min(sel.startCol, sel.endCol);
        const maxCol = Math.max(sel.startCol, sel.endCol);
        if (minRow === maxRow && minCol === maxCol) {
          this.opts.onEdit(row, col);
        } else {
          this.opts.onClearSelection();
        }
        e.preventDefault();
        return;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.opts.onEditWithChar(row, col, e.key);
        e.preventDefault();
        return;
      } else if (e.key === 'F2') {
        this.opts.onEdit(row, col);
        e.preventDefault();
        return;
      }

      if (changed) {
        col = Math.max(0, Math.min(this.opts.maxCols - 1, col));
        row = Math.max(0, Math.min(this.opts.maxRows - 1, row));
        this.opts.onSelect(row, col);
        this.opts.onSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      }
    });
  }
}

export { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT, HEADER_COL_WIDTH, HEADER_ROW_HEIGHT, FONT_SIZE };

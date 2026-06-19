import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  HEADER_ROW_HEIGHT,
  HEADER_COL_WIDTH,
  HEADER_FONT,
  CELL_FONT,
  FONT_SIZE,
  FONT_FAMILY,
} from '../utils/constants';
import { getThemeColors, type ThemeColors } from '../utils/theme';
import { colToLetter } from '../utils/cellRef';
import { formatNumber } from '../utils/format';
import type { Cell, Selection, MergeRange, ConditionalFormat, NumberFormat } from '../types';

export interface CanvasRendererOptions {
  canvas: HTMLCanvasElement;
  isDark?: boolean;
  getCell: (row: number, col: number) => Cell | undefined;
  getColWidth: (col: number) => number;
  getRowHeight: (row: number) => number;
  setColWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;
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
  onFill: (source: { startRow: number; startCol: number; endRow: number; endCol: number }, target: { startRow: number; startCol: number; endRow: number; endCol: number }) => void;
  onContextMenu: (row: number, col: number, x: number, y: number) => void;
  getMergedRange: (row: number, col: number) => MergeRange | null;
  getConditionalFormats: () => ConditionalFormat[];
  maxRows: number;
  maxCols: number;
  frozenRows?: number;
  frozenCols?: number;
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
  private resizingRow: number | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private fillHandleDragging = false;
  private fillHandleSource: { startRow: number; startCol: number; endRow: number; endCol: number } | null = null;
  private fillHandleTarget: { row: number; col: number } | null = null;
  private theme: ThemeColors;

  constructor(opts: CanvasRendererOptions) {
    this.opts = opts;
    this.selection = opts.selection;
    this.theme = getThemeColors(opts.isDark ?? false);
    const ctx = opts.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
    this.bindEvents();
  }

  setTheme(isDark: boolean): void {
    this.theme = getThemeColors(isDark);
  }

  setFrozenPanes(frozenRows: number, frozenCols: number): void {
    this.opts.frozenRows = frozenRows;
    this.opts.frozenCols = frozenCols;
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

  private themeColor(key: keyof ThemeColors): string {
    return this.theme[key];
  }

  private buildCellFont(style?: Cell['style']): string {
    const size = style?.fontSize || FONT_SIZE;
    const family = style?.fontFamily || FONT_FAMILY;
    const weight = style?.bold ? 'bold ' : '';
    const styleItalic = style?.italic ? 'italic ' : '';
    const styleUnderline = style?.underline ? 'underline ' : '';
    // Canvas doesn't support underline in font string, but we can note it
    return `${weight}${styleItalic}${size}px ${family}`;
  }

  scrollIntoView(row: number, col: number): void {
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const frozenRows = this.opts.frozenRows ?? 0;
    const frozenCols = this.opts.frozenCols ?? 0;
    const frozenWidth = this.getFrozenWidth(frozenCols);
    const frozenHeight = this.getFrozenHeight(frozenRows);

    if (row < frozenRows && col < frozenCols) return;

    let colX = HEADER_COL_WIDTH;
    for (let c = 0; c < col && c < this.opts.maxCols; c++) {
      colX += this.opts.getColWidth(c);
    }
    const cellWidth = this.opts.getColWidth(col);

    let rowY = HEADER_ROW_HEIGHT;
    for (let r = 0; r < row && r < this.opts.maxRows; r++) {
      rowY += this.opts.getRowHeight(r);
    }
    const cellHeight = this.opts.getRowHeight(row);

    let newScrollLeft = this.scrollLeft;
    let newScrollTop = this.scrollTop;

    if (col >= frozenCols) {
      const scrollableX = HEADER_COL_WIDTH + frozenWidth;
      const viewX = colX - this.scrollLeft;
      const viewRight = viewX + cellWidth;
      if (viewX < scrollableX) {
        newScrollLeft = colX - scrollableX;
      } else if (viewRight > width) {
        newScrollLeft = colX + cellWidth - width;
      }
    }

    if (row >= frozenRows) {
      const scrollableY = HEADER_ROW_HEIGHT + frozenHeight;
      const viewY = rowY - this.scrollTop;
      const viewBottom = viewY + cellHeight;
      if (viewY < scrollableY) {
        newScrollTop = rowY - scrollableY;
      } else if (viewBottom > height) {
        newScrollTop = rowY + cellHeight - height;
      }
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
    const frozenCols = this.opts.frozenCols ?? 0;
    for (let c = frozenCols; c < this.opts.maxCols; c++) {
      totalWidth += this.opts.getColWidth(c);
    }
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    const frozenWidth = this.getFrozenWidth(frozenCols);
    return Math.max(0, totalWidth - (rect.width - HEADER_COL_WIDTH - frozenWidth));
  }

  private computeMaxScrollTop(): number {
    let totalHeight = 0;
    const frozenRows = this.opts.frozenRows ?? 0;
    for (let r = frozenRows; r < this.opts.maxRows; r++) {
      totalHeight += this.opts.getRowHeight(r);
    }
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    const frozenHeight = this.getFrozenHeight(frozenRows);
    return Math.max(0, totalHeight - (rect.height - HEADER_ROW_HEIGHT - frozenHeight));
  }

  private formatCellValue(value: string, format?: NumberFormat): string {
    return formatNumber(value, format);
  }

  render(): void {
    const ctx = this.ctx;
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = this.themeColor('bg');
    ctx.fillRect(0, 0, width, height);

    const frozenRows = this.opts.frozenRows ?? 0;
    const frozenCols = this.opts.frozenCols ?? 0;
    const frozenWidth = this.getFrozenWidth(frozenCols);
    const frozenHeight = this.getFrozenHeight(frozenRows);

    const frozenColsVisible = this.getVisibleCols(0, 0, frozenCols - 1, HEADER_COL_WIDTH, HEADER_COL_WIDTH + frozenWidth);
    const scrollColsVisible = this.getVisibleCols(this.scrollLeft, frozenCols, this.opts.maxCols - 1, HEADER_COL_WIDTH + frozenWidth, width);
    const frozenRowsVisible = this.getVisibleRows(0, 0, frozenRows - 1, HEADER_ROW_HEIGHT, HEADER_ROW_HEIGHT + frozenHeight);
    const scrollRowsVisible = this.getVisibleRows(this.scrollTop, frozenRows, this.opts.maxRows - 1, HEADER_ROW_HEIGHT + frozenHeight, height);

    const allCols = [...frozenColsVisible, ...scrollColsVisible];
    const allRows = [...frozenRowsVisible, ...scrollRowsVisible];

    const sel = this.selection;

    // Render cells in layers: scrollable first, then frozen rows/cols/corner on top
    const cellAreaX = HEADER_COL_WIDTH + frozenWidth;
    const cellAreaY = HEADER_ROW_HEIGHT + frozenHeight;
    this.renderCellLayer(ctx, scrollColsVisible, scrollRowsVisible, { x: cellAreaX, y: cellAreaY, w: width - cellAreaX, h: height - cellAreaY });
    this.renderCellLayer(ctx, scrollColsVisible, frozenRowsVisible, { x: cellAreaX, y: HEADER_ROW_HEIGHT, w: width - cellAreaX, h: frozenHeight });
    this.renderCellLayer(ctx, frozenColsVisible, scrollRowsVisible, { x: HEADER_COL_WIDTH, y: cellAreaY, w: frozenWidth, h: height - cellAreaY });
    this.renderCellLayer(ctx, frozenColsVisible, frozenRowsVisible, { x: HEADER_COL_WIDTH, y: HEADER_ROW_HEIGHT, w: frozenWidth, h: frozenHeight });

    // Grid lines
    this.renderGridLines(ctx, allCols, allRows, width, height);

    // Cell borders
    this.renderCellBorders(ctx, allRows, allCols);

    // Headers
    this.renderCorner(ctx, 0, 0, HEADER_COL_WIDTH, HEADER_ROW_HEIGHT);
    this.renderColumnHeaders(ctx, frozenColsVisible);
    this.renderColumnHeaders(ctx, scrollColsVisible);
    this.renderRowHeaders(ctx, frozenRowsVisible);
    this.renderRowHeaders(ctx, scrollRowsVisible);

    // Selection overlay
    this.renderSelectionOverlay(ctx, sel);
  }

  private getFrozenWidth(frozenCols: number): number {
    let w = 0;
    for (let c = 0; c < frozenCols && c < this.opts.maxCols; c++) {
      w += this.opts.getColWidth(c);
    }
    return w;
  }

  private getFrozenHeight(frozenRows: number): number {
    let h = 0;
    for (let r = 0; r < frozenRows && r < this.opts.maxRows; r++) {
      h += this.opts.getRowHeight(r);
    }
    return h;
  }

  private getVisibleCols(
    scrollOffset: number,
    startCol: number,
    endCol: number,
    areaStartX: number,
    areaEndX: number
  ): { col: number; x: number; width: number }[] {
    const cols: { col: number; x: number; width: number }[] = [];
    let x = areaStartX - scrollOffset;
    for (let c = Math.max(0, startCol); c <= endCol && c < this.opts.maxCols; c++) {
      const cw = this.opts.getColWidth(c);
      if (x + cw >= areaStartX - scrollOffset && x <= areaEndX) {
        cols.push({ col: c, x, width: cw });
      }
      x += cw;
      if (x > areaEndX) break;
    }
    return cols;
  }

  private getVisibleRows(
    scrollOffset: number,
    startRow: number,
    endRow: number,
    areaStartY: number,
    areaEndY: number
  ): { row: number; y: number; height: number }[] {
    const rows: { row: number; y: number; height: number }[] = [];
    let y = areaStartY - scrollOffset;
    for (let r = Math.max(0, startRow); r <= endRow && r < this.opts.maxRows; r++) {
      const rh = this.opts.getRowHeight(r);
      if (y + rh >= areaStartY - scrollOffset && y <= areaEndY) {
        rows.push({ row: r, y, height: rh });
      }
      y += rh;
      if (y > areaEndY) break;
    }
    return rows;
  }

  private renderCellLayer(
    ctx: CanvasRenderingContext2D,
    cols: { col: number; x: number; width: number }[],
    rows: { row: number; y: number; height: number }[],
    clip: { x: number; y: number; w: number; h: number }
  ): void {
    if (cols.length === 0 || rows.length === 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.w, clip.h);
    ctx.clip();

    const sel = this.selection;
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);

    const renderedMerges = new Set<string>();

    for (const r of rows) {
      for (const c of cols) {
        const cell = this.opts.getCell(r.row, c.col);
        const isSelected = r.row >= minRow && r.row <= maxRow && c.col >= minCol && c.col <= maxCol;

        const merge = this.opts.getMergedRange(r.row, c.col);
        const isMergeMain = merge && merge.startRow === r.row && merge.startCol === c.col;
        const isMergedChild = merge && !isMergeMain;
        const mergeKey = merge ? `${merge.startRow},${merge.startCol}` : `${r.row},${c.col}`;

        if (isMergedChild) continue;

        const renderX = c.x;
        const renderY = r.y;
        let renderWidth = c.width;
        let renderHeight = r.height;

        if (isMergeMain && !renderedMerges.has(mergeKey)) {
          renderedMerges.add(mergeKey);
          let totalWidth = 0;
          let totalHeight = 0;
          for (let cc = merge.startCol; cc <= merge.endCol; cc++) {
            totalWidth += this.opts.getColWidth(cc);
          }
          for (let rr = merge.startRow; rr <= merge.endRow; rr++) {
            totalHeight += this.opts.getRowHeight(rr);
          }
          renderWidth = totalWidth;
          renderHeight = totalHeight;
        }

        if (cell?.style?.bgColor && !isSelected) {
          ctx.fillStyle = cell.style.bgColor;
          ctx.fillRect(renderX, renderY, renderWidth, renderHeight);
        }

        const conditionalBg = this.getConditionalBgColor(r.row, c.col, cell);
        if (conditionalBg) {
          ctx.fillStyle = conditionalBg;
          ctx.fillRect(renderX, renderY, renderWidth, renderHeight);
        }

        if (isSelected) {
          ctx.fillStyle = this.themeColor('selectedBg');
          ctx.fillRect(renderX, renderY, renderWidth, renderHeight);
        }

        if (cell && cell.value) {
          const display = cell.computed !== undefined && cell.formula ? String(cell.computed) : cell.value;
          const isError = display.startsWith('#');
          const formattedDisplay = isError ? display : this.formatCellValue(display, cell.numberFormat);
          const isNumeric = !isError && !isNaN(parseFloat(display)) && !cell.formula;
          const hasExplicitAlign = cell.style?.align !== undefined;
          ctx.font = this.buildCellFont(cell.style);
          ctx.fillStyle = isError ? this.themeColor('errorText') : (cell.style?.color || this.themeColor('cellText'));
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
          let textX = renderX + textPadding;
          if (ctx.textAlign === 'right') textX = renderX + renderWidth - textPadding;
          if (ctx.textAlign === 'center') textX = renderX + renderWidth / 2;

          const text = formattedDisplay;
          const maxTextWidth = renderWidth - textPadding * 2;

          if (cell.style?.wrap) {
            const fontSize = cell.style?.fontSize || FONT_SIZE;
            const lines = this.wrapText(ctx, text, maxTextWidth);
            const lineHeight = fontSize + 3;
            const totalHeight = lines.length * lineHeight;
            const startY = renderY + Math.max(textPadding, (renderHeight - totalHeight) / 2 + lineHeight / 2);
            for (let i = 0; i < lines.length; i++) {
              const y = startY + i * lineHeight;
              if (y - lineHeight / 2 < renderY + renderHeight - textPadding && y + lineHeight / 2 > renderY + textPadding) {
                ctx.fillText(lines[i], textX, y);
              }
            }
          } else {
            const truncated = this.truncateText(ctx, text, maxTextWidth);
            ctx.fillText(truncated, textX, renderY + renderHeight / 2);
            // Draw underline
            if (cell.style?.underline) {
              const metrics = ctx.measureText(truncated);
              const underlineY = renderY + renderHeight / 2 + (cell.style?.fontSize || FONT_SIZE) / 2 + 1;
              ctx.beginPath();
              ctx.moveTo(textX - (ctx.textAlign === 'center' ? metrics.width / 2 : ctx.textAlign === 'right' ? metrics.width : 0), underlineY);
              ctx.lineTo(textX + (ctx.textAlign === 'center' ? metrics.width / 2 : ctx.textAlign === 'right' ? 0 : metrics.width), underlineY);
              ctx.strokeStyle = ctx.fillStyle;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        if (cell?.comment) {
          const markerSize = 6;
          ctx.fillStyle = this.themeColor('commentMarker');
          ctx.beginPath();
          ctx.moveTo(renderX + renderWidth - markerSize, renderY);
          ctx.lineTo(renderX + renderWidth, renderY);
          ctx.lineTo(renderX + renderWidth, renderY + markerSize);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  private renderGridLines(
    ctx: CanvasRenderingContext2D,
    cols: { col: number; x: number; width: number }[],
    rows: { row: number; y: number; height: number }[],
    width: number,
    height: number
  ): void {
    ctx.strokeStyle = this.themeColor('grid');
    ctx.lineWidth = 1;
    for (const c of cols) {
      ctx.beginPath();
      ctx.moveTo(c.x + c.width, 0);
      ctx.lineTo(c.x + c.width, height);
      ctx.stroke();
    }
    for (const r of rows) {
      ctx.beginPath();
      ctx.moveTo(0, r.y + r.height);
      ctx.lineTo(width, r.y + r.height);
      ctx.stroke();
    }
  }

  private renderColumnHeaders(
    ctx: CanvasRenderingContext2D,
    cols: { col: number; x: number; width: number }[]
  ): void {
    const sel = this.selection;
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);
    for (const c of cols) {
      const isHighlighted = c.col >= minCol && c.col <= maxCol;
      this.renderColumnHeader(ctx, c.x, 0, c.width, HEADER_ROW_HEIGHT, colToLetter(c.col), isHighlighted);
    }
  }

  private renderRowHeaders(
    ctx: CanvasRenderingContext2D,
    rows: { row: number; y: number; height: number }[]
  ): void {
    const sel = this.selection;
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    for (const r of rows) {
      const isHighlighted = r.row >= minRow && r.row <= maxRow;
      this.renderRowHeader(ctx, 0, r.y, HEADER_COL_WIDTH, r.height, String(r.row + 1), isHighlighted);
    }
  }

  private renderSelectionOverlay(
    ctx: CanvasRenderingContext2D,
    sel: Selection
  ): void {
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);
    const frozenRows = this.opts.frozenRows ?? 0;
    const frozenCols = this.opts.frozenCols ?? 0;

    let leftX = HEADER_COL_WIDTH;
    for (let c = 0; c < minCol && c < this.opts.maxCols; c++) {
      leftX += this.opts.getColWidth(c);
    }
    if (minCol >= frozenCols) {
      leftX -= this.scrollLeft;
    }

    let rightX = leftX;
    for (let c = minCol; c <= maxCol && c < this.opts.maxCols; c++) {
      rightX += this.opts.getColWidth(c);
    }

    let topY = HEADER_ROW_HEIGHT;
    for (let r = 0; r < minRow && r < this.opts.maxRows; r++) {
      topY += this.opts.getRowHeight(r);
    }
    if (minRow >= frozenRows) {
      topY -= this.scrollTop;
    }

    let bottomY = topY;
    for (let r = minRow; r <= maxRow && r < this.opts.maxRows; r++) {
      bottomY += this.opts.getRowHeight(r);
    }

    const selWidth = rightX - leftX;
    const selHeight = bottomY - topY;

    ctx.save();
    ctx.strokeStyle = this.themeColor('selectedBorder');
    ctx.lineWidth = 2;
    ctx.strokeRect(leftX + 1, topY + 1, selWidth - 2, selHeight - 2);
    ctx.restore();

    const handleX = leftX + selWidth - 4;
    const handleY = topY + selHeight - 4;
    ctx.save();
    ctx.fillStyle = this.themeColor('fillHandleBg');
    ctx.strokeStyle = this.themeColor('fillHandleBorder');
    ctx.lineWidth = 1;
    ctx.fillRect(handleX, handleY, 8, 8);
    ctx.strokeRect(handleX + 0.5, handleY + 0.5, 7, 7);
    ctx.restore();

    if (this.fillHandleDragging && this.fillHandleTarget) {
      const tRow = this.fillHandleTarget.row;
      const tCol = this.fillHandleTarget.col;
      const fMinRow = Math.min(sel.startRow, sel.endRow, tRow);
      const fMaxRow = Math.max(sel.startRow, sel.endRow, tRow);
      const fMinCol = Math.min(sel.startCol, sel.endCol, tCol);
      const fMaxCol = Math.max(sel.startCol, sel.endCol, tCol);

      let fx = HEADER_COL_WIDTH;
      for (let c = 0; c < fMinCol && c < this.opts.maxCols; c++) {
        fx += this.opts.getColWidth(c);
      }
      if (fMinCol >= frozenCols) fx -= this.scrollLeft;

      let fy = HEADER_ROW_HEIGHT;
      for (let r = 0; r < fMinRow && r < this.opts.maxRows; r++) {
        fy += this.opts.getRowHeight(r);
      }
      if (fMinRow >= frozenRows) fy -= this.scrollTop;

      let fw = 0;
      for (let c = fMinCol; c <= fMaxCol && c < this.opts.maxCols; c++) {
        fw += this.opts.getColWidth(c);
      }

      let fh = 0;
      for (let r = fMinRow; r <= fMaxRow && r < this.opts.maxRows; r++) {
        fh += this.opts.getRowHeight(r);
      }

      ctx.save();
      ctx.fillStyle = this.themeColor('fillAreaBg');
      ctx.fillRect(fx, fy, fw, fh);
      ctx.strokeStyle = this.themeColor('fillAreaBorder');
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (sel.startRow !== sel.endRow || sel.startCol !== sel.endCol) {
      let activeColX = HEADER_COL_WIDTH;
      for (let c = 0; c < sel.startCol && c < this.opts.maxCols; c++) {
        activeColX += this.opts.getColWidth(c);
      }
      if (sel.startCol >= frozenCols) activeColX -= this.scrollLeft;

      let activeRowY = HEADER_ROW_HEIGHT;
      for (let r = 0; r < sel.startRow && r < this.opts.maxRows; r++) {
        activeRowY += this.opts.getRowHeight(r);
      }
      if (sel.startRow >= frozenRows) activeRowY -= this.scrollTop;

      ctx.save();
      ctx.strokeStyle = this.themeColor('fillAreaBorder');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(activeColX + 1.5, activeRowY + 1.5, 
        this.opts.getColWidth(sel.startCol) - 3, this.opts.getRowHeight(sel.startRow) - 3);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private findColAtX(x: number, col: number): { col: number; x: number; width: number } | null {
    if (col < 0 || col >= this.opts.maxCols) return null;
    return { col, x, width: this.opts.getColWidth(col) };
  }

  private findRowAtY(y: number, row: number): { row: number; y: number; height: number } | null {
    if (row < 0 || row >= this.opts.maxRows) return null;
    return { row, y, height: this.opts.getRowHeight(row) };
  }

  private getConditionalBgColor(row: number, col: number, cell: Cell | undefined): string | null {
    const formats = this.opts.getConditionalFormats();
    if (formats.length === 0) return null;
    let colorScaleValue: number | null = null;
    let colorScaleFormat: ConditionalFormat | null = null;

    for (const f of formats) {
      if (row < f.range.startRow || row > f.range.endRow || col < f.range.startCol || col > f.range.endCol) continue;
      const v = cell?.computed !== undefined && cell?.formula ? cell.computed : cell?.value;
      const num = typeof v === 'number' ? v : parseFloat(v as string);

      if (f.type === 'colorScale') {
        if (!isNaN(num)) {
          colorScaleValue = num;
          colorScaleFormat = f;
        }
        continue;
      }

      if (f.type === 'value') {
        const cv = f.value !== undefined ? (typeof f.value === 'number' ? f.value : parseFloat(f.value)) : NaN;
        if (isNaN(num) || isNaN(cv)) continue;
        if (f.condition === 'greaterThan' && num > cv && f.bgColor) return f.bgColor;
        if (f.condition === 'lessThan' && num < cv && f.bgColor) return f.bgColor;
        if (f.condition === 'equalTo' && num === cv && f.bgColor) return f.bgColor;
      }
    }

    if (colorScaleFormat && colorScaleValue !== null) {
      const f = colorScaleFormat;
      let min = Infinity;
      let max = -Infinity;
      for (let r = f.range.startRow; r <= f.range.endRow; r++) {
        for (let c = f.range.startCol; c <= f.range.endCol; c++) {
          const other = this.opts.getCell(r, c);
          const ov = other?.computed !== undefined && other?.formula ? other.computed : other?.value;
          const on = typeof ov === 'number' ? ov : parseFloat(ov as string);
          if (!isNaN(on)) {
            if (on < min) min = on;
            if (on > max) max = on;
          }
        }
      }
      if (min !== Infinity && max !== -Infinity && max !== min) {
        const ratio = (colorScaleValue - min) / (max - min);
        return this.interpolateColor(f.minColor || '#fee2e2', f.maxColor || '#dcfce7', ratio);
      }
    }

    return null;
  }

  private interpolateColor(start: string, end: string, ratio: number): string {
    const parse = (hex: string) => {
      const h = hex.replace('#', '');
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
      };
    };
    const s = parse(start);
    const e = parse(end);
    const r = Math.round(s.r + (e.r - s.r) * ratio);
    const g = Math.round(s.g + (e.g - s.g) * ratio);
    const b = Math.round(s.b + (e.b - s.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private renderCellBorders(
    ctx: CanvasRenderingContext2D,
    visibleRows: { row: number; y: number; height: number }[],
    visibleCols: { col: number; x: number; width: number }[]
  ): void {
    for (const r of visibleRows) {
      for (const c of visibleCols) {
        const cell = this.opts.getCell(r.row, c.col);
        if (!cell?.style) continue;
        const borders = [
          { side: cell.style.borderTop, x: c.x, y: r.y, x2: c.x + c.width, y2: r.y },
          { side: cell.style.borderBottom, x: c.x, y: r.y + r.height, x2: c.x + c.width, y2: r.y + r.height },
          { side: cell.style.borderLeft, x: c.x, y: r.y, x2: c.x, y2: r.y + r.height },
          { side: cell.style.borderRight, x: c.x + c.width, y: r.y, x2: c.x + c.width, y2: r.y + r.height },
        ];
        for (const b of borders) {
          if (!b.side) continue;
          ctx.save();
          ctx.strokeStyle = b.side.color;
          ctx.lineWidth = b.side.style === 'thick' ? 3 : b.side.style === 'medium' ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(b.x + 0.5, b.y + 0.5);
          ctx.lineTo(b.x2 + 0.5, b.y2 + 0.5);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  private renderCorner(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = this.themeColor('headerBg');
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = this.themeColor('grid');
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private renderColumnHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, highlighted = false): void {
    ctx.fillStyle = highlighted ? this.themeColor('headerHighlightBg') : this.themeColor('headerBg');
    ctx.fillRect(x, y, w, h);
    ctx.font = highlighted ? 'bold ' + HEADER_FONT : HEADER_FONT;
    ctx.fillStyle = highlighted ? this.themeColor('headerHighlightText') : this.themeColor('headerText');
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.strokeStyle = this.themeColor('grid');
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private renderRowHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, highlighted = false): void {
    ctx.fillStyle = highlighted ? this.themeColor('headerHighlightBg') : this.themeColor('headerBg');
    ctx.fillRect(x, y, w, h);
    ctx.font = highlighted ? 'bold ' + HEADER_FONT : HEADER_FONT;
    ctx.fillStyle = highlighted ? this.themeColor('headerHighlightText') : this.themeColor('headerText');
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.strokeStyle = this.themeColor('grid');
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

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const lines: string[] = [];
    let current = '';
    for (const char of text) {
      const test = current + char;
      if (ctx.measureText(test).width > maxWidth && current !== '') {
        lines.push(current);
        current = char;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length === 0 ? [text] : lines;
  }

  getCellAtPoint(clientX: number, clientY: number): { row: number; col: number } | null {
    const rect = this.opts.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < HEADER_COL_WIDTH || y < HEADER_ROW_HEIGHT) return null;

    const frozenRows = this.opts.frozenRows ?? 0;
    const frozenCols = this.opts.frozenCols ?? 0;
    const frozenWidth = this.getFrozenWidth(frozenCols);
    const frozenHeight = this.getFrozenHeight(frozenRows);

    let foundCol = -1;
    if (x < HEADER_COL_WIDTH + frozenWidth) {
      let colX = HEADER_COL_WIDTH;
      for (let c = 0; c < frozenCols && c < this.opts.maxCols; c++) {
        const cw = this.opts.getColWidth(c);
        if (x >= colX && x < colX + cw) {
          foundCol = c;
          break;
        }
        colX += cw;
      }
    } else {
      let colX = HEADER_COL_WIDTH + frozenWidth - this.scrollLeft;
      for (let c = frozenCols; c < this.opts.maxCols; c++) {
        const cw = this.opts.getColWidth(c);
        if (x >= colX && x < colX + cw) {
          foundCol = c;
          break;
        }
        colX += cw;
      }
    }

    let foundRow = -1;
    if (y < HEADER_ROW_HEIGHT + frozenHeight) {
      let rowY = HEADER_ROW_HEIGHT;
      for (let r = 0; r < frozenRows && r < this.opts.maxRows; r++) {
        const rh = this.opts.getRowHeight(r);
        if (y >= rowY && y < rowY + rh) {
          foundRow = r;
          break;
        }
        rowY += rh;
      }
    } else {
      let rowY = HEADER_ROW_HEIGHT + frozenHeight - this.scrollTop;
      for (let r = frozenRows; r < this.opts.maxRows; r++) {
        const rh = this.opts.getRowHeight(r);
        if (y >= rowY && y < rowY + rh) {
          foundRow = r;
          break;
        }
        rowY += rh;
      }
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

    const frozenCols = this.opts.frozenCols ?? 0;
    const frozenWidth = this.getFrozenWidth(frozenCols);

    let colX = HEADER_COL_WIDTH;
    for (let c = 0; c < frozenCols && c < this.opts.maxCols; c++) {
      const cw = this.opts.getColWidth(c);
      const boundary = colX + cw;
      if (x >= boundary - 4 && x <= boundary + 4) {
        return c;
      }
      colX += cw;
    }

    colX = HEADER_COL_WIDTH + frozenWidth - this.scrollLeft;
    for (let c = frozenCols; c < this.opts.maxCols; c++) {
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

  getRowResizeAt(clientY: number): number | null {
    const rect = this.opts.canvas.getBoundingClientRect();
    const y = clientY - rect.top;
    if (y < HEADER_ROW_HEIGHT) return null;

    const frozenRows = this.opts.frozenRows ?? 0;
    const frozenHeight = this.getFrozenHeight(frozenRows);

    let rowY = HEADER_ROW_HEIGHT;
    for (let r = 0; r < frozenRows && r < this.opts.maxRows; r++) {
      const rh = this.opts.getRowHeight(r);
      const boundary = rowY + rh;
      if (y >= boundary - 4 && y <= boundary + 4) {
        return r;
      }
      rowY += rh;
    }

    rowY = HEADER_ROW_HEIGHT + frozenHeight - this.scrollTop;
    for (let r = frozenRows; r < this.opts.maxRows; r++) {
      const rh = this.opts.getRowHeight(r);
      const boundary = rowY + rh;
      if (y >= boundary - 4 && y <= boundary + 4) {
        return r;
      }
      rowY += rh;
      if (rowY > rect.height) break;
    }
    return null;
  }

  private getFillHandleRect(): { x: number; y: number } | null {
    const sel = this.selection;
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const maxCol = Math.max(sel.startCol, sel.endCol);
    const frozenRows = this.opts.frozenRows ?? 0;
    const frozenCols = this.opts.frozenCols ?? 0;

    let x = HEADER_COL_WIDTH;
    for (let c = 0; c <= maxCol && c < this.opts.maxCols; c++) {
      const cw = this.opts.getColWidth(c);
      if (c === maxCol) {
        x += cw - 4;
        break;
      }
      x += cw;
      if (c === frozenCols - 1) x -= this.scrollLeft;
    }

    let y = HEADER_ROW_HEIGHT;
    for (let r = 0; r <= maxRow && r < this.opts.maxRows; r++) {
      const rh = this.opts.getRowHeight(r);
      if (r === maxRow) {
        y += rh - 4;
        break;
      }
      y += rh;
      if (r === frozenRows - 1) y -= this.scrollTop;
    }

    const rect = this.opts.canvas.getBoundingClientRect();
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return { x, y };
  }

  private getFillHandleAt(clientX: number, clientY: number): boolean {
    const rect = this.getFillHandleRect();
    if (!rect) return false;
    const canvasRect = this.opts.canvas.getBoundingClientRect();
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    return x >= rect.x && x <= rect.x + 8 && y >= rect.y && y <= rect.y + 8;
  }

  private bindEvents(): void {
    const canvas = this.opts.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (this.getFillHandleAt(e.clientX, e.clientY)) {
        this.fillHandleDragging = true;
        this.fillHandleSource = {
          startRow: Math.min(this.selection.startRow, this.selection.endRow),
          startCol: Math.min(this.selection.startCol, this.selection.endCol),
          endRow: Math.max(this.selection.startRow, this.selection.endRow),
          endCol: Math.max(this.selection.startCol, this.selection.endCol),
        };
        this.fillHandleTarget = { row: this.selection.endRow, col: this.selection.endCol };
        this.mouseDown = true;
        canvas.style.cursor = 'crosshair';
        return;
      }

      const resizeCol = this.getColResizeAt(e.clientX);
      if (resizeCol !== null) {
        this.resizingCol = resizeCol;
        this.lastMouseX = e.clientX;
        this.mouseDown = true;
        canvas.style.cursor = 'col-resize';
        return;
      }

      const resizeRow = this.getRowResizeAt(e.clientY);
      if (resizeRow !== null) {
        this.resizingRow = resizeRow;
        this.lastMouseY = e.clientY;
        this.mouseDown = true;
        canvas.style.cursor = 'row-resize';
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

      if (this.mouseDown && this.resizingRow !== null) {
        const delta = e.clientY - this.lastMouseY;
        const currentHeight = this.opts.getRowHeight(this.resizingRow);
        const newHeight = Math.max(20, currentHeight + delta);
        this.opts.setRowHeight(this.resizingRow, newHeight);
        this.lastMouseY = e.clientY;
        return;
      }

      if (this.mouseDown && this.fillHandleDragging && this.fillHandleSource) {
        const cell = this.getCellAtPoint(e.clientX, e.clientY);
        if (cell) {
          const source = this.fillHandleSource;
          let targetRow = cell.row;
          let targetCol = cell.col;
          if (source.startRow === source.endRow && source.startCol === source.endCol) {
            // single cell: allow any direction
          } else if (source.startRow === source.endRow) {
            targetRow = source.endRow;
          } else if (source.startCol === source.endCol) {
            targetCol = source.endCol;
          }
          this.fillHandleTarget = { row: targetRow, col: targetCol };
          this.render();
        }
        return;
      }

      const resizeCol = this.getColResizeAt(e.clientX);
      const resizeRow = this.getRowResizeAt(e.clientY);
      const overHandle = this.getFillHandleAt(e.clientX, e.clientY);
      let cursor = 'cell';
      if (resizeCol !== null) cursor = 'col-resize';
      else if (resizeRow !== null) cursor = 'row-resize';
      else if (overHandle) cursor = 'crosshair';
      canvas.style.cursor = cursor;

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
      if (this.fillHandleDragging && this.fillHandleSource && this.fillHandleTarget) {
        const source = this.fillHandleSource;
        const target = this.fillHandleTarget;
        const tMinRow = Math.min(source.startRow, target.row);
        const tMaxRow = Math.max(source.endRow, target.row);
        const tMinCol = Math.min(source.startCol, target.col);
        const tMaxCol = Math.max(source.endCol, target.col);
        this.opts.onFill(
          { startRow: source.startRow, startCol: source.startCol, endRow: source.endRow, endCol: source.endCol },
          { startRow: tMinRow, startCol: tMinCol, endRow: tMaxRow, endCol: tMaxCol }
        );
        this.opts.onSelection({ startRow: tMinRow, startCol: tMinCol, endRow: tMaxRow, endCol: tMaxCol });
      }
      this.mouseDown = false;
      this.dragStart = null;
      this.resizingCol = null;
      this.resizingRow = null;
      this.fillHandleDragging = false;
      this.fillHandleSource = null;
      this.fillHandleTarget = null;
      canvas.style.cursor = 'cell';
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const cell = this.getCellAtPoint(e.clientX, e.clientY);
      if (cell) {
        this.opts.onSelect(cell.row, cell.col);
        this.opts.onSelection({ startRow: cell.row, startCol: cell.col, endRow: cell.row, endCol: cell.col });
        this.opts.onContextMenu(cell.row, cell.col, e.clientX, e.clientY);
      }
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

      const resizeRow = this.getRowResizeAt(e.clientY);
      if (resizeRow !== null) {
        this.opts.setRowHeight(resizeRow, DEFAULT_ROW_HEIGHT);
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

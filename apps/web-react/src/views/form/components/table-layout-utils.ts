/**
 * TableLayout 合并单元格 / 列宽纯函数，对齐 Vue `TableLayout.vue` 与 `config/TableLayout.vue`。
 *
 * 数据形状（与 Vue 完全一致）：
 * - `columns[row][col]`：单元格内的子组件数组
 * - `widths[col]`：列宽百分比（总和通常为 100）
 * - `heights[row]`：行高像素值（最小 40，默认 40）
 * - `cellSpans[row][col]`：`{ row, col }` 行列跨度；`0` 表示被同行/同列的合并主格覆盖
 */

export interface CellSpan {
  row: number;
  col: number;
}

export type TableCell = any[];

export interface TableGrid {
  columns: TableCell[][];
  widths: number[];
  heights: number[];
  cellSpans: CellSpan[][];
}

export interface TableLayoutPropsLike {
  columns?: unknown;
  widths?: unknown;
  heights?: unknown;
  cellSpans?: unknown;
}

export type MergeDirection = 'top' | 'bottom' | 'left' | 'right';

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function equalWidths(cols: number): number[] {
  if (cols <= 0) return [];
  return Array.from({ length: cols }, () => round2(100 / cols));
}

export function blankSpans(rows: number, cols: number): CellSpan[][] {
  return Array.from({ length: Math.max(0, rows) }, () =>
    Array.from({ length: Math.max(0, cols) }, () => ({ row: 1, col: 1 }))
  );
}

export function isMasterCell(span: CellSpan | undefined): boolean {
  return !!span && span.row > 0 && span.col > 0;
}

function clampSpan(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(0, Math.floor(num));
}

function normalizeSpan(value: unknown): CellSpan {
  const span = value && typeof value === 'object' ? (value as Partial<CellSpan>) : {};
  return { row: clampSpan(span.row), col: clampSpan(span.col) };
}

function normalizeWidths(raw: unknown[], colCount: number): number[] {
  if (colCount <= 0) return [];
  const widths = raw.slice(0, colCount).map((value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? round2(num) : round2(100 / colCount);
  });
  while (widths.length < colCount) widths.push(round2(100 / colCount));
  return widths;
}

/** 归一化 props（缺省合并、缺省列宽、缺省行高时保持旧数据可用） */
export function toGrid(props: TableLayoutPropsLike = {}): TableGrid {
  const rawColumns = Array.isArray(props.columns) ? props.columns : [];
  const rawSpans = Array.isArray(props.cellSpans) ? props.cellSpans : [];
  const rawHeights = Array.isArray(props.heights) ? props.heights : [];
  const rawWidths = Array.isArray(props.widths) ? props.widths : [];

  const rows = Math.max(rawColumns.length, rawSpans.length, rawHeights.length);
  const colCount = Math.max(
    0,
    rawWidths.length,
    ...rawColumns.map((row) => (Array.isArray(row) ? row.length : 0)),
    ...rawSpans.map((row) => (Array.isArray(row) ? row.length : 0))
  );

  const columns: TableCell[][] = Array.from({ length: rows }, (_, ri) => {
    const row = Array.isArray(rawColumns[ri]) ? (rawColumns[ri] as unknown[]) : [];
    return Array.from({ length: colCount }, (_, ci) =>
      Array.isArray(row[ci]) ? [...(row[ci] as TableCell)] : []
    );
  });

  const cellSpans: CellSpan[][] = Array.from({ length: rows }, (_, ri) => {
    const row = Array.isArray(rawSpans[ri]) ? (rawSpans[ri] as unknown[]) : [];
    return Array.from({ length: colCount }, (_, ci) => normalizeSpan(row[ci]));
  });

  const heights = Array.from({ length: rows }, (_, ri) => {
    const value = Number(rawHeights[ri]);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 40;
  });

  return { columns, widths: normalizeWidths(rawWidths, colCount), heights, cellSpans };
}

/** 重置行列数（保留已有单元格内容，重置合并与列宽），对齐 Vue config initTable 的输出形状 */
export function initGrid(rows: number, cols: number, previous?: TableGrid | null): TableGrid {
  const rowCount = Math.max(0, Math.floor(rows));
  const colCount = Math.max(0, Math.floor(cols));
  return {
    columns: Array.from({ length: rowCount }, (_, ri) =>
      Array.from({ length: colCount }, (_, ci) => {
        const cell = previous?.columns?.[ri]?.[ci];
        return Array.isArray(cell) ? [...cell] : [];
      })
    ),
    heights: Array.from({ length: rowCount }, (_, ri) => {
      const height = Number(previous?.heights?.[ri]);
      return Number.isFinite(height) && height > 0 ? Math.round(height) : 40;
    }),
    widths: equalWidths(colCount),
    cellSpans: blankSpans(rowCount, colCount),
  };
}

function cloneGrid(grid: TableGrid): TableGrid {
  return {
    columns: grid.columns.map((row) => row.map((cell) => [...cell])),
    cellSpans: grid.cellSpans.map((row) => row.map((span) => ({ ...span }))),
    heights: [...grid.heights],
    widths: [...grid.widths],
  };
}

export function insertRow(grid: TableGrid, ri: number, position: 'top' | 'bottom'): TableGrid {
  if (ri < 0 || ri >= grid.heights.length) return grid;
  const next = cloneGrid(grid);
  const index = position === 'top' ? ri : ri + 1;
  next.columns.splice(index, 0, next.columns[ri].map(() => []));
  next.cellSpans.splice(index, 0, next.cellSpans[ri].map((span) => ({ ...span })));
  next.heights.splice(index, 0, 40);
  return next;
}

/** 插入列（对齐 Vue：插入后列宽重置为平均分配） */
export function insertColumn(grid: TableGrid, ci: number, position: 'left' | 'right'): TableGrid {
  if (ci < 0 || ci >= grid.widths.length) return grid;
  const next = cloneGrid(grid);
  const index = position === 'left' ? ci : ci + 1;
  next.columns.forEach((row) => row.splice(index, 0, []));
  next.cellSpans.forEach((row) => row.splice(index, 0, { row: 1, col: 1 }));
  next.widths = equalWidths(next.widths.length + 1);
  return next;
}

function findMasterRow(cellSpans: CellSpan[][], ri: number, ci: number, direction: -1 | 1): number {
  for (let i = ri + direction; i >= 0 && i < cellSpans.length; i += direction) {
    if (isMasterCell(cellSpans[i]?.[ci])) return i;
  }
  return -1;
}

function findMasterCol(cellSpans: CellSpan[][], ri: number, ci: number, direction: -1 | 1): number {
  const row = cellSpans[ri] || [];
  for (let i = ci + direction; i >= 0 && i < row.length; i += direction) {
    if (isMasterCell(row[i])) return i;
  }
  return -1;
}

/** 合并单元格（向上/下/左/右），组件数据归并到目标主格 */
export function mergeCells(grid: TableGrid, ri: number, ci: number, direction: MergeDirection): TableGrid {
  const self = grid.cellSpans[ri]?.[ci];
  if (!isMasterCell(self)) return grid;
  const next = cloneGrid(grid);
  const target = next.cellSpans[ri][ci];
  if (direction === 'top') {
    const targetRow = findMasterRow(next.cellSpans, ri, ci, -1);
    if (targetRow < 0) return grid;
    next.cellSpans[targetRow][ci].row += target.row;
    target.row = 0;
    next.columns[targetRow][ci] = [...next.columns[targetRow][ci], ...next.columns[ri][ci]];
    next.columns[ri][ci] = [];
  } else if (direction === 'bottom') {
    const targetRow = findMasterRow(next.cellSpans, ri, ci, 1);
    if (targetRow < 0) return grid;
    target.row += next.cellSpans[targetRow][ci].row;
    next.cellSpans[targetRow][ci].row = 0;
    next.columns[ri][ci] = [...next.columns[ri][ci], ...next.columns[targetRow][ci]];
    next.columns[targetRow][ci] = [];
  } else if (direction === 'left') {
    const targetCol = findMasterCol(next.cellSpans, ri, ci, -1);
    if (targetCol < 0) return grid;
    next.cellSpans[ri][targetCol].col += target.col;
    target.col = 0;
    next.columns[ri][targetCol] = [...next.columns[ri][targetCol], ...next.columns[ri][ci]];
    next.columns[ri][ci] = [];
  } else {
    const targetCol = findMasterCol(next.cellSpans, ri, ci, 1);
    if (targetCol < 0) return grid;
    target.col += next.cellSpans[ri][targetCol].col;
    next.cellSpans[ri][targetCol].col = 0;
    next.columns[ri][ci] = [...next.columns[ri][ci], ...next.columns[ri][targetCol]];
    next.columns[ri][targetCol] = [];
  }
  return next;
}

function distribute<T>(items: T[], parts: number): T[][] {
  const perCell = Math.floor(items.length / parts);
  const remainder = items.length % parts;
  return Array.from({ length: parts }, (_, index) => {
    const start = index * perCell + Math.min(index, remainder);
    const end = start + perCell + (index < remainder ? 1 : 0);
    return items.slice(start, end);
  });
}

/** 取消行合并 / 列合并，子组件平均分配回各单元格 */
export function unmergeCell(grid: TableGrid, ri: number, ci: number, axis: 'row' | 'col'): TableGrid {
  const span = grid.cellSpans[ri]?.[ci];
  if (!span) return grid;
  const parts = axis === 'row' ? span.row : span.col;
  if (parts <= 1) return grid;
  const next = cloneGrid(grid);
  const groups = distribute(next.columns[ri][ci], parts);
  if (axis === 'row') {
    groups.forEach((items, index) => {
      next.cellSpans[ri + index][ci].row = 1;
      next.columns[ri + index][ci] = items;
    });
  } else {
    groups.forEach((items, index) => {
      next.cellSpans[ri][ci + index].col = 1;
      next.columns[ri][ci + index] = items;
    });
  }
  return next;
}

/** 删除当前行（先处理同行涉及的合并，再按选中单元格的行跨度删除），对齐 Vue del(true) */
export function deleteRow(grid: TableGrid, ri: number, ci: number): TableGrid {
  if (ri < 0 || ri >= grid.heights.length) return grid;
  const colCount = grid.widths.length;
  const selfRow = Math.max(1, grid.cellSpans[ri]?.[ci]?.row || 1);
  let next = grid;
  for (let c = 0; c < colCount; c++) {
    const cellRow = next.cellSpans[ri]?.[c]?.row ?? 1;
    if (cellRow > 1) {
      next = unmergeCell(next, ri, c, 'row');
    } else if (cellRow < 1) {
      for (let i = ri - 1; i >= 0; i--) {
        if ((next.cellSpans[i]?.[c]?.row ?? 0) > 1) {
          next = unmergeCell(next, i, c, 'row');
          break;
        }
      }
    }
  }
  const keep = <T,>(rows: T[][]) => rows.filter((_, index) => index < ri || index >= ri + selfRow);
  return {
    columns: keep(next.columns),
    cellSpans: keep(next.cellSpans),
    heights: next.heights.filter((_, index) => index < ri || index >= ri + selfRow),
    widths: [...next.widths],
  };
}

/** 删除当前列（先处理同列涉及的合并，再按选中单元格的列跨度删除），对齐 Vue del(false) */
export function deleteColumn(grid: TableGrid, ri: number, ci: number): TableGrid {
  if (ci < 0 || ci >= grid.widths.length) return grid;
  const rowCount = grid.heights.length;
  const selfCol = Math.max(1, grid.cellSpans[ri]?.[ci]?.col || 1);
  let next = grid;
  for (let r = 0; r < rowCount; r++) {
    const cellCol = next.cellSpans[r]?.[ci]?.col ?? 1;
    if (cellCol > 1) {
      next = unmergeCell(next, r, ci, 'col');
    } else if (cellCol < 1) {
      for (let i = ci - 1; i >= 0; i--) {
        if ((next.cellSpans[r]?.[i]?.col ?? 0) > 1) {
          next = unmergeCell(next, r, i, 'col');
          break;
        }
      }
    }
  }
  const keep = <T,>(row: T[]) => row.filter((_, index) => index < ci || index >= ci + selfCol);
  const widths = next.widths.filter((_, index) => index < ci || index >= ci + selfCol);
  return {
    columns: next.columns.map(keep),
    cellSpans: next.cellSpans.map(keep),
    heights: [...next.heights],
    widths: equalWidths(widths.length),
  };
}

/**
 * 拖动列宽：相邻两列总宽保持不变，最小 1%。
 * 对齐 Vue onColumnResize，`deltaPercent` 为拖动距离占表格宽度的百分比。
 */
export function resizeColumnPair(widths: number[], index: number, deltaPercent: number): number[] {
  const current = [...widths];
  if (index < 0 || index >= current.length - 1) return current;
  const delta = Number(deltaPercent);
  if (!Number.isFinite(delta) || delta === 0) return current;
  const sum = current[index] + current[index + 1];
  if (delta + current[index] < 1) {
    current[index] = 1;
    current[index + 1] = round2(sum - 1);
  } else if (delta + current[index + 1] > sum) {
    current[index] = round2(sum - 1);
    current[index + 1] = 1;
  } else if ((current[index] <= 1 && delta < 0) || (current[index + 1] <= 1 && delta > 0)) {
    return current;
  } else {
    current[index] = round2(current[index] + delta);
    current[index + 1] = round2(sum - current[index]);
  }
  return current;
}

/** 由鼠标拖动像素换算百分比后调整列宽 */
export function resizeColumnPairByPixels(
  widths: number[],
  index: number,
  deltaX: number,
  tableWidth: number
): number[] {
  if (!Number.isFinite(tableWidth) || tableWidth <= 0) return [...widths];
  return resizeColumnPair(widths, index, (deltaX / tableWidth) * 100);
}

/** 直接设置某一列宽度（1%~100%） */
export function setColumnWidth(grid: TableGrid, index: number, width: number): TableGrid {
  if (index < 0 || index >= grid.widths.length) return grid;
  const value = Number(width);
  if (!Number.isFinite(value)) return grid;
  const widths = [...grid.widths];
  widths[index] = round2(Math.min(100, Math.max(1, value)));
  return { ...grid, widths };
}

/** 列宽平均分配 */
export function equalizeWidths(grid: TableGrid): TableGrid {
  return { ...grid, widths: equalWidths(grid.widths.length) };
}

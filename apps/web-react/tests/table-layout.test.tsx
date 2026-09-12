import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TableLayout } from '../src/views/form/components/TableLayout';
import {
  deleteColumn,
  deleteRow,
  equalizeWidths,
  initGrid,
  insertColumn,
  insertRow,
  isMasterCell,
  mergeCells,
  resizeColumnPair,
  resizeColumnPairByPixels,
  setColumnWidth,
  toGrid,
  unmergeCell,
} from '../src/views/form/components/table-layout-utils';
import type { FormComponentProps } from '../src/views/form/types';
import type { FormItemConfig } from '../src/types/workflow';

const item = (id: string) => ({ id, key: id, name: id, props: {} }) as FormItemConfig;

describe('React Web: TableLayout grid helpers', () => {
  it('normalizes legacy props without widths/cellSpans (backward compatible)', () => {
    const grid = toGrid({ columns: [[[], []], [[], []]] });
    expect(grid.widths).toEqual([50, 50]);
    expect(grid.heights).toEqual([40, 40]);
    expect(grid.cellSpans).toEqual([
      [{ row: 1, col: 1 }, { row: 1, col: 1 }],
      [{ row: 1, col: 1 }, { row: 1, col: 1 }],
    ]);
  });

  it('keeps existing spans/widths and pads ragged data', () => {
    const grid = toGrid({
      columns: [[[]]],
      widths: [40],
      cellSpans: [[{ row: 1, col: 1 }, { row: 1, col: 0 }]],
    });
    expect(grid.widths).toEqual([40, 50]);
    expect(grid.cellSpans[0][1]).toEqual({ row: 1, col: 0 });
    expect(isMasterCell(grid.cellSpans[0][0])).toBe(true);
    expect(isMasterCell(grid.cellSpans[0][1])).toBe(false);
  });

  it('initGrid resets spans/widths but preserves existing cell content', () => {
    const previous = initGrid(2, 2);
    previous.columns[0][0] = [item('a')];
    previous.cellSpans[0][0] = { row: 2, col: 1 };
    previous.cellSpans[1][0] = { row: 0, col: 1 };
    const grid = initGrid(3, 3, previous);
    expect(grid.columns[0][0]).toEqual([item('a')]);
    expect(grid.widths).toEqual([33.33, 33.33, 33.33]);
    expect(grid.cellSpans[0][0]).toEqual({ row: 1, col: 1 });
    expect(grid.heights).toEqual([40, 40, 40]);
  });

  it('merges right and left, moving child components into the master cell', () => {
    let grid = initGrid(1, 3);
    grid.columns[0][0] = [item('a')];
    grid.columns[0][1] = [item('b')];
    grid = mergeCells(grid, 0, 0, 'right');
    expect(grid.cellSpans[0][0]).toEqual({ row: 1, col: 2 });
    expect(grid.cellSpans[0][1]).toEqual({ row: 1, col: 0 });
    expect(grid.columns[0][0]).toEqual([item('a'), item('b')]);
    expect(grid.columns[0][1]).toEqual([]);

    grid = mergeCells(grid, 0, 2, 'left');
    expect(grid.cellSpans[0][0]).toEqual({ row: 1, col: 3 });
    expect(grid.cellSpans[0][2]).toEqual({ row: 1, col: 0 });
    expect(grid.columns[0][0]).toEqual([item('a'), item('b')]);
  });

  it('merges top and bottom across rows', () => {
    let grid = initGrid(2, 1);
    grid.columns[0][0] = [item('a')];
    grid.columns[1][0] = [item('b')];
    grid = mergeCells(grid, 1, 0, 'top');
    expect(grid.cellSpans[0][0]).toEqual({ row: 2, col: 1 });
    expect(grid.cellSpans[1][0]).toEqual({ row: 0, col: 1 });
    expect(grid.columns[0][0]).toEqual([item('a'), item('b')]);
    expect(grid.columns[1][0]).toEqual([]);

    let down = initGrid(2, 1);
    down.columns[0][0] = [item('c')];
    down.columns[1][0] = [item('d')];
    down = mergeCells(down, 0, 0, 'bottom');
    expect(down.cellSpans[0][0]).toEqual({ row: 2, col: 1 });
    expect(down.cellSpans[1][0]).toEqual({ row: 0, col: 1 });
    expect(down.columns[0][0]).toEqual([item('c'), item('d')]);
  });

  it('ignores merges outside the grid', () => {
    const grid = initGrid(1, 1);
    expect(mergeCells(grid, 0, 0, 'top')).toBe(grid);
    expect(mergeCells(grid, 0, 0, 'left')).toBe(grid);
  });

  it('unmerges rows and distributes children evenly', () => {
    let grid = initGrid(3, 1);
    grid.columns[0][0] = [item('a'), item('b'), item('c')];
    grid.cellSpans[0][0] = { row: 3, col: 1 };
    grid.cellSpans[1][0] = { row: 0, col: 1 };
    grid.cellSpans[2][0] = { row: 0, col: 1 };
    grid = unmergeCell(grid, 0, 0, 'row');
    expect(grid.cellSpans.map((row) => row[0].row)).toEqual([1, 1, 1]);
    expect(grid.columns.map((row) => row[0])).toEqual([[item('a')], [item('b')], [item('c')]]);
  });

  it('unmerges columns and distributes children evenly with remainder', () => {
    let grid = initGrid(1, 2);
    grid.columns[0][0] = [item('a'), item('b'), item('c')];
    grid.cellSpans[0][0] = { row: 1, col: 2 };
    grid.cellSpans[0][1] = { row: 1, col: 0 };
    grid = unmergeCell(grid, 0, 0, 'col');
    expect(grid.cellSpans[0].map((span) => span.col)).toEqual([1, 1]);
    expect(grid.columns[0][0]).toEqual([item('a'), item('b')]);
    expect(grid.columns[0][1]).toEqual([item('c')]);
  });

  it('inserts rows above/below and inherits span structure', () => {
    let grid = initGrid(2, 2);
    grid.columns[0][0] = [item('a')];
    grid.cellSpans[0][0] = { row: 2, col: 1 };
    grid.cellSpans[1][0] = { row: 0, col: 1 };
    grid = insertRow(grid, 0, 'top');
    expect(grid.heights).toEqual([40, 40, 40]);
    expect(grid.columns).toHaveLength(3);
    expect(grid.columns[0][0]).toEqual([]);
    expect(grid.columns[1][0]).toEqual([item('a')]);
    expect(grid.cellSpans[0][0]).toEqual({ row: 2, col: 1 });

    const bottom = insertRow(initGrid(2, 2), 1, 'bottom');
    expect(bottom.heights).toHaveLength(3);
    expect(bottom.heights[2]).toBe(40);
  });

  it('inserts columns and resets widths to equal shares (Vue resizeWidth)', () => {
    let grid = toGrid({ columns: [[[], []]], widths: [30, 70] });
    grid = insertColumn(grid, 1, 'right');
    expect(grid.widths).toEqual([33.33, 33.33, 33.33]);
    expect(grid.columns[0]).toHaveLength(3);
    expect(grid.cellSpans[0].map((span) => span.col)).toEqual([1, 1, 1]);

    grid = insertColumn(grid, 0, 'left');
    expect(grid.widths).toEqual([25, 25, 25, 25]);
    expect(grid.columns[0]).toHaveLength(4);
  });

  it('deletes a row and shifts remaining content', () => {
    let grid = initGrid(2, 2);
    grid.columns[0][0] = [item('a')];
    grid.columns[1][0] = [item('b')];
    grid = deleteRow(grid, 0, 0);
    expect(grid.heights).toEqual([40]);
    expect(grid.columns).toHaveLength(1);
    expect(grid.columns[0][0]).toEqual([item('b')]);
  });

  it('deletes a merged row by removing the whole row span', () => {
    let grid = initGrid(2, 1);
    grid.columns[0][0] = [item('a'), item('b')];
    grid = mergeCells(grid, 0, 0, 'bottom');
    grid = deleteRow(grid, 0, 0);
    expect(grid.heights).toEqual([]);
    expect(grid.columns).toEqual([]);
  });

  it('deletes a column and re-equalizes widths', () => {
    let grid = toGrid({ columns: [[[], [], []]], widths: [20, 30, 50] });
    grid = deleteColumn(grid, 0, 1);
    expect(grid.columns[0]).toHaveLength(2);
    expect(grid.widths).toEqual([50, 50]);
  });

  it('resizes a column pair with a 1% minimum while keeping the pair sum', () => {
    expect(resizeColumnPair([50, 50], 0, 10)).toEqual([60, 40]);
    expect(resizeColumnPair([50, 50], 1, 10)).toEqual([50, 50]);
    expect(resizeColumnPair([50, 50], 0, 100)).toEqual([99, 1]);
    expect(resizeColumnPair([50, 50], 0, -100)).toEqual([1, 99]);
    expect(resizeColumnPair([1, 99], 0, -5)).toEqual([1, 99]);
    expect(resizeColumnPair([99, 1], 1, 5)).toEqual([99, 1]);
    expect(resizeColumnPairByPixels([50, 50], 0, 100, 400)).toEqual([75, 25]);
    expect(resizeColumnPairByPixels([50, 50], 0, 100, 0)).toEqual([50, 50]);
  });

  it('sets a single column width clamped to 1~100 and can equalize', () => {
    const grid = toGrid({ columns: [[[], []]], widths: [30, 70] });
    expect(setColumnWidth(grid, 0, 150).widths).toEqual([100, 70]);
    expect(setColumnWidth(grid, 0, 0).widths).toEqual([1, 70]);
    expect(setColumnWidth(grid, 5, 10)).toBe(grid);
    expect(equalizeWidths(grid).widths).toEqual([50, 50]);
  });

  it('renders merged cells with colSpan/rowSpan and skips covered cells', () => {
    const config: FormItemConfig = {
      id: 'table_1',
      key: 'table_1',
      name: '表格布局',
      type: 'TableLayout',
      props: {
        widths: [50, 50],
        heights: [40, 40],
        borderWidth: 1,
        borderColor: '#000000',
        cellSpans: [
          [{ row: 2, col: 1 }, { row: 1, col: 1 }],
          [{ row: 0, col: 1 }, { row: 1, col: 1 }],
        ],
        columns: [[[], []], [[], []]],
      },
    };
    const props: FormComponentProps = {
      config,
      mode: 'E',
      value: undefined,
      onChange: () => undefined,
      scope: { values: {}, setValues: () => undefined },
      renderField: () => null,
      dsVars: {},
    };
    const html = renderToStaticMarkup(<TableLayout {...props} />);
    expect(html).toContain('rowspan="2"');
    expect((html.match(/<td/g) || []).length).toBe(3);
    expect(html).toContain('width:50%');
  });
});

import React, { useState } from 'react';
import { Button, InputNumber, Select, Space, Typography } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { colorPicker, item } from './shared';
import type { TypeConfigProps } from './types';
import {
  deleteColumn,
  deleteRow,
  equalizeWidths,
  initGrid,
  insertColumn,
  insertRow,
  isMasterCell,
  mergeCells,
  round2,
  setColumnWidth,
  toGrid,
  unmergeCell,
} from '../../components/table-layout-utils';
import type { MergeDirection, TableGrid } from '../../components/table-layout-utils';

export const TableLayoutConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const grid = toGrid(props);
  const rowCount = grid.heights.length;
  const colCount = grid.widths.length;
  const [selected, setSelected] = useState({ ri: 0, ci: 0 });
  const [rowHeight, setRowHeight] = useState(30);

  const selectedRi = rowCount > 0 ? Math.min(selected.ri, rowCount - 1) : 0;
  const selectedCi = colCount > 0 ? Math.min(selected.ci, colCount - 1) : 0;
  const selectedSpan = grid.cellSpans[selectedRi]?.[selectedCi];
  const widthTotal = round2(grid.widths.reduce((total, width) => total + width, 0));

  const applyGrid = (next: TableGrid) => {
    onChangeProps({
      columns: next.columns,
      widths: next.widths,
      heights: next.heights,
      cellSpans: next.cellSpans,
    });
  };

  const run = (operation: (current: TableGrid) => TableGrid) => {
    const next = operation(grid);
    if (next !== grid) applyGrid(next);
  };

  const mergeTo = (direction: MergeDirection) => {
    if (direction === 'top') {
      for (let i = selectedRi - 1; i >= 0; i--) {
        if (isMasterCell(grid.cellSpans[i]?.[selectedCi])) {
          setSelected({ ri: i, ci: selectedCi });
          break;
        }
      }
    } else if (direction === 'left') {
      for (let j = selectedCi - 1; j >= 0; j--) {
        if (isMasterCell(grid.cellSpans[selectedRi]?.[j])) {
          setSelected({ ri: selectedRi, ci: j });
          break;
        }
      }
    }
    run((current) => mergeCells(current, selectedRi, selectedCi, direction));
  };

  const applyGridSize = (rows: number, cols: number) => {
    applyGrid(initGrid(rows, cols, grid));
    setSelected({ ri: 0, ci: 0 });
  };

  const resetHeights = () => {
    const height = Math.max(20, Number(rowHeight) || 30);
    applyGrid({ ...grid, heights: grid.heights.map(() => height) });
  };

  return (
    <>
      {item(
        t('form.designer.tableLayout.rowCount'),
        <Space>
          <Button
            icon={<MinusOutlined />}
            size="small"
            disabled={rowCount <= 1}
            onClick={() => applyGridSize(rowCount - 1, colCount)}
          />
          <Typography.Text>{t('form.designer.tableLayout.rows').replace('{n}', String(rowCount))}</Typography.Text>
          <Button icon={<PlusOutlined />} size="small" onClick={() => applyGridSize(rowCount + 1, colCount)} />
        </Space>
      )}
      {item(
        t('form.designer.tableLayout.colCount'),
        <Space>
          <Button
            icon={<MinusOutlined />}
            size="small"
            disabled={colCount <= 1}
            onClick={() => applyGridSize(rowCount, colCount - 1)}
          />
          <Typography.Text>{t('form.designer.tableLayout.cols').replace('{n}', String(colCount))}</Typography.Text>
          <Button icon={<PlusOutlined />} size="small" onClick={() => applyGridSize(rowCount, colCount + 1)} />
        </Space>
      )}
      {item(
        t('form.designer.tableLayout.cell'),
        <div className="fd-merge-grid">
          <table>
            <tbody>
              {grid.cellSpans.map((row, ri) => (
                <tr key={ri}>
                  {row.map((span, ci) => {
                    if (!isMasterCell(span)) return null;
                    const active = selectedRi === ri && selectedCi === ci;
                    return (
                      <td
                        key={ci}
                        colSpan={span.col}
                        rowSpan={span.row}
                        className={active ? 'is-active' : undefined}
                        onClick={() => setSelected({ ri, ci })}
                      >
                        {ri + 1},{ci + 1}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <Space size={4} wrap style={{ marginTop: 6 }}>
            <Button size="small" disabled={rowCount === 0} onClick={() => run((g) => insertRow(g, selectedRi, 'top'))}>
              {t('form.designer.tableLayout.insertRowTop')}
            </Button>
            <Button size="small" disabled={rowCount === 0} onClick={() => run((g) => insertRow(g, selectedRi, 'bottom'))}>
              {t('form.designer.tableLayout.insertRowBottom')}
            </Button>
            <Button size="small" disabled={colCount === 0} onClick={() => run((g) => insertColumn(g, selectedCi, 'left'))}>
              {t('form.designer.tableLayout.insertColLeft')}
            </Button>
            <Button size="small" disabled={colCount === 0} onClick={() => run((g) => insertColumn(g, selectedCi, 'right'))}>
              {t('form.designer.tableLayout.insertColRight')}
            </Button>
          </Space>
          <Space size={4} wrap style={{ marginTop: 4 }}>
            <Button size="small" disabled={selectedRi <= 0} onClick={() => mergeTo('top')}>
              {t('form.designer.tableLayout.mergeTop')}
            </Button>
            <Button size="small" disabled={selectedRi >= rowCount - 1} onClick={() => mergeTo('bottom')}>
              {t('form.designer.tableLayout.mergeBottom')}
            </Button>
            <Button size="small" disabled={selectedCi <= 0} onClick={() => mergeTo('left')}>
              {t('form.designer.tableLayout.mergeLeft')}
            </Button>
            <Button size="small" disabled={selectedCi >= colCount - 1} onClick={() => mergeTo('right')}>
              {t('form.designer.tableLayout.mergeRight')}
            </Button>
          </Space>
          <Space size={4} wrap style={{ marginTop: 4 }}>
            <Button
              size="small"
              disabled={!selectedSpan || selectedSpan.row <= 1}
              onClick={() => run((g) => unmergeCell(g, selectedRi, selectedCi, 'row'))}
            >
              {t('form.designer.tableLayout.unmergeRow')}
            </Button>
            <Button
              size="small"
              disabled={!selectedSpan || selectedSpan.col <= 1}
              onClick={() => run((g) => unmergeCell(g, selectedRi, selectedCi, 'col'))}
            >
              {t('form.designer.tableLayout.unmergeCol')}
            </Button>
            <Button
              size="small"
              danger
              disabled={rowCount <= 1}
              onClick={() => run((g) => deleteRow(g, selectedRi, selectedCi))}
            >
              {t('form.designer.tableLayout.deleteRow')}
            </Button>
            <Button
              size="small"
              danger
              disabled={colCount <= 1}
              onClick={() => run((g) => deleteColumn(g, selectedRi, selectedCi))}
            >
              {t('form.designer.tableLayout.deleteColumn')}
            </Button>
          </Space>
        </div>
      )}
      {item(
        t('form.designer.tableLayout.colWidth'),
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space size={4} wrap>
            {grid.widths.map((width, ci) => (
              <InputNumber
                key={ci}
                size="small"
                min={1}
                max={100}
                step={1}
                precision={2}
                style={{ width: 72 }}
                value={width}
                onChange={(value) => {
                  if (value === null || value === undefined) return;
                  run((g) => setColumnWidth(g, ci, value));
                }}
              />
            ))}
          </Space>
          <Space size={8}>
            <Button size="small" onClick={() => run(equalizeWidths)}>
              {t('form.designer.tableLayout.equalize')}
            </Button>
            <Typography.Text type={Math.abs(widthTotal - 100) > 0.01 ? 'warning' : 'secondary'} style={{ fontSize: 12 }}>
              {t('form.designer.tableLayout.total').replace('{value}', String(widthTotal))}
            </Typography.Text>
          </Space>
        </Space>
      )}
      {item(
        t('form.designer.tableLayout.resetRowHeight'),
        <Space.Compact style={{ width: '100%' }}>
          <InputNumber
            min={20}
            max={500}
            style={{ width: '100%' }}
            value={rowHeight}
            suffix="px"
            onChange={(value) => setRowHeight(Number(value) || 30)}
          />
          <Button onClick={resetHeights}>{t('form.common.reset')}</Button>
        </Space.Compact>
      )}
      {item(
        t('form.designer.tableLayout.borderWidth'),
        <InputNumber
          min={1}
          max={5}
          style={{ width: '100%' }}
          value={props.borderWidth ?? 1}
          suffix="px"
          onChange={(borderWidth) => onChangeProps({ borderWidth })}
        />
      )}
      {item(
        t('form.designer.tableLayout.borderColor'),
        colorPicker(props.borderColor, (borderColor) => onChangeProps({ borderColor }), t('form.designer.preset'))
      )}
      {item(
        t('form.designer.tableLayout.fonts'),
        <Select
          mode="tags"
          allowClear
          style={{ width: '100%' }}
          placeholder={t('form.designer.tableLayout.fontsPlaceholder')}
          value={props.fonts || []}
          options={[
            { label: t('form.designer.tableLayout.fontSong'), value: '宋体' },
            { label: t('form.designer.tableLayout.fontHei'), value: '黑体' },
            { label: t('form.designer.tableLayout.fontFangsong'), value: '华文仿宋' },
            { label: 'Arial', value: 'Arial' },
          ]}
          onChange={(fonts) => onChangeProps({ fonts })}
        />
      )}
    </>
  );
};

export default TableLayoutConfig;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Space, Table, Typography, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { FormItemConfig } from '@/types/workflow';
import { useTranslation } from '@/i18n';
import { useFormRuntime } from '../context';
import { deepCopy, isEmpty, isRequired } from '../runtime';
import type { FormComponent, RenderScope } from '../types';
import { formatFieldValue, useRowLinkage } from './row-linkage';

const EMPTY_ROWS: Record<string, any>[] = [];
const EMPTY_COLUMNS: FormItemConfig[] = [];

function rowKeyOf(row: Record<string, any>, rowIndex?: number): string {
  const id = row?.id ?? row?.key;
  return `${id === undefined || id === null ? 'row' : String(id)}-${rowIndex ?? 0}`;
}

function sumNumbers(values: number[]): number {
  const digits = values.reduce((max, value) => {
    const text = String(value);
    const dot = text.indexOf('.');
    return Math.max(max, dot === -1 ? 0 : text.length - dot - 1);
  }, 0);
  const factor = 10 ** digits;
  return values.reduce((total, value) => total + Math.round(value * factor), 0) / factor;
}

/** 明细表格（objArray）：行对象由 renderField(col, rowScope) 绑定 */
export const TableList: FormComponent = ({ config, mode, value, onChange, scope, renderField }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const runtime = useFormRuntime();
  const columns = Array.isArray(props.columns) ? (props.columns as FormItemConfig[]) : EMPTY_COLUMNS;
  const rows = useMemo(() => (Array.isArray(value) ? (value as Record<string, any>[]) : EMPTY_ROWS), [value]);
  const maxSize = Math.max(0, Number(props.maxSize) || 0);
  const showSort = props.showSort === true;
  const showBorder = props.showBorder !== false;
  const showSummary = props.showSummary === true;
  const atLimit = maxSize > 0 && rows.length >= maxSize;

  const visibleColumns = useMemo(
    () => columns.filter((col) => (runtime.permConf[col.key || col.id] || mode) !== 'H'),
    [columns, runtime.permConf, mode]
  );

  const summaryColumns = useMemo(() => {
    const raw = Array.isArray(props.summaryColumns)
      ? props.summaryColumns
      : Array.isArray(props.summaryCols)
        ? props.summaryCols
        : [];
    return raw.map((item: any) => String(item));
  }, [props.summaryColumns, props.summaryCols]);

  const handleRowsChange = useCallback((next: Record<string, any>[]) => onChange(next), [onChange]);

  const updateRow = useCallback(
    (rowIndex: number, patch: Record<string, any>) => {
      const current = Array.isArray(value) ? (value as Record<string, any>[]) : EMPTY_ROWS;
      onChange(current.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)));
    },
    [value, onChange]
  );

  const { requiredCells } = useRowLinkage({
    rules: props.rowLinkageRules,
    rows,
    values: scope.values,
    enabled: mode === 'E',
    onChange: handleRowsChange,
  });

  const buildRowScope = useCallback(
    (rowIndex: number): RenderScope => ({
      values: rows[rowIndex] || {},
      setValues: (patch) => updateRow(rowIndex, patch),
    }),
    [rows, updateRow]
  );

  // 行级必填校验：注册给 FormRender.validate()，并在单元格内联展示
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const validateCells = useCallback((): string | null => {
    if (mode !== 'E' && mode !== 'D') return null;
    const errors: Record<string, string> = {};
    columns.forEach((col) => {
      if (!isRequired(col.props?.required ?? col.required, mode)) return;
      const key = col.key || col.id;
      rows.forEach((row, rowIndex) => {
        if (isEmpty(row?.[key])) {
          errors[`${rowIndex}_${key}`] = t('form.validation.tableCellRequired')
            .replace('{row}', String(rowIndex + 1))
            .replace('{name}', String(col.name));
        }
      });
    });
    setCellErrors(errors);
    return Object.values(errors)[0] ?? null;
  }, [columns, rows, mode, t]);

  useEffect(() => runtime.registerValidator(config.key || config.id || '', validateCells), [runtime, config.key, config.id, validateCells]);

  const displayCellError = useCallback(
    (rowIndex: number, key: string) => {
      const message = cellErrors[`${rowIndex}_${key}`];
      if (!message) return null;
      return isEmpty(rows[rowIndex]?.[key]) ? message : null;
    },
    [cellErrors, rows]
  );

  const addRow = () => {
    if (atLimit) {
      message.warning(t('form.component.tableList.maxRowsWarning').replace('{n}', String(maxSize)));
      return;
    }
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      row[col.key || col.id] = undefined;
    });
    onChange([...rows, row]);
  };

  const copyRow = (rowIndex: number) => {
    if (atLimit) {
      message.warning(t('form.component.tableList.maxRowsWarning').replace('{n}', String(maxSize)));
      return;
    }
    onChange([...rows, deepCopy(rows[rowIndex])]);
  };

  const deleteRow = (rowIndex: number) => {
    onChange(rows.filter((_, index) => index !== rowIndex));
  };

  const moveRow = (rowIndex: number, offset: number) => {
    const target = rowIndex + offset;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[rowIndex], next[target]] = [next[target], next[rowIndex]];
    onChange(next);
  };

  const summaryKeys = summaryColumns.length > 0 ? summaryColumns : visibleColumns.map((col) => col.key || col.id);

  const summaryText = (key: string): string => {
    if (!summaryKeys.includes(key)) return '';
    const values = rows
      .map((row) => {
        const raw = row?.[key];
        if (raw === null || raw === undefined || raw === '') return NaN;
        return Number(raw);
      })
      .filter((num) => Number.isFinite(num));
    return values.length > 0 ? String(sumNumbers(values)) : '';
  };

  if (mode === 'R' || mode === 'V') {
    const readColumns: TableColumnsType<Record<string, any>> = [
      {
        title: t('form.component.tableList.index'),
        key: '__index',
        width: 60,
        align: 'center',
        render: (_value, _row, rowIndex) => rowIndex + 1,
      },
      ...visibleColumns.map((col) => {
        const key = col.key || col.id;
        return {
          title: col.name,
          key,
          ellipsis: true,
          render: (_value: any, row: Record<string, any>) => formatFieldValue(col, row?.[key]),
        };
      }),
    ];

    return (
      <Table<Record<string, any>>
        rowKey={rowKeyOf}
        columns={readColumns}
        dataSource={rows}
        pagination={false}
        size="small"
        bordered={showBorder}
        locale={{ emptyText: t('form.component.tableList.noData') }}
        summary={
          showSummary
            ? () => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>{t('form.component.tableList.total')}</Table.Summary.Cell>
                  {visibleColumns.map((col, index) => {
                    const key = col.key || col.id;
                    return (
                      <Table.Summary.Cell index={index + 1} key={`summary-read-${key}`}>
                        {summaryText(key)}
                      </Table.Summary.Cell>
                    );
                  })}
                </Table.Summary.Row>
              )
            : undefined
        }
      />
    );
  }

  const dataColumns: TableColumnsType<Record<string, any>> = visibleColumns.map((col) => {
    const key = col.key || col.id;
    const width = props.colWidths?.[key] ?? props.colWidths?.[col.id] ?? props.colWidths?.[col.name];
    return {
      title: (
        <span>
          {col.name}
          {(col.props?.required === true || col.required === true) && <span style={{ color: '#ff4d4f' }}> *</span>}
        </span>
      ),
      key,
      width,
      render: (_value: any, _row: Record<string, any>, rowIndex: number) => (
        <div style={requiredCells[rowIndex]?.[key] ? { borderBottom: '1px dashed #ff4d4f' } : undefined}>
          {renderField(col, buildRowScope(rowIndex))}
          {displayCellError(rowIndex, key) ? (
            <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 2 }}>{displayCellError(rowIndex, key)}</div>
          ) : null}
        </div>
      ),
    };
  });

  dataColumns.unshift({
    title: t('form.component.tableList.index'),
    key: '__index',
    width: 60,
    align: 'center',
    render: (_value, _row, rowIndex) => rowIndex + 1,
  });

  dataColumns.push({
    title: (
      <Space size={4}>
        <span>{t('form.component.tableList.actions')}</span>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          disabled={mode === 'D'}
          onClick={addRow}
          aria-label={t('form.component.tableList.addOne')}
        />
      </Space>
    ),
    key: '__ops',
    width: showSort ? 170 : 120,
    render: (_value, _row, rowIndex) => (
      <Space size={0}>
        {showSort && (
          <>
            <Button
              type="link"
              size="small"
              disabled={mode !== 'E' || rowIndex === 0}
              onClick={() => moveRow(rowIndex, -1)}
            >
              {t('form.component.tableList.moveUp')}
            </Button>
            <Button
              type="link"
              size="small"
              disabled={mode !== 'E' || rowIndex === rows.length - 1}
              onClick={() => moveRow(rowIndex, 1)}
            >
              {t('form.component.tableList.moveDown')}
            </Button>
          </>
        )}
        <Button type="link" size="small" disabled={mode !== 'E'} onClick={() => copyRow(rowIndex)}>
          {t('form.component.tableList.copy')}
        </Button>
        <Button type="link" size="small" danger disabled={mode !== 'E'} onClick={() => deleteRow(rowIndex)}>
          {t('form.component.tableList.delete')}
        </Button>
      </Space>
    ),
  });

  const buildSummary = () =>
    showSummary ? (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>{t('form.component.tableList.total')}</Table.Summary.Cell>
        {visibleColumns.map((col, index) => {
          const key = col.key || col.id;
          return (
            <Table.Summary.Cell index={index + 1} key={`summary-${key}`}>
              {summaryText(key)}
            </Table.Summary.Cell>
          );
        })}
        <Table.Summary.Cell index={visibleColumns.length + 1} />
      </Table.Summary.Row>
    ) : undefined;

  return (
    <div style={{ width: '100%' }}>
      <Table<Record<string, any>>
        rowKey={rowKeyOf}
        columns={dataColumns}
        dataSource={rows}
        pagination={false}
        size="small"
        bordered={showBorder}
        locale={{ emptyText: mode === 'D' ? t('form.component.tableList.configureColumns') : t('form.component.tableList.noData') }}
        summary={buildSummary}
      />
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} disabled={mode === 'D'} onClick={addRow}>
          {t('form.component.tableList.addOne')}
        </Button>
        {maxSize > 0 && (
          <Typography.Text type="secondary">
            {t('form.component.tableList.maxRows').replace('{n}', String(maxSize))}
            {atLimit ? t('form.component.tableList.atLimit') : ''}
          </Typography.Text>
        )}
        {props.required === true && rows.length === 0 && (
          <Typography.Text type="danger">{t('form.component.tableList.atLeastOne')}</Typography.Text>
        )}
      </div>
    </div>
  );
};

export default TableList;

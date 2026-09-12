import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Collapse, Space, Typography, message } from 'antd';
import type { CollapseProps } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FormItemConfig } from '@/types/workflow';
import { useTranslation } from '@/i18n';
import { useFormRuntime } from '../context';
import { deepCopy, isEmpty, isRequired } from '../runtime';
import type { FormComponent, RenderScope } from '../types';
import { formatFieldValue, useRowLinkage } from './row-linkage';

const EMPTY_ROWS: Record<string, any>[] = [];
const EMPTY_COLUMNS: FormItemConfig[] = [];

const COLLAPSE_SIZE: Record<string, 'small' | 'middle' | 'large'> = {
  small: 'small',
  middle: 'middle',
  default: 'middle',
  large: 'large',
};

/** 多项表单（objArray）：每行一张折叠卡片，子字段绑定行对象 */
export const FormList: FormComponent = ({ config, mode, value, onChange, scope, renderField }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const runtime = useFormRuntime();
  const columns = Array.isArray(props.columns) ? (props.columns as FormItemConfig[]) : EMPTY_COLUMNS;
  const rows = useMemo(() => (Array.isArray(value) ? (value as Record<string, any>[]) : EMPTY_ROWS), [value]);
  const maxSize = Math.max(0, Number(props.maxSize) || 0);
  const allowPut = props.allowPut !== false;
  const atLimit = maxSize > 0 && rows.length >= maxSize;

  const visibleColumns = useMemo(
    () => columns.filter((col) => (runtime.permConf[col.key || col.id] || mode) !== 'H'),
    [columns, runtime.permConf, mode]
  );

  const handleRowsChange = useCallback((next: Record<string, any>[]) => onChange(next), [onChange]);

  const updateRow = useCallback(
    (rowIndex: number, patch: Record<string, any>) => {
      const current = Array.isArray(value) ? (value as Record<string, any>[]) : EMPTY_ROWS;
      onChange(current.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)));
    },
    [value, onChange]
  );

  useRowLinkage({
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

  // 行级必填校验：注册给 FormRender.validate()，并在行内联展示
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const validateRows = useCallback((): string | null => {
    if (mode !== 'E' && mode !== 'D') return null;
    const errors: Record<string, string> = {};
    columns.forEach((col) => {
      if (!isRequired(col.props?.required ?? col.required, mode)) return;
      const key = col.key || col.id;
      rows.forEach((row, rowIndex) => {
        if (isEmpty(row?.[key])) {
          errors[`${rowIndex}_${key}`] = t('form.validation.formRowRequired')
            .replace('{row}', String(rowIndex + 1))
            .replace('{name}', String(col.name));
        }
      });
    });
    setRowErrors(errors);
    return Object.values(errors)[0] ?? null;
  }, [columns, rows, mode, t]);

  useEffect(() => runtime.registerValidator(config.key || config.id || '', validateRows), [runtime, config.key, config.id, validateRows]);

  const displayRowError = useCallback(
    (rowIndex: number, key: string) => {
      const message = rowErrors[`${rowIndex}_${key}`];
      if (!message) return null;
      return isEmpty(rows[rowIndex]?.[key]) ? message : null;
    },
    [rowErrors, rows]
  );

  const addRow = () => {
    if (atLimit) {
      message.warning(t('form.component.formList.maxItemsWarning').replace('{n}', String(maxSize)));
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
      message.warning(t('form.component.formList.maxItemsWarning').replace('{n}', String(maxSize)));
      return;
    }
    onChange([...rows, deepCopy(rows[rowIndex])]);
  };

  const deleteRow = (rowIndex: number) => {
    onChange(rows.filter((_, index) => index !== rowIndex));
  };

  if (mode === 'R' || mode === 'V') {
    return (
      <div style={{ width: '100%' }}>
        {rows.length === 0 ? (
          <Typography.Text type="secondary">{t('form.component.formList.noData')}</Typography.Text>
        ) : (
          rows.map((row, rowIndex) => (
            <div key={`form-list-read-${rowIndex}`} style={{ marginBottom: 12 }}>
              <Typography.Text strong>
                {t('form.component.formList.dataIndex').replace('{index}', String(rowIndex + 1))}
              </Typography.Text>
              <div style={{ marginTop: 4 }}>
                {visibleColumns.map((col) => {
                  const key = col.key || col.id;
                  return (
                    <div key={`${key}-${rowIndex}`} style={{ display: 'flex', gap: 8 }}>
                      <Typography.Text type="secondary">{col.name}：</Typography.Text>
                      <Typography.Text>{formatFieldValue(col, row?.[key])}</Typography.Text>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  const displayRows = mode === 'D' && rows.length === 0 ? [{}] : rows;

  const items: CollapseProps['items'] = displayRows.map((_row, rowIndex) => ({
    key: `form-list-${rowIndex}`,
    label: <span>{t('form.component.formList.dataIndex').replace('{index}', String(rowIndex + 1))}</span>,
    extra: (
      <Space size={0} onClick={(event) => event.stopPropagation()}>
        <Button
          type="link"
          size="small"
          icon={<CopyOutlined />}
          disabled={mode !== 'E'}
          onClick={() => copyRow(rowIndex)}
        >
          {t('form.component.formList.copy')}
        </Button>
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={mode !== 'E'}
          onClick={() => deleteRow(rowIndex)}
        >
          {t('form.component.formList.delete')}
        </Button>
      </Space>
    ),
    children: (
      <div style={{ width: '100%' }}>
        {visibleColumns.map((col, colIndex) => {
          const key = col.key || col.id;
          const error = displayRowError(rowIndex, key);
          return (
            <div key={`${key}-${colIndex}`}>
              {renderField(col, buildRowScope(rowIndex))}
              {error ? <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 2 }}>{error}</div> : null}
            </div>
          );
        })}
      </div>
    ),
  }));

  return (
    <div style={{ width: '100%' }}>
      <Collapse
        size={COLLAPSE_SIZE[String(props.size || 'default')] || 'middle'}
        defaultActiveKey={displayRows.map((_, index) => `form-list-${index}`)}
        items={items}
      />
      {allowPut && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="primary" size="small" icon={<PlusOutlined />} disabled={mode === 'D'} onClick={addRow}>
            {t('form.component.formList.addOne')}
          </Button>
          {maxSize > 0 && (
            <Typography.Text type="secondary">
              {t('form.component.formList.maxItems').replace('{n}', String(maxSize))}
              {atLimit ? t('form.component.formList.atLimit') : ''}
            </Typography.Text>
          )}
          {props.required === true && rows.length === 0 && (
            <Typography.Text type="danger">{t('form.component.formList.atLeastOne')}</Typography.Text>
          )}
        </div>
      )}
    </div>
  );
};

export default FormList;

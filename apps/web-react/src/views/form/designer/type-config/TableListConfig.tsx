import React from 'react';
import { InputNumber, Select, Switch } from 'antd';
import { useTranslation } from '@/i18n';
import { item } from './shared';
import type { TypeConfigProps } from './types';

export const TableListConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const columns: any[] = Array.isArray(props.columns) ? props.columns : [];
  const numberColumns = columns.filter((col) => col.valueType === 'number');
  return (
    <>
      {item(
        t('form.designer.tableList.maxSize'),
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          value={props.maxSize ?? 0}
          placeholder={t('form.designer.tableList.noLimitPlaceholder')}
          onChange={(maxSize) => onChangeProps({ maxSize })}
        />
      )}
      {item(
        t('form.designer.tableList.summaryColumns'),
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder={t('form.designer.tableList.summaryColumnsPlaceholder')}
          value={props.summaryColumns || props.summaryCols || []}
          options={numberColumns.map((col) => ({ label: col.name, value: col.key }))}
          onChange={(value) => onChangeProps({ summaryColumns: value, summaryCols: value })}
        />
      )}
      {item(
        t('form.designer.tableList.showSort'),
        <Switch checked={props.showSort === true} onChange={(showSort) => onChangeProps({ showSort })} />
      )}
      {item(
        t('form.designer.tableList.showBorder'),
        <Switch checked={props.showBorder !== false} onChange={(showBorder) => onChangeProps({ showBorder })} />
      )}
      {item(
        t('form.designer.tableList.showSummary'),
        <Switch checked={props.showSummary === true} onChange={(showSummary) => onChangeProps({ showSummary })} />
      )}
      {item(
        t('form.designer.tableList.hideLabel'),
        <Switch checked={props.hideLabel === true} onChange={(hideLabel) => onChangeProps({ hideLabel })} />
      )}
      {item(
        t('form.designer.tableList.required'),
        <Switch checked={props.required === true} onChange={(required) => onChangeProps({ required })} />
      )}
    </>
  );
};

export default TableListConfig;

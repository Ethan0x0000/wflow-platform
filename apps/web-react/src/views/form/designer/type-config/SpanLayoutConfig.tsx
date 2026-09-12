import React from 'react';
import { InputNumber, Select } from 'antd';
import { useTranslation } from '@/i18n';
import { item } from './shared';
import type { TypeConfigProps } from './types';

export const SpanLayoutConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const changeNumber = (number: number) => {
    const current: any[] = Array.isArray(props.columns) ? props.columns : [];
    const columns = Array.from({ length: number }, (_, i) => (Array.isArray(current[i]) ? current[i] : []));
    onChangeProps({ number, columns });
  };
  return (
    <>
      {item(
        t('form.designer.spanLayout.count'),
        <Select
          style={{ width: '100%' }}
          value={Number(props.number) || 2}
          options={[2, 3, 4, 6, 8].map((n) => ({
            label: t('form.designer.spanLayout.countOption').replace('{n}', String(n)),
            value: n,
          }))}
          onChange={changeNumber}
        />
      )}
      {item(
        t('form.designer.spanLayout.gutter'),
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          value={props.gutter}
          onChange={(gutter) => onChangeProps({ gutter })}
        />
      )}
    </>
  );
};

export default SpanLayoutConfig;

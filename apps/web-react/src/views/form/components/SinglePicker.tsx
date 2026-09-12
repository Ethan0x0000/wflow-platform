import React, { useEffect, useState } from 'react';
import { Radio, Select, Typography } from 'antd';
import { useTranslation } from '@/i18n';
import {
  findOptionByValue,
  isEmpty,
  loadOptions,
  optionText,
  optionValue,
  useDefaultValue,
} from '../runtime';
import type { FormComponent, FormOption } from '../types';

export const SinglePicker: FormComponent = ({ config, mode, value, onChange, scope, dsVars }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const [options, setOptions] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(false);

  useDefaultValue(config, mode, value, onChange);

  const optionType = props.optionType ?? (props.options ? 'static' : undefined);
  const httpKey = JSON.stringify(props.http ?? null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadOptions({ ...scope.values, ...dsVars }, props)
      .then((ops) => {
        if (alive) setOptions(ops);
      })
      .catch(() => {
        if (alive) setOptions([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionType, httpKey]);

  useEffect(() => {
    if (isEmpty(value) || options.length === 0) return;
    const matched = findOptionByValue(options, optionValue(value));
    if (!matched) return;
    if (typeof value !== 'object' || value === null || optionValue(value) !== optionValue(matched)) {
      onChange(matched);
    }
  }, [options, value, onChange]);

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        {optionText(value)}
      </span>
    );
  }

  if (props.expanding) {
    if (mode === 'D' && props.optionType === 'datasource') {
      return <Typography.Text type="secondary">{t('form.component.selectOptionsFromDs')}</Typography.Text>;
    }
    if (options.length === 0) {
      return <Typography.Text type="secondary">{t('form.component.noOptions')}</Typography.Text>;
    }
    return (
      <Radio.Group
        id={fieldId}
        aria-label={config.name}
        disabled={mode === 'R'}
        value={isEmpty(value) ? undefined : optionValue(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(findOptionByValue(options, v) ?? { label: optionText(v), value: v });
        }}
        options={options.map((op) => ({ label: op.label, value: optionValue(op) }))}
      />
    );
  }

  return (
    <Select
      id={fieldId}
      aria-label={config.name}
      style={{ width: '100%' }}
      placeholder={props.placeholder}
      disabled={mode === 'R'}
      allowClear
      loading={loading}
      value={isEmpty(value) ? undefined : optionValue(value)}
      onChange={(v) => {
        if (v === undefined || v === null) {
          onChange(null);
          return;
        }
        onChange(findOptionByValue(options, v) ?? { label: optionText(v), value: v });
      }}
      options={options}
    />
  );
};

export default SinglePicker;

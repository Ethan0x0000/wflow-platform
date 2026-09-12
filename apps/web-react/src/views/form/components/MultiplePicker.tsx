import React, { useEffect, useState } from 'react';
import { Checkbox, Select, Typography } from 'antd';
import { useTranslation } from '@/i18n';
import {
  findOptionByValue,
  isEmpty,
  loadOptions,
  optionText,
  optionValue,
  optionsText,
  useDefaultValue,
} from '../runtime';
import type { FormComponent, FormOption } from '../types';

export const MultiplePicker: FormComponent = ({ config, mode, value, onChange, scope, dsVars }) => {
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
    if (!Array.isArray(value) || value.length === 0 || options.length === 0) return;
    let changed = false;
    const next = value.map((item) => {
      const matched = findOptionByValue(options, optionValue(item));
      if (!matched) return item;
      if (typeof item !== 'object' || item === null || optionValue(item) !== optionValue(matched)) {
        changed = true;
        return matched;
      }
      return item;
    });
    if (changed) onChange(next);
  }, [options, value, onChange]);

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        {optionsText(value)}
      </span>
    );
  }

  const mapValues = (vals: any[]): FormOption[] =>
    (vals || []).map((v) => findOptionByValue(options, v) ?? { label: optionText(v), value: v });

  if (props.expanding) {
    if (mode === 'D' && props.optionType === 'datasource') {
      return <Typography.Text type="secondary">{t('form.component.selectOptionsFromDs')}</Typography.Text>;
    }
    if (mode === 'E' && options.length === 0) {
      return <Typography.Text type="warning">{t('form.component.noOptions')}</Typography.Text>;
    }
    return (
      <Checkbox.Group
        aria-label={config.name}
        disabled={mode === 'R'}
        value={Array.isArray(value) ? value.map(optionValue) : []}
        onChange={(vals) => onChange(mapValues(vals as any[]))}
        options={options.map((op) => ({ label: op.label, value: optionValue(op) }))}
      />
    );
  }

  return (
    <Select
      id={fieldId}
      aria-label={config.name}
      mode="multiple"
      style={{ width: '100%' }}
      placeholder={props.placeholder}
      disabled={mode === 'R'}
      allowClear
      loading={loading}
      value={Array.isArray(value) ? value.map(optionValue) : []}
      onChange={(vals) => onChange(mapValues(vals as any[]))}
      options={options}
    />
  );
};

export default MultiplePicker;

import React from 'react';
import { Input, Select } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { useInitObject } from '../runtime';
import type { FormComponent } from '../types';

const PREFIX_OPTIONS = [
  { label: '+86', value: '86' },
  { label: '+62', value: '62' },
];

export const PhoneNumber: FormComponent = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const current = value && typeof value === 'object' ? value : {};
  const prefix = current.prefix || '86';
  const number = current.number ?? null;

  useInitObject(config, mode, value, onChange, { prefix: '86', number: null });

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        +{prefix} {number ?? ''}
      </span>
    );
  }

  return (
    <Input
      id={fieldId}
      aria-label={config.name}
      placeholder={props.placeholder}
      disabled={mode === 'R' || props.disable === true}
      allowClear
      prefix={<MobileOutlined />}
      value={number ?? ''}
      onChange={(e) => onChange({ ...current, prefix, number: e.target.value })}
      addonBefore={
        <Select
          aria-label={t('form.component.phone.countryCode')}
          style={{ width: 100 }}
          value={prefix}
          disabled={mode === 'R' || props.disable === true}
          options={PREFIX_OPTIONS}
          onChange={(v) => onChange({ ...current, prefix: v, number })}
        />
      }
    />
  );
};

export default PhoneNumber;

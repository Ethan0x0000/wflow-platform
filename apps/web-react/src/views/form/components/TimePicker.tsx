import React from 'react';
import { TimePicker as AntTimePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { isEmpty, useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

dayjs.extend(customParseFormat);

const toDay = (v: unknown): Dayjs | null => (v ? dayjs(String(v), 'HH:mm:ss') : null);

export const TimePicker: FormComponent = ({ config, mode, value, onChange }) => {
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const format = String(props.format || 'HH:mm:ss');

  const hasDefault = !isEmpty(props.defaultValue);
  const defaultConfig = hasDefault
    ? { ...config, props: { ...props, defaultValue: undefined } }
    : config;
  useDefaultValue(defaultConfig, mode, value, onChange, () =>
    hasDefault ? dayjs().format('HH:mm:ss') : undefined
  );

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        {value ?? ''}
      </span>
    );
  }

  return (
    <AntTimePicker
      id={fieldId}
      aria-label={config.name}
      style={{ width: '100%' }}
      format={format}
      placeholder={props.placeholder}
      disabled={mode === 'R'}
      allowClear
      value={toDay(value)}
      onChange={(t: Dayjs | null) => onChange(t ? t.format('HH:mm:ss') : null)}
    />
  );
};

export default TimePicker;


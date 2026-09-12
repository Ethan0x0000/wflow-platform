import React from 'react';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { isEmpty, useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

dayjs.extend(customParseFormat);

export const DateTimePicker: FormComponent = ({ config, mode, value, onChange }) => {
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const format = String(props.format || 'YYYY-MM-DD HH:mm');
  const picker = format === 'YYYY' ? 'year' : format === 'YYYY-MM' ? 'month' : 'date';
  const showTime = format.includes('HH');
  const timeFormat = format.replace('YYYY-MM-DD ', '');

  const hasDefault = !isEmpty(props.defaultValue);
  const defaultConfig = hasDefault
    ? { ...config, props: { ...props, defaultValue: undefined } }
    : config;
  useDefaultValue(defaultConfig, mode, value, onChange, () =>
    hasDefault ? dayjs().format(format) : undefined
  );

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        {value ?? ''}
      </span>
    );
  }

  return (
    <DatePicker
      id={fieldId}
      aria-label={config.name}
      style={{ width: '100%' }}
      picker={picker}
      showTime={showTime ? { format: timeFormat } : false}
      format={format}
      placeholder={props.placeholder}
      disabled={mode === 'R'}
      allowClear
      value={value ? dayjs(String(value), format) : null}
      onChange={(d: Dayjs | null) => onChange(d ? d.format(format) : null)}
    />
  );
};

export default DateTimePicker;

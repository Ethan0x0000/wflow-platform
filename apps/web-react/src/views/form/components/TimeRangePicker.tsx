import React from 'react';
import { TimePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useTranslation } from '@/i18n';
import { useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

dayjs.extend(customParseFormat);

const toDay = (v: unknown): Dayjs | null => (v ? dayjs(String(v), 'HH:mm:ss') : null);

export const TimeRangePicker: FormComponent = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const placeholder = Array.isArray(props.placeholder) ? props.placeholder : [];

  useDefaultValue(config, mode, value, onChange);

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        {Array.isArray(value) ? value.join(' ~ ') : ''}
      </span>
    );
  }

  const range: [Dayjs, Dayjs] | null =
    Array.isArray(value) && value[0] && value[1]
      ? [toDay(value[0]) as Dayjs, toDay(value[1]) as Dayjs]
      : null;

  return (
    <TimePicker.RangePicker
      id={fieldId}
      aria-label={config.name}
      style={{ width: '100%' }}
      format="HH:mm:ss"
      placeholder={[placeholder[0] || t('form.common.startTime'), placeholder[1] || t('form.common.endTime')]}
      disabled={mode === 'R'}
      allowClear
      value={range}
      onChange={(times) =>
        onChange(
          times && times[0] && times[1]
            ? [times[0].format('HH:mm:ss'), times[1].format('HH:mm:ss')]
            : null
        )
      }
    />
  );
};

export default TimeRangePicker;

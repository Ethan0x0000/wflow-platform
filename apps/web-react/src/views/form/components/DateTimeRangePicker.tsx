import React from 'react';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useTranslation } from '@/i18n';
import { useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

dayjs.extend(customParseFormat);

export const DateTimeRangePicker: FormComponent = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const format = String(props.format || 'YYYY-MM-DD HH:mm');
  const showTime = format.includes('HH');
  const timeFormat = format.replace('YYYY-MM-DD ', '');
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
      ? [dayjs(String(value[0]), format), dayjs(String(value[1]), format)]
      : null;

  return (
    <DatePicker.RangePicker
      id={fieldId}
      aria-label={config.name}
      style={{ width: '100%' }}
      showTime={showTime ? { format: timeFormat } : false}
      format={format}
      placeholder={[placeholder[0] || t('form.common.startTime'), placeholder[1] || t('form.common.endTime')]}
      disabled={mode === 'R'}
      allowClear
      value={range}
      onChange={(dates) =>
        onChange(
          dates && dates[0] && dates[1]
            ? [dates[0].format(format), dates[1].format(format)]
            : null
        )
      }
    />
  );
};

export default DateTimeRangePicker;

import React from 'react';
import { ColorPicker, Form } from 'antd';

export const item = (label: string, children: React.ReactNode, key?: string) => (
  <Form.Item key={key || label} label={label} style={{ marginBottom: 10 }}>
    {children}
  </Form.Item>
);

export const regOptions = [
  { labelKey: 'form.designer.regOptions.phone', value: '^1[3-9]\\d{9}$' },
  { labelKey: 'form.designer.regOptions.idCard', value: '^(\\d{17}(\\d|x|X)|\\d{15})$' },
  { labelKey: 'form.designer.regOptions.url', value: "^https?:\\/\\/(([a-zA-Z0-9_-])+(\\.)?)*(:\\d+)?(\\/((\\.)?(\\?)?=?&?[a-zA-Z0-9_-](\\?)?)*)*$" },
  { labelKey: 'form.designer.regOptions.email', value: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
  { labelKey: 'form.designer.regOptions.zip', value: '^[1-9]\\d{5}(?!\\d)$' },
  { labelKey: 'form.designer.regOptions.ip', value: '^(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}$' },
  { labelKey: 'form.designer.regOptions.digits', value: '^\\d+$' },
  { labelKey: 'form.designer.regOptions.letters', value: '^[a-zA-Z]+$' },
  { labelKey: 'form.designer.regOptions.alphanumeric', value: '^[a-zA-Z0-9]+$' },
  { labelKey: 'form.designer.regOptions.chinese', value: '^[\\u4e00-\\u9fa5]+$' },
];

export const dateFormats = [
  { labelKey: 'form.designer.dateFormats.year', value: 'YYYY' },
  { labelKey: 'form.designer.dateFormats.yearMonth', value: 'YYYY-MM' },
  { labelKey: 'form.designer.dateFormats.yearMonthDay', value: 'YYYY-MM-DD' },
  { labelKey: 'form.designer.dateFormats.yearMonthDayHour', value: 'YYYY-MM-DD HH' },
  { labelKey: 'form.designer.dateFormats.yearMonthDayHourMin', value: 'YYYY-MM-DD HH:mm' },
  { labelKey: 'form.designer.dateFormats.yearMonthDayHourMinSec', value: 'YYYY-MM-DD HH:mm:ss' },
];

export const rangeDateFormats = [
  { labelKey: 'form.designer.dateFormats.yearMonthDay', value: 'YYYY-MM-DD' },
  { labelKey: 'form.designer.dateFormats.yearMonthDayHourMin', value: 'YYYY-MM-DD HH:mm' },
  { labelKey: 'form.designer.dateFormats.yearMonthDayHourMinSec', value: 'YYYY-MM-DD HH:mm:ss' },
];

export const colorPicker = (value: any, onChange: (color: string) => void, presetLabel: string) => (
  <ColorPicker
    value={value || '#000000'}
    presets={[{ label: presetLabel, colors: ['#1989FA', '#35B881', '#F78F5F', '#E04765', '#909399', '#F0A732', '#000000'] }]}
    onChange={(color: any) => onChange(typeof color === 'string' ? color : color.toHexString())}
  />
);

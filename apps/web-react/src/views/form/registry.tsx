import React from 'react';
import { Input } from 'antd';
import { useTranslation } from '@/i18n';
import type { FormComponent, FormComponentProps } from './types';
import { SpanLayout } from './components/SpanLayout';
import { TableLayout } from './components/TableLayout';
import { TextInput } from './components/TextInput';
import { TextareaInput } from './components/TextareaInput';
import { NumberInput } from './components/NumberInput';
import { Score } from './components/Score';
import { SinglePicker } from './components/SinglePicker';
import { MultiplePicker } from './components/MultiplePicker';
import { DateTimePicker } from './components/DateTimePicker';
import { DateTimeRangePicker } from './components/DateTimeRangePicker';
import { TimePicker } from './components/TimePicker';
import { TimeRangePicker } from './components/TimeRangePicker';
import { UserPicker } from './components/UserPicker';
import { DeptPicker } from './components/DeptPicker';
import { ImageUpload } from './components/ImageUpload';
import { FileUpload } from './components/FileUpload';
import { PhoneNumber } from './components/PhoneNumber';
import { IdCard } from './components/IdCard';
import { Html } from './components/Html';
import { LabelText } from './components/LabelText';
import { AlertBlock } from './components/AlertBlock';
import { Text } from './components/Text';
import { TableList } from './components/TableList';
import { FormList } from './components/FormList';
import { RichText } from './components/RichText';
import { InstQuote } from './components/InstQuote';
import { CalcFormula } from './components/CalcFormula';
import { Signature } from './components/Signature';
import { Location } from './components/Location';
import { Provinces } from './components/Provinces';
import { WebIframe } from './components/WebIframe';
import { VueSfc } from './components/VueSfc';

/** 未注册类型的兜底（数据仍可透传，避免整表单崩溃） */
const UnsupportedField: FormComponent = ({ config, value, onChange, mode }: FormComponentProps) => {
  const { t } = useTranslation();
  return (
    <Input
      id={config.key || config.id}
      aria-label={config.name}
      placeholder={t('form.runtime.unsupportedType').replace('{type}', String(config.type || t('form.runtime.unknown')))}
      disabled={mode === 'R'}
      value={typeof value === 'string' ? value : value === undefined || value === null ? '' : JSON.stringify(value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export const formComponentRegistry: Record<string, FormComponent> = {
  SpanLayout,
  TableLayout,
  TextInput,
  TextareaInput,
  NumberInput,
  Score,
  SinglePicker,
  MultiplePicker,
  DateTimePicker,
  DateTimeRangePicker,
  TimePicker,
  TimeRangePicker,
  UserPicker,
  DeptPicker,
  ImageUpload,
  FileUpload,
  PhoneNumber,
  IdCard,
  Html,
  LabelText,
  AlertBlock,
  Text,
  TableList,
  FormList,
  RichText,
  InstQuote,
  CalcFormula,
  Signature,
  Location,
  Provinces,
  WebIframe,
  VueSfc,
  // 兼容旧数据中的别名
  DateTime: DateTimePicker,
  DateTimeRange: DateTimeRangePicker,
  CustomComponent: VueSfc,
  Leave: VueSfc,
};

export function getFormComponent(type?: string): FormComponent {
  if (type && formComponentRegistry[type]) return formComponentRegistry[type];
  return UnsupportedField;
}

export {
  registerFormComponent,
  unregisterFormComponent,
  getHostFormComponent,
  resolveHostFormComponent,
  hostComponentCodes,
} from './hostRegistry';
export type { HostFormComponent, HostComponentConfigLike } from './hostRegistry';

import React from 'react';
import { Input, InputNumber, Select, Switch } from 'antd';
import { normalizeValueType } from '@/utils/ConditionCompare';

export const normalizeStaticOptions = (raw: any): Array<{ label: string; value: any }> => {
  if (!Array.isArray(raw)) return [];
  return raw.map((opt: any) => {
    if (opt !== null && typeof opt === 'object') {
      return {
        label: String(opt.label ?? opt.name ?? opt.value ?? ''),
        value: opt.value ?? opt.name ?? opt.label,
      };
    }
    return { label: String(opt), value: opt };
  });
};

export interface DefaultValueInputProps {
  valueType?: string;
  value: any;
  onChange: (value: any) => void;
  staticOptions?: any[];
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
}

/** 通用默认值编辑器：按 valueType 渲染合适的输入控件 */
export const DefaultValueInput: React.FC<DefaultValueInputProps> = ({
  valueType,
  value,
  onChange,
  staticOptions,
  placeholder,
  disabled,
  multiline,
}) => {
  const type = normalizeValueType(valueType);
  const options = normalizeStaticOptions(staticOptions);

  switch (type) {
    case 'number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(next) => onChange(next)}
        />
      );
    case 'bool':
      return <Switch checked={value === true} disabled={disabled} onChange={(checked) => onChange(checked)} />;
    case 'option':
      return (
        <Select
          allowClear
          style={{ width: '100%' }}
          value={value ?? undefined}
          disabled={disabled}
          placeholder={placeholder}
          options={options}
          onChange={(next) => onChange(next)}
        />
      );
    case 'options':
    case 'array':
    case 'orgArray':
    case 'imageArray':
    case 'fileArray':
      return (
        <Select
          mode={options.length > 0 ? 'multiple' : 'tags'}
          allowClear
          style={{ width: '100%' }}
          value={value ?? []}
          disabled={disabled}
          placeholder={placeholder}
          options={options}
          onChange={(next) => onChange(next)}
        />
      );
    default:
      if (multiline) {
        return (
          <Input.TextArea
            rows={2}
            value={value ?? ''}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }
      return (
        <Input
          value={value ?? ''}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
};

export default DefaultValueInput;

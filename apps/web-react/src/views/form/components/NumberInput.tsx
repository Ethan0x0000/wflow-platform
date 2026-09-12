import React from 'react';
import { InputNumber } from 'antd';
import { isEmpty, useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

export const NumberInput: FormComponent = ({ config, mode, value, onChange }) => {
  const props = config.props || {};
  const fieldId = config.key || config.id;

  useDefaultValue(config, mode, value, onChange);

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        {value ?? ''}
      </span>
    );
  }

  return (
    <InputNumber
      id={fieldId}
      aria-label={config.name}
      style={{ width: '100%' }}
      max={isEmpty(props.max) ? undefined : props.max}
      min={props.min}
      precision={props.precision}
      placeholder={props.placeholder}
      disabled={mode === 'R' || props.disable === true}
      value={typeof value === 'number' ? value : null}
      onChange={(v) => onChange(v)}
    />
  );
};

export default NumberInput;

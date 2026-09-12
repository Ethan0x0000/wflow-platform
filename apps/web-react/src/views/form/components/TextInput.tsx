import React from 'react';
import { Input } from 'antd';
import { useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

export const TextInput: FormComponent = ({ config, mode, value, onChange }) => {
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
    <Input
      id={fieldId}
      aria-label={config.name}
      placeholder={props.placeholder}
      disabled={mode === 'R' || props.disable === true}
      allowClear={Boolean(props.enableClear)}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default TextInput;

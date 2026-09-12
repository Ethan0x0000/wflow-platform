import React from 'react';
import { Input } from 'antd';
import { useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

export const TextareaInput: FormComponent = ({ config, mode, value, onChange }) => {
  const props = config.props || {};
  const fieldId = config.key || config.id;

  useDefaultValue(config, mode, value, onChange);

  if (mode === 'V') {
    return (
      <div id={fieldId} aria-label={config.name} style={{ lineHeight: 1.5, whiteSpace: 'pre-line' }}>
        {value ?? ''}
      </div>
    );
  }

  return (
    <Input.TextArea
      id={fieldId}
      aria-label={config.name}
      rows={3}
      showCount
      maxLength={props.max || 255}
      placeholder={props.placeholder}
      disabled={mode === 'R' || props.disable === true}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default TextareaInput;

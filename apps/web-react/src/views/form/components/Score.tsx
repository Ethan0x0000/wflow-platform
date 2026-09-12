import React from 'react';
import { ConfigProvider, Rate } from 'antd';
import { useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';

export const Score: FormComponent = ({ config, mode, value, onChange }) => {
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

  const rate = (
    <Rate
      id={fieldId}
      aria-label={config.name}
      disabled={mode === 'R' || props.disable === true}
      count={props.max || 5}
      allowHalf={props.enableHalf === true}
      allowClear={props.allowClear !== false}
      value={typeof value === 'number' ? value : 0}
      onChange={(v) => onChange(v)}
    />
  );

  if (props.color) {
    return (
      <ConfigProvider theme={{ components: { Rate: { starColor: String(props.color) } } }}>
        {rate}
      </ConfigProvider>
    );
  }

  return rate;
};

export default Score;

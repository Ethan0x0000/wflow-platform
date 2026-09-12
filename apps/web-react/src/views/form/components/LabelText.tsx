import React from 'react';
import { Typography } from 'antd';
import type { FormComponent } from '../types';

export const LabelText: FormComponent = ({ config }) => {
  const props = config.props || {};
  const color = props.color || '#1989FA';

  return (
    <div
      id={config.key || config.id}
      aria-label={config.name}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        background: props.showBgc ? `${color}20` : undefined,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 5,
          height: 30,
          borderRadius: 2,
          marginRight: 5,
          background: color,
        }}
      />
      <Typography.Text>{props.placeholder}</Typography.Text>
    </div>
  );
};

export default LabelText;

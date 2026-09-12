import React from 'react';
import { Alert } from 'antd';
import type { FormComponent } from '../types';

const TYPE_MAP: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  primary: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

export const AlertBlock: FormComponent = ({ config }) => {
  const props = config.props || {};
  const showIcon = props.showIcon !== undefined ? Boolean(props.showIcon) : !props.hideIcon;

  return (
    <Alert
      id={config.key || config.id}
      message={props.content}
      type={TYPE_MAP[props.type] || 'info'}
      closable={props.closable === true}
      showIcon={showIcon}
    />
  );
};

export default AlertBlock;

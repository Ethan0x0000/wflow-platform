import React from 'react';
import { Tooltip } from 'antd';
import type { IconBtnProps } from './types';

export const IconBtn: React.FC<IconBtnProps> = ({ title, active, disabled, onClick, children }) => (
  <Tooltip title={title}>
    <button
      type="button"
      className={`w-print-icon-btn${active ? ' active' : ''}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  </Tooltip>
);

export default IconBtn;

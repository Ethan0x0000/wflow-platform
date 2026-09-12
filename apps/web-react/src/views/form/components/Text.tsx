import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from '@/i18n';
import type { FormComponent } from '../types';

const COLOR_MAP: Record<string, string> = {
  text: 'rgba(0, 0, 0, 0.88)',
  info: '#8c8c8c',
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
};

export const Text: FormComponent = ({ config, mode }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const content = String(props.content ?? '');

  if (mode === 'D' && content.trim() === '') {
    return <Typography.Text type="warning">{t('form.component.text.emptyInDesign')}</Typography.Text>;
  }

  const fonts = Array.isArray(props.fonts) ? props.fonts.join(',') : String(props.fonts ?? '');
  const tag = String(props.tag || 'div');

  return React.createElement(
    tag,
    {
      id: config.key || config.id,
      'aria-label': config.name,
      style: {
        display: 'block',
        textAlign: props.align || 'left',
        color: COLOR_MAP[props.type] || COLOR_MAP.text,
        fontFamily: fonts || undefined,
      },
    },
    <>
      {props.showX ? <span style={{ color: '#ff4d4f' }}>*</span> : null}
      {content}
    </>
  );
};

export default Text;

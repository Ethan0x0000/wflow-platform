import type { FC } from 'react';
import { useMemo } from 'react';
import { Typography } from 'antd';
import { useTranslation } from '@/i18n';
import { resolveByTemplate } from '../runtime';
import type { FormComponentProps } from '../types';

export const WebIframe: FC<FormComponentProps> = ({ config, scope, dsVars }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const rawUrl = typeof props.url === 'string' ? props.url : '';
  const height = props.height || 200;
  const url = useMemo(
    () => resolveByTemplate(rawUrl, { ...scope.values, ...dsVars }),
    [rawUrl, scope.values, dsVars]
  );

  if (!rawUrl) {
    return <Typography.Text type="warning">{t('form.component.webIframe.noUrl')}</Typography.Text>;
  }

  return (
    <iframe
      title={config.name || t('form.component.webIframe.iframeTitle')}
      src={url}
      scrolling="auto"
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : String(height),
        border: 'none',
      }}
    />
  );
};

export default WebIframe;

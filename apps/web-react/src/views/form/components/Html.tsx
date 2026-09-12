import React from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from '@/i18n';
import type { FormComponent } from '../types';

const EMPTY_TIP_STYLE = 'font-size: small; color: #9b9595';

export const Html: FormComponent = ({ config }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const raw = String(props.code ?? '');
  const code =
    raw.trim() === ''
      ? `<div style="${EMPTY_TIP_STYLE}">${t('form.component.html.empty')}</div>`
      : DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });

  if (props.render === 'iframe') {
    return (
      <div style={{ width: '100%' }}>
        <div
          id={config.key || config.id}
          style={{ width: '100%', height: `${Number(props.height) || 200}px` }}
        >
          <iframe
            title={config.name}
            srcDoc={code}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      id={config.key || config.id}
      aria-label={config.name}
      style={{ width: '100%' }}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
};

export default Html;

import React, { useRef } from 'react';
import { Button, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { WSignature } from '@/components/WSignature';
import { useTranslation } from '@/i18n';
import type { FormComponent } from '../types';

export const Signature: FormComponent = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const hiddenRef = useRef<HTMLDivElement>(null);

  if (mode === 'V') {
    return value ? <WSignature value={value} readOnly /> : null;
  }

  if (value) {
    return <WSignature value={value} onChange={onChange} disabled={mode === 'R'} />;
  }

  const openPad = () => {
    hiddenRef.current?.querySelector('button')?.click();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button
        id={fieldId}
        aria-label={config.name}
        icon={<EditOutlined />}
        disabled={mode === 'R'}
        onClick={openPad}
      >
        {props.btnText || t('form.component.signature.defaultBtn')}
      </Button>
      <Typography.Text type="secondary">{props.placeholder || ''}</Typography.Text>
      <div ref={hiddenRef} style={{ display: 'none' }}>
        <WSignature onChange={onChange} disabled={mode === 'R'} />
      </div>
    </div>
  );
};

export default Signature;

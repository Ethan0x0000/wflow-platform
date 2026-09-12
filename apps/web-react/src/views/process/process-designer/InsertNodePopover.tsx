import React from 'react';
import { Button, Popover, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { getInsertableNodeTypes } from '../ProcessNodes';
import { renderNodeIcon } from './nodeIcon';

export interface InsertNodePopoverProps {
  path: number[];
  index: number;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  onInsert: (path: number[], index: number, typeKey: string) => void;
  onPaste: (path: number[], index: number) => void;
}

export const InsertNodePopover: React.FC<InsertNodePopoverProps> = ({ path, index, openKey, setOpenKey, onInsert, onPaste }) => {
  const { t } = useTranslation();
  const key = `${path.join('_')}#${index}`;
  const content = (
    <div style={{ width: 420 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong>{t('process.designer.selectNode')}</Typography.Text>
        <Typography.Link onClick={() => onPaste(path, index)}>{t('process.designer.paste')}</Typography.Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {getInsertableNodeTypes().map(([type, def]) => (
          <Button
            key={type}
            size="small"
            style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}
            onClick={() => {
              onInsert(path, index, type);
              setOpenKey(null);
            }}
          >
            <span style={{ color: def.color, fontSize: 16 }}>{renderNodeIcon(type)}</span>
            <span>{def.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0' }}>
      <div style={{ width: 2, height: 12, background: '#cbd5e1' }} />
      <Popover content={content} trigger="click" placement="right" open={openKey === key} onOpenChange={(open) => setOpenKey(open ? key : null)}>
        <Button type="primary" shape="circle" size="small" icon={<PlusOutlined />} aria-label={t('process.designer.addNode')} title={t('process.designer.addNode')} />
      </Popover>
      <div style={{ width: 2, height: 12, background: '#cbd5e1' }} />
    </div>
  );
};

export default InsertNodePopover;

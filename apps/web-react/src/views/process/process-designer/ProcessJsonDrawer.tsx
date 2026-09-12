import React from 'react';
import { Drawer, Input } from 'antd';
import { useTranslation } from '@/i18n';

export interface ProcessJsonDrawerProps {
  open: boolean;
  nodes: any[];
  onClose: () => void;
}

export const ProcessJsonDrawer: React.FC<ProcessJsonDrawerProps> = ({ open, nodes, onClose }) => {
  const { t } = useTranslation();
  return (
    <Drawer title={t('process.designer.jsonTitle')} open={open} onClose={onClose} width={560}>
      <Input.TextArea
        readOnly
        value={JSON.stringify(nodes, null, 2)}
        autoSize={{ minRows: 24 }}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
      />
    </Drawer>
  );
};

export default ProcessJsonDrawer;

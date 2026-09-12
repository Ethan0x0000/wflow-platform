import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { EyeOutlined, MinusOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';

export interface ProcessToolbarProps {
  scale: number;
  onOpenJson: () => void;
  onValidate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const ProcessToolbar: React.FC<ProcessToolbarProps> = ({ scale, onOpenJson, onValidate, onZoomIn, onZoomOut }) => {
  const { t } = useTranslation();
  return (
    <div style={{ position: 'fixed', right: 40, top: 120, zIndex: 10 }}>
      <Space direction="vertical">
        <Tooltip title={t('process.designer.viewJson')} placement="left">
          <Button icon={<EyeOutlined />} onClick={onOpenJson} />
        </Tooltip>
        <Tooltip title={t('process.designer.validate')} placement="left">
          <Button icon={<SafetyCertificateOutlined />} onClick={onValidate} />
        </Tooltip>
        <Button icon={<PlusOutlined />} onClick={onZoomIn} />
        <div style={{ textAlign: 'center', fontSize: 12, background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{scale}%</div>
        <Button icon={<MinusOutlined />} onClick={onZoomOut} />
      </Space>
    </div>
  );
};

export default ProcessToolbar;

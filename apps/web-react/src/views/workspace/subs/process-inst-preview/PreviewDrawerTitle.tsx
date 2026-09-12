import React from 'react';
import { Button, Space, Tag, Tooltip, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import type { InstanceDetail } from '@/types/workflow';
import { InstStatusTag } from './InstStatusTag';

export interface PreviewDrawerTitleProps {
  instance: InstanceDetail | null;
  onCopy: () => void;
}

export const PreviewDrawerTitle: React.FC<PreviewDrawerTitleProps> = ({ instance, onCopy }) => {
  const { t } = useTranslation();
  if (!instance) return <>{t('workspace.drawer.detail')}</>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Space size={8}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {instance.defineName || instance.title || t('workspace.drawer.detail')}
        </Typography.Title>
        <InstStatusTag status={instance.status} />
        {instance.version !== undefined && <Tag>V{instance.version}</Tag>}
        {instance.isAgent && <Tag color="purple">{t('workspace.drawer.agent')}</Tag>}
      </Space>
      <Space size={4}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {t('workspace.drawer.instNo')}: {instance.instId}
        </Typography.Text>
        <Tooltip title={t('workspace.preview.copyId')}>
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={onCopy} />
        </Tooltip>
      </Space>
    </div>
  );
};

export default PreviewDrawerTitle;

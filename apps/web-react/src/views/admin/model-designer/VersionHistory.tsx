import React from 'react';
import { Button, List, Space, Tag, Typography } from 'antd';
import { useTranslation } from '@/i18n';
import type { HisModel } from './types';

export interface VersionHistoryProps {
  hisModels: HisModel[];
  version: number;
  hisPages: number;
  hisPage: number;
  onSwitchVer: (his: HisModel) => void;
  onActiveVer: (his: HisModel) => void;
  onPageChange: (page: number) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  hisModels,
  version,
  hisPages,
  hisPage,
  onSwitchVer,
  onActiveVer,
  onPageChange,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ width: 400 }}>
      <List
        size="small"
        dataSource={hisModels}
        locale={{ emptyText: t('admin.versionHistory.empty') }}
        renderItem={(his) => (
          <List.Item
            actions={[
              his.version === version ? (
                <Typography.Text key="current" type="success">
                  {t('admin.versionHistory.current')}
                </Typography.Text>
              ) : (
                <Button key="switch" type="link" size="small" onClick={() => onSwitchVer(his)}>
                  {t('admin.versionHistory.switch')}
                </Button>
              ),
              his.status === 1 ? (
                <Typography.Text key="active" type="success">
                  {t('admin.versionHistory.active')}
                </Typography.Text>
              ) : his.status === 2 || (his.defineId || '').includes(':') ? (
                <Button key="activate" type="link" size="small" onClick={() => onActiveVer(his)}>
                  {t('admin.versionHistory.activate')}
                </Button>
              ) : (
                <Typography.Text key="draft" type="secondary">
                  {t('admin.versionHistory.unpublished')}
                </Typography.Text>
              ),
            ]}
          >
            <Space size={4}>
              <Typography.Text ellipsis style={{ maxWidth: 150 }}>
                {his.procName}
              </Typography.Text>
              <Tag color={his.status === 1 ? 'success' : his.status === 2 ? 'default' : 'warning'}>
                v{his.version} {his.status === 1 ? t('admin.status.published') : his.status === 2 ? t('admin.versionHistory.history') : t('admin.versionHistory.draft')}
              </Tag>
            </Space>
          </List.Item>
        )}
      />
      {hisPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Button type="link" size="small" disabled={hisPage <= 1} onClick={() => onPageChange(hisPage - 1)}>
            {t('admin.versionHistory.prev')}
          </Button>
          <Typography.Text type="secondary">
            {hisPage}/{hisPages}
          </Typography.Text>
          <Button type="link" size="small" disabled={hisPage >= hisPages} onClick={() => onPageChange(hisPage + 1)}>
            {t('admin.versionHistory.next')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VersionHistory;

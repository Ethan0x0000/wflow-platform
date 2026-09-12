import React from 'react';
import { Space, Tag, Typography } from 'antd';
import { WAvatar } from '@/components/WAvatar';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import type { InstanceDetail } from '@/types/workflow';

export const InstSummaryCard: React.FC<{ instance: InstanceDetail }> = ({ instance }) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <Space size={12}>
        <WAvatar id={instance.initiator?.id} name={instance.initiator?.name} size={40} />
        <div>
          <Typography.Text strong>{instance.initiator?.name}</Typography.Text>
          {instance.isAgent && instance.startUser && (
            <Tag color="purple" style={{ marginLeft: 6 }}>
              {formatMessage(t('workspace.drawer.agentStart'), { name: instance.startUser.name })}
            </Tag>
          )}
          <div style={{ fontSize: 12, color: '#888' }}>
            {instance.deptName || instance.startDeptInfo?.name} · {t('workspace.drawer.submittedAt')}{' '}
            {instance.startTime || instance.createTime}
          </div>
        </div>
      </Space>
      {instance.currentNodeName && (
        <Tag color="blue" style={{ padding: '4px 8px', fontSize: 13 }}>
          {t('workspace.drawer.currentNode')}: {instance.currentNodeName}
        </Tag>
      )}
    </div>
  );
};

export default InstSummaryCard;

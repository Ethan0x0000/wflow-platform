import React from 'react';
import { Tag } from 'antd';
import { useTranslation } from '@/i18n';

export const InstStatusTag: React.FC<{ status?: string }> = ({ status }) => {
  const { t } = useTranslation();
  switch (status) {
    case 'RUNNING':
      return <Tag color="processing">{t('workspace.status.running')}</Tag>;
    case 'SUSPEND':
      return <Tag color="warning">{t('workspace.status.suspended')}</Tag>;
    case 'PASS':
      return <Tag color="success">{t('workspace.status.passed')}</Tag>;
    case 'REFUSE':
      return <Tag color="error">{t('workspace.status.refused')}</Tag>;
    case 'REVOKED':
      return <Tag color="default">{t('workspace.status.revoked')}</Tag>;
    case 'EXCEPTION':
      return <Tag color="volcano">{t('workspace.status.exception')}</Tag>;
    default:
      return <Tag>{status || t('workspace.status.unknown')}</Tag>;
  }
};

export default InstStatusTag;

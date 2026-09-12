import React from 'react';
import { Tag } from 'antd';
import { MergeCellsOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';

export const JoinRow: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <div style={{ width: 60, height: 2, background: '#cbd5e1' }} />
      <Tag icon={<MergeCellsOutlined />} color="default" style={{ margin: 0 }}>
        {t('process.node.join')}
      </Tag>
      <div style={{ width: 60, height: 2, background: '#cbd5e1' }} />
    </div>
  );
};

export default JoinRow;

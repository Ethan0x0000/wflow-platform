import React from 'react';
import { Checkbox, Empty, Input, Table, Typography } from 'antd';
import { useTranslation } from '@/i18n';

export interface OperationPermConf {
  name: string;
  alisa: string;
  action: string;
  enable: boolean;
}

export interface OperationPermConfigProps {
  value?: OperationPermConf[];
  onChange?: (value: OperationPermConf[]) => void;
  defaults?: Array<{ name: string; alisa: string; action: string }>;
}

export const OperationPermConfig: React.FC<OperationPermConfigProps> = ({ value = [], onChange, defaults = [] }) => {
  const { t } = useTranslation();
  const existing = Array.isArray(value) ? value : [];
  const rows: OperationPermConf[] = [
    ...defaults.map((item) => {
      const old = existing.find((perm) => perm.action === item.action);
      return old
        ? { ...item, ...old, name: old.name || item.name, alisa: old.alisa || item.alisa }
        : { ...item, enable: false };
    }),
    ...existing
      .filter((perm) => !defaults.some((item) => item.action === perm.action))
      .map((perm) => ({ ...perm, name: perm.name || perm.action, alisa: perm.alisa || perm.name || '' })),
  ];

  const update = (index: number, delta: Partial<OperationPermConf>) => {
    onChange?.(rows.map((row, i) => (i === index ? { ...row, ...delta } : row)));
  };

  if (!rows.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('process.operationPerm.empty')} />;
  }

  return (
    <div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        {t('process.operationPerm.hint')}
      </Typography.Text>
      <Table
        size="small"
        rowKey="action"
        dataSource={rows}
        pagination={false}
        columns={[
          { title: t('process.operationPerm.name'), dataIndex: 'name', width: 120 },
          {
            title: t('process.operationPerm.alias'),
            dataIndex: 'alisa',
            render: (_: any, row: OperationPermConf, index: number) => (
              <Input size="small" value={row.alisa} onChange={(e) => update(index, { alisa: e.target.value })} />
            ),
          },
          {
            title: t('process.operationPerm.enable'),
            dataIndex: 'enable',
            width: 90,
            align: 'center' as const,
            render: (_: any, row: OperationPermConf, index: number) => (
              <Checkbox checked={Boolean(row.enable)} onChange={(e) => update(index, { enable: e.target.checked })} />
            ),
          },
        ]}
      />
    </div>
  );
};

export default OperationPermConfig;

import React from 'react';
import { Button, Empty, Radio, Space, Table, Typography } from 'antd';
import { useTranslation } from '@/i18n';
import { getFormPermFields } from '@/utils/ProcessUtil';

export interface FormPermConfigProps {
  value?: any[];
  onChange?: (value: any[]) => void;
  formFields?: any[];
  defaultPerm?: 'R' | 'E' | 'H' | 'D';
  showE?: boolean;
  showD?: boolean;
}

const PERM_KEYS: Record<string, string> = {
  R: 'process.perm.read',
  E: 'process.perm.edit',
  H: 'process.perm.hide',
  D: 'process.perm.disable',
};

export const FormPermConfig: React.FC<FormPermConfigProps> = ({
  value = [],
  onChange,
  formFields = [],
  defaultPerm = 'R',
  showE = true,
  showD = true,
}) => {
  const { t } = useTranslation();
  const perms: Array<'R' | 'E' | 'H' | 'D'> = ['R', ...(showE ? (['E'] as const) : []), 'H', ...(showD ? (['D'] as const) : [])];
  const existing = Array.isArray(value) ? value : [];
  const baseRows = getFormPermFields(formFields || [], defaultPerm);
  const rows =
    baseRows.length > 0
      ? baseRows.map((row) => {
          const old = existing.find((item) => item.key === row.key);
          return { ...row, perm: old?.perm || row.perm };
        })
      : existing;

  const setPerm = (index: number, perm: string) => {
    if (!rows.length) return;
    onChange?.(rows.map((row, i) => (i === index ? { ...row, perm } : row)));
  };

  const setAll = (perm: string) => onChange?.(rows.map((row) => ({ ...row, perm })));

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary">{t('process.formPerm.batch')}</Typography.Text>
        {perms.map((perm) => (
          <Button key={perm} size="small" onClick={() => setAll(perm)}>
            {t(PERM_KEYS[perm])}
          </Button>
        ))}
      </Space>
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('process.formPerm.empty')} />
      ) : (
        <Table
          size="small"
          rowKey={(row: any) => row.key || row.id}
          dataSource={rows}
          pagination={false}
          columns={[
            {
              title: t('process.formPerm.field'),
              dataIndex: 'name',
              render: (_: any, row: any) => (
                <span>
                  {row.required && <span style={{ color: '#ff4d4f' }}> * </span>}
                  {row.name}
                </span>
              ),
            },
            ...perms.map((perm) => ({
              title: t(PERM_KEYS[perm]),
              dataIndex: perm,
              width: 90,
              align: 'center' as const,
              render: (_: any, row: any, index: number) => (
                <Radio
                  name={`perm-${row.key || row.id}`}
                  checked={(row.perm || defaultPerm) === perm}
                  onChange={() => setPerm(index, perm)}
                >
                  {null}
                </Radio>
              ),
            })),
          ]}
        />
      )}
    </div>
  );
};

export default FormPermConfig;

import React from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

export interface ProcessValidateModalProps {
  open: boolean;
  errors: string[];
  onClose: () => void;
}

export const ProcessValidateModal: React.FC<ProcessValidateModalProps> = ({ open, errors, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('process.designer.validateTitle')}
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>{t('process.common.close')}</Button>}
      width={560}
    >
      {errors.length === 0 ? (
        <Typography.Text type="success">{t('process.designer.validateOk')}</Typography.Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="danger">{formatMessage(t('process.designer.validateErrors'), { count: errors.length })}</Typography.Text>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {errors.map((error, index) => (
              <li key={index}>
                <Typography.Text>{error}</Typography.Text>
              </li>
            ))}
          </ul>
        </Space>
      )}
    </Modal>
  );
};

export default ProcessValidateModal;

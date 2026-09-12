import React from 'react';
import { Input, Modal } from 'antd';
import { WOrgTags } from '@/components/WOrgTags';
import { useTranslation } from '@/i18n';
import type { OrgTarget } from '@/types/workflow';

export interface UrgingModalProps {
  open: boolean;
  onCancel: () => void;
  submitting: boolean;
  onOk: () => void;
  urgingUsers: OrgTarget[];
  setUrgingUsers: (users: OrgTarget[]) => void;
  urgingRemark: string;
  setUrgingRemark: (value: string) => void;
}

export const UrgingModal: React.FC<UrgingModalProps> = ({
  open,
  onCancel,
  submitting,
  onOk,
  urgingUsers,
  setUrgingUsers,
  urgingRemark,
  setUrgingRemark,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('workspace.urging.title')}
      open={open}
      onCancel={onCancel}
      confirmLoading={submitting}
      onOk={onOk}
      destroyOnHidden
    >
      <div style={{ marginBottom: 6, fontWeight: 500 }}>{t('workspace.urging.users')}</div>
      <WOrgTags value={urgingUsers} onChange={setUrgingUsers} buttonText={t('workspace.urging.selectPerson')} />
      <div style={{ marginTop: 16, marginBottom: 6, fontWeight: 500 }}>{t('workspace.urging.remark')}</div>
      <Input.TextArea
        rows={3}
        value={urgingRemark}
        onChange={(event) => setUrgingRemark(event.target.value)}
        placeholder={t('workspace.urging.placeholder')}
        maxLength={500}
      />
    </Modal>
  );
};

export default UrgingModal;

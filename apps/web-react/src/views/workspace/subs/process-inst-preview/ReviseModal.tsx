import React from 'react';
import { Alert, Divider, Input, Modal } from 'antd';
import { FormRender } from '@/views/form/FormRender';
import { useTranslation } from '@/i18n';
import type { FormItemConfig, InstanceDetail } from '@/types/workflow';

export interface ReviseModalProps {
  open: boolean;
  onCancel: () => void;
  submitting: boolean;
  onOk: () => void;
  formRef: React.Ref<any>;
  formSource: { components: FormItemConfig[] };
  instance: InstanceDetail | null;
  reviseComment: string;
  setReviseComment: (value: string) => void;
}

export const ReviseModal: React.FC<ReviseModalProps> = ({
  open,
  onCancel,
  submitting,
  onOk,
  formRef,
  formSource,
  instance,
  reviseComment,
  setReviseComment,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('workspace.revise.title')}
      open={open}
      onCancel={onCancel}
      confirmLoading={submitting}
      onOk={onOk}
      destroyOnHidden
      width={720}
    >
      <Alert type="info" showIcon message={t('workspace.revise.alert')} style={{ marginBottom: 12 }} />
      <FormRender ref={formRef} config={formSource.components} value={instance?.formData || {}} readOnly={false} />
      <Divider />
      <Input.TextArea
        rows={3}
        value={reviseComment}
        onChange={(event) => setReviseComment(event.target.value)}
        placeholder={t('workspace.revise.placeholder')}
        maxLength={250}
        showCount
      />
    </Modal>
  );
};

export default ReviseModal;

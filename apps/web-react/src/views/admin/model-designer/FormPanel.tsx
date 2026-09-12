import React from 'react';
import { Form, Input, Radio, Typography } from 'antd';
import { FormDesigner } from '@/views/form/FormDesigner';
import type { ModelDesignerApi } from './useModelDesigner';
import { useTranslation } from '@/i18n';

export interface FormPanelProps {
  designer: ModelDesignerApi;
}

export const FormPanel: React.FC<FormPanelProps> = ({ designer }) => {
  const { t } = useTranslation();
  const { formType, formJson, setFormJson, formCode, setFormCode, formRef, setFormRef } = designer;

  if (formType === 0) {
    return <FormDesigner value={formJson as any} onChange={(value) => setFormJson(value as any)} />;
  }
  if (formType === 1) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0' }}>
        <Typography.Title level={4}>{t('admin.formPanel.codeForm')}</Typography.Title>
        <Typography.Paragraph type="secondary">
          {t('admin.formPanel.codeFormDesc')}
        </Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label={t('admin.formPanel.pcCode')}>
            <Input.TextArea
              rows={10}
              value={formCode.pc || ''}
              onChange={(e) => setFormCode((prev) => ({ ...prev, pc: e.target.value || null }))}
              placeholder={t('admin.formPanel.pcPlaceholder')}
            />
          </Form.Item>
          <Form.Item label={t('admin.formPanel.mbCode')}>
            <Input.TextArea
              rows={8}
              value={formCode.mb || ''}
              onChange={(e) => setFormCode((prev) => ({ ...prev, mb: e.target.value || null }))}
              placeholder={t('admin.formPanel.mbPlaceholder')}
            />
          </Form.Item>
        </Form>
      </div>
    );
  }
  if (formType === 2) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0' }}>
        <Typography.Title level={4}>{t('admin.formPanel.externalForm')}</Typography.Title>
        <Form layout="vertical">
          <Form.Item label={t('admin.formPanel.refType')}>
            <Radio.Group
              value={formRef.type}
              onChange={(e) => setFormRef({ type: e.target.value, pcPath: null, mbPath: null })}
            >
              <Radio value="LOCAL">{t('admin.formPanel.refLocal')}</Radio>
              <Radio value="URL">{t('admin.formPanel.refUrl')}</Radio>
              <Radio value="CODE">{t('admin.formPanel.refCode')}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={t('admin.formPanel.pcPath')}>
            <Input
              value={formRef.pcPath || ''}
              onChange={(e) => setFormRef((prev) => ({ ...prev, pcPath: e.target.value || null }))}
              placeholder={formRef.type === 'LOCAL' ? t('admin.formPanel.pcPathLocalPlaceholder') : t('admin.formPanel.pcPathPlaceholder')}
            />
          </Form.Item>
          <Form.Item label={t('admin.formPanel.mbPath')}>
            <Input
              value={formRef.mbPath || ''}
              onChange={(e) => setFormRef((prev) => ({ ...prev, mbPath: e.target.value || null }))}
              placeholder={formRef.type === 'LOCAL' ? t('admin.formPanel.mbPathLocalPlaceholder') : t('admin.formPanel.mbPathPlaceholder')}
            />
          </Form.Item>
        </Form>
      </div>
    );
  }
  return null;
};

export default FormPanel;

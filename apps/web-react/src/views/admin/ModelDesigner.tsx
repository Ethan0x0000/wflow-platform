import React from 'react';
import { Button, Input, Layout, Modal, Spin, Typography } from 'antd';
import { ProcessDesigner } from '@/views/process/ProcessDesigner';
import { BasePanel } from './model-designer/BasePanel';
import { FormPanel } from './model-designer/FormPanel';
import { ModelHeader } from './model-designer/ModelHeader';
import { PlusPanel } from './model-designer/PlusPanel';
import { useModelDesigner } from './model-designer/useModelDesigner';
import { useTranslation } from '@/i18n';

const { Content } = Layout;

export const ModelDesigner: React.FC = () => {
  const { t } = useTranslation();
  const d = useModelDesigner();

  if (d.loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#888' }}>{t('admin.modelDesigner.loading')}</div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <ModelHeader designer={d} />

      <Content style={{ padding: d.activeTab === 'FORM' ? 0 : 20 }}>
        {d.activeTab === 'BASE' && <BasePanel designer={d} />}
        {d.activeTab === 'FORM' && d.formType !== 4 && <FormPanel designer={d} />}
        {d.activeTab === 'PROCESS' && (
          <ProcessDesigner value={d.processNodes} onChange={d.setProcessNodes} />
        )}
        {d.activeTab === 'PLUS' && (
          <PlusPanel value={d.setting} onChange={d.setSetting} formFields={d.collectFormFields()} />
        )}
      </Content>

      <Modal
        title={t('admin.modelManager.newGroupTitle')}
        open={d.groupModalOpen}
        onCancel={() => d.setGroupModalOpen(false)}
        onOk={d.handleCreateGroup}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Input
          placeholder={t('admin.modelManager.groupNamePlaceholder')}
          value={d.newGroupName}
          maxLength={30}
          onChange={(e) => d.setNewGroupName(e.target.value)}
          onPressEnter={d.handleCreateGroup}
        />
      </Modal>

      <Modal
        title={t('admin.modelDesigner.validTitle')}
        open={d.validModalOpen}
        onCancel={() => d.setValidModalOpen(false)}
        footer={
          <Button type="primary" onClick={() => d.setValidModalOpen(false)}>
            {t('admin.modelDesigner.gotIt')}
          </Button>
        }
      >
        <Typography.Paragraph type="danger">
          {t('admin.modelDesigner.validFailed').replace('{count}', String(d.validErrors.length))}
        </Typography.Paragraph>
        <div style={{ maxHeight: 240, overflow: 'auto' }}>
          {d.validErrors.map((err, index) => (
            <div key={`${index}-${err}`} style={{ padding: '2px 5px' }}>
              {index + 1}. {err}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title={t('admin.modelDesigner.publishConfirmTitle')}
        open={d.confirmPublishOpen}
        confirmLoading={d.deploying}
        onCancel={() => d.setConfirmPublishOpen(false)}
        onOk={d.handleConfirmPublish}
        okText={t('admin.modelDesigner.publishOk')}
        cancelText={t('common.cancel')}
      >
        <p>{t('admin.modelDesigner.publishConfirmContent')}</p>
      </Modal>
    </Layout>
  );
};

export default ModelDesigner;

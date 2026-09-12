import React from 'react';
import { Tabs } from 'antd';
import { ProcessInstRecord } from '@/components/ProcessInstRecord';
import { ProcessPreview } from '@/components/ProcessPreview';
import { ProcessInstDiscuss } from '@/components/ProcessInstDiscuss';
import { useTranslation } from '@/i18n';
import type { FormItemConfig, InstanceDetail } from '@/types/workflow';
import { FormPane } from './FormPane';

export interface PreviewTabsProps {
  activeTab: string;
  onChange: (key: string) => void;
  hasForm: boolean;
  formSource: { components: FormItemConfig[] };
  parentFormSource: { components: FormItemConfig[] };
  instance: InstanceDetail | null;
  parentInst: InstanceDetail | null;
  formRef: React.Ref<any>;
  parentFormRef: React.Ref<any>;
  canHandle: boolean;
  instId: string;
  adminMode: boolean;
}

export const PreviewTabs: React.FC<PreviewTabsProps> = ({
  activeTab,
  onChange,
  hasForm,
  formSource,
  parentFormSource,
  instance,
  parentInst,
  formRef,
  parentFormRef,
  canHandle,
  instId,
  adminMode,
}) => {
  const { t } = useTranslation();
  const tabItems = [
    ...(hasForm
      ? [
          {
            key: 'form',
            label: t('workspace.tabs.form'),
            children: <div style={{ padding: '8px 0' }}><FormPane source={formSource} inst={instance} formRef={formRef} readOnly={!canHandle} /></div>,
          },
        ]
      : []),
    {
      key: 'records',
      label: t('workspace.tabs.records'),
      children: (
        <ProcessInstRecord
          instId={instId}
          isAgent={instance?.isAgent}
          initiator={instance?.initiator}
          status={instance?.status}
          statusName={instance?.statusName}
          onOpenChild={(childId) => {
            onChange('form');
            window.open(`/workspace/submitted?instId=${childId}`, '_blank');
          }}
        />
      ),
    },
    { key: 'process', label: t('workspace.tabs.process'), children: <ProcessPreview instId={instId} /> },
    ...(instance?.discuss?.showDiscuss
      ? [
          {
            key: 'discuss',
            label: t('workspace.tabs.discuss'),
            children: (
              <ProcessInstDiscuss
                instId={instId}
                showDiscuss={instance?.discuss?.showDiscuss}
                enableDiscuss={instance?.discuss?.enableDiscuss}
                admin={adminMode}
              />
            ),
          },
        ]
      : []),
    ...(parentInst
      ? [
          {
            key: 'parent',
            label: t('workspace.tabs.parentForm'),
            children: (
              <div style={{ padding: '8px 0' }}>
                <FormPane source={parentFormSource} inst={parentInst} formRef={parentFormRef} readOnly />
              </div>
            ),
          },
        ]
      : []),
  ];

  return <Tabs activeKey={activeTab} onChange={onChange} items={tabItems as any} />;
};

export default PreviewTabs;

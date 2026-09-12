import React from 'react';
import { Layout, Menu, Button, Popover, Space, Tag, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  BranchesOutlined,
  CloudUploadOutlined,
  ExperimentOutlined,
  FormOutlined,
  HistoryOutlined,
  SaveOutlined,
  SettingOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { STEP_NUM } from './constants';
import { VersionHistory } from './VersionHistory';
import type { TabKey } from './types';
import type { ModelDesignerApi } from './useModelDesigner';

const { Header } = Layout;

export interface ModelHeaderProps {
  designer: ModelDesignerApi;
}

export const ModelHeader: React.FC<ModelHeaderProps> = ({ designer }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navMenuItems: MenuProps['items'] = [
    { key: 'BASE', icon: <SettingOutlined />, label: `${STEP_NUM.BASE} ${t('design.nav.base')}` },
    ...(designer.formType !== 4 ? [{ key: 'FORM', icon: <FormOutlined />, label: `${STEP_NUM.FORM} ${t('design.nav.form')}` }] : []),
    { key: 'PROCESS', icon: <BranchesOutlined />, label: `${STEP_NUM.PROCESS} ${t('design.nav.process')}` },
    { key: 'PLUS', icon: <SyncOutlined />, label: `${STEP_NUM.PLUS} ${t('design.nav.plus')}` },
  ];

  return (
    <Header
      style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
      }}
    >
      <Space size={12} align="center">
        <Button icon={<ArrowLeftOutlined />} shape="circle" onClick={() => navigate('/workspace/model')} />
        <div
          title={designer.logo.name}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: designer.logo.bgc,
            color: designer.logo.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
          }}
        >
          {designer.procName.slice(0, 1) || t('admin.common.flowInitial')}
        </div>
        <Typography.Text strong>{designer.procName || t('admin.common.untitledProcess')}</Typography.Text>
        {designer.code && (
          <Popover
            placement="bottom"
            trigger="click"
            open={designer.hisOpen}
            onOpenChange={(open) => {
              designer.setHisOpen(open);
              if (open && designer.code) void designer.fetchHistory(designer.code, 1);
            }}
            content={
              <VersionHistory
                hisModels={designer.hisModels}
                version={designer.version}
                hisPages={designer.hisPages}
                hisPage={designer.hisPage}
                onSwitchVer={designer.switchVer}
                onActiveVer={designer.activeVer}
                onPageChange={designer.setHisPage}
              />
            }
          >
            <Space size={4} style={{ cursor: 'pointer' }}>
              <Tag icon={<HistoryOutlined />} color="blue">
                {t('admin.modelDesigner.currentVersion')}: v{designer.version}
              </Tag>
              {designer.hasNewVersion && <Tag color="warning">{t('admin.modelDesigner.unpublishedVersion')}</Tag>}
            </Space>
          </Popover>
        )}
      </Space>

      <Menu
        mode="horizontal"
        selectedKeys={[designer.activeTab]}
        items={navMenuItems}
        onClick={({ key }) => designer.setActiveTab(key as TabKey)}
        style={{ flex: 1, justifyContent: 'center', borderBottom: 0 }}
      />

      <Space size={8}>
        <Tooltip title={t('admin.modelDesigner.mockTip')}>
          <Button icon={<ExperimentOutlined />} onClick={designer.handleMock}>
            {t('admin.modelDesigner.mock')}
          </Button>
        </Tooltip>
        <Button icon={<SaveOutlined />} loading={designer.saving} onClick={designer.handleSaveDraft}>
          {t('admin.modelDesigner.saveDraft')}
        </Button>
        {designer.publishedExists && (
          <Button icon={<SyncOutlined />} onClick={designer.handleUpdateOnly}>
            {t('admin.modelDesigner.updateOnly')}
          </Button>
        )}
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          loading={designer.deploying}
          onClick={designer.handlePublishClick}
        >
          {t('admin.modelDesigner.saveAndPublish')}
        </Button>
      </Space>
    </Header>
  );
};

export default ModelHeader;

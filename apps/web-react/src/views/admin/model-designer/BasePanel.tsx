import React from 'react';
import { Button, ColorPicker, Divider, Form, Input, Popover, Radio, Select, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Icon } from '@iconify/react';
import { WIconSelect } from '@/components/WIconSelect';
import { WOrgTags } from '@/components/WOrgTags';
import { LOGO_COLORS } from '@/components/modelDefaults';
import { FORM_TYPE_LABEL_KEYS } from './constants';
import type { ModelDesignerApi } from './useModelDesigner';
import { useTranslation } from '@/i18n';

export interface BasePanelProps {
  designer: ModelDesignerApi;
}

export const BasePanel: React.FC<BasePanelProps> = ({ designer }) => {
  const { t } = useTranslation();
  const {
    logo,
    setLogo,
    procName,
    setProcName,
    code,
    groupId,
    handleGroupChange,
    groups,
    setGroupModalOpen,
    formType,
    setFormType,
    remark,
    setRemark,
    startupRange,
    setStartupRange,
    startupPerm,
    setStartupPerm,
    adminPerm,
    setAdminPerm,
  } = designer;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 0' }}>
      <Typography.Title level={4}>{t('admin.basePanel.title')}</Typography.Title>
      <Divider />
      <Form layout="vertical">
        <Form.Item label={t('admin.basePanel.logo')}>
          <Space size={16} align="center" wrap>
            <div
              title={logo.name}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: logo.bgc,
                color: logo.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 22,
              }}
            >
              {logo.name ? <Icon icon={logo.name} /> : procName.slice(0, 1) || t('admin.common.flowInitial')}
            </div>
            <Popover
              trigger="click"
              placement="bottomLeft"
              content={
                <WIconSelect
                  value={logo.name}
                  onChange={(icon) => setLogo((prev) => ({ ...prev, name: icon }))}
                />
              }
            >
              <Input
                value={logo.name}
                readOnly
                style={{ width: 280, cursor: 'pointer' }}
                placeholder={t('admin.basePanel.clickSelectIcon')}
                suffix={<Icon icon={logo.name || 'mdi:image-search'} />}
              />
            </Popover>
            <Space size={8}>
              <span>{t('admin.basePanel.bgcLabel')}</span>
              <ColorPicker
                value={logo.bgc}
                presets={[{ label: t('admin.basePanel.preset'), colors: LOGO_COLORS }]}
                onChange={(value: any) =>
                  setLogo((prev) => ({ ...prev, bgc: typeof value === 'string' ? value : value.toHexString() }))
                }
              />
              <span>{t('admin.basePanel.colorLabel')}</span>
              <ColorPicker
                value={logo.color}
                presets={[{ label: t('admin.basePanel.preset'), colors: ['#ffffff', '#000000', '#1677ff', '#fa541c'] }]}
                onChange={(value: any) =>
                  setLogo((prev) => ({ ...prev, color: typeof value === 'string' ? value : value.toHexString() }))
                }
              />
            </Space>
          </Space>
        </Form.Item>

        <Form.Item label={t('design.base.name')} required>
          <Input
            value={procName}
            maxLength={120}
            onChange={(e) => setProcName(e.target.value)}
            placeholder={t('design.base.nameTip')}
            style={{ width: 320 }}
          />
        </Form.Item>

        <Form.Item label={t('admin.basePanel.code')}>
          <Input value={code || t('admin.basePanel.codePlaceholder')} readOnly style={{ width: 320 }} />
        </Form.Item>

        <Form.Item label={t('admin.basePanel.belongGroup')} required>
          <Space.Compact style={{ width: 420 }}>
            <Select
              value={groupId || undefined}
              onChange={handleGroupChange}
              placeholder={t('design.base.groupTip')}
              style={{ flex: 1 }}
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
            />
            <Button icon={<PlusOutlined />} onClick={() => setGroupModalOpen(true)}>
              {t('design.modelMg.newGroup')}
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item label={t('admin.basePanel.formTypeMode')} required>
          <Radio.Group value={formType} onChange={(e) => setFormType(e.target.value)}>
            {[0, 1, 2, 4].map((type) => (
              <Radio key={type} value={type}>
                {t(FORM_TYPE_LABEL_KEYS[type])}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item label={t('design.base.remark')}>
          <Input.TextArea
            rows={3}
            maxLength={128}
            showCount
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={t('admin.basePanel.remarkPlaceholder')}
          />
        </Form.Item>

        <Form.Item label={t('admin.basePanel.startupRange')}>
          <Space size={16} align="start" wrap>
            <Select
              value={startupRange}
              style={{ width: 160 }}
              onChange={setStartupRange}
              options={[
                { value: 'ALL', label: t('admin.basePanel.rangeAll') },
                { value: 'RANGE', label: t('admin.basePanel.rangeSpecified') },
                { value: 'NONE', label: t('admin.basePanel.rangeNone') },
              ]}
            />
            {startupRange === 'RANGE' && (
              <WOrgTags value={startupPerm} onChange={setStartupPerm} type="org" buttonText={t('admin.basePanel.setStartupUsers')} />
            )}
            {startupRange === 'NONE' && <Typography.Text type="secondary">{t('admin.basePanel.noneHint')}</Typography.Text>}
          </Space>
        </Form.Item>

        <Form.Item label={t('admin.basePanel.admin')}>
          <WOrgTags
            value={adminPerm}
            onChange={setAdminPerm}
            type="org"
            buttonText={t('admin.basePanel.setAdmin')}
          />
        </Form.Item>
      </Form>
    </div>
  );
};

export default BasePanel;

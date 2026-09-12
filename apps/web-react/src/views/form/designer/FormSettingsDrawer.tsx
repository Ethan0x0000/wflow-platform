import React from 'react';
import { Alert, Button, Card, Divider, Drawer, Form, Input, InputNumber, Radio, Select, Space, Tabs, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { ConditionGroupEditor } from './ConditionGroupEditor';
import { ActionListEditor, MountedActionList } from './ActionListEditor';
import { DatasourceEditor } from './DatasourceEditor';
import type { ConditionItem, DsGroupOption } from './types';

export interface FormSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  conf: Record<string, any>;
  datasource: any[];
  fields: any[];
  dsOptions: DsGroupOption[];
  onPatchConf: (patch: Record<string, any>) => void;
  onChangeDatasource: (next: any[]) => void;
}

export const FormSettingsDrawer: React.FC<FormSettingsDrawerProps> = ({
  open,
  onClose,
  conf,
  datasource,
  fields,
  dsOptions,
  onPatchConf,
  onChangeDatasource,
}) => {
  const { t } = useTranslation();
  const validConf = conf.valid || { type: 'SIMPLE', js: null, rules: [] };
  const showHideConf = conf.showHide || { type: 'SIMPLE', js: null, rules: [] };
  const actionConf = conf.actionRule || { type: 'SIMPLE', js: null, rules: [] };
  const onLoadConf = conf.onLoad || { type: 'SIMPLE', js: null, actions: [] };

  const patchSection = (section: string, delta: Record<string, any>) => {
    const current = conf[section] || { type: 'SIMPLE', js: null, rules: [] };
    onPatchConf({ [section]: { ...current, ...delta } });
  };

  const renderRuleDelete = (onDelete: () => void) => (
    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={onDelete} />
  );

  const jsNote = <Alert type="info" showIcon style={{ marginBottom: 12 }} message={t('form.designer.settingsDrawer.jsNote')} />;

  const formTab = (
    <Form layout="vertical" size="small">
      <Form.Item label={t('form.designer.settingsDrawer.labelPosition')} style={{ marginBottom: 10 }}>
        <Radio.Group
          size="small"
          optionType="button"
          value={conf.labelPosition || 'right'}
          onChange={(e) => onPatchConf({ labelPosition: e.target.value })}
        >
          <Radio.Button value="top">{t('form.designer.settingsDrawer.posTop')}</Radio.Button>
          <Radio.Button value="left">{t('form.designer.settingsDrawer.posLeft')}</Radio.Button>
          <Radio.Button value="right">{t('form.designer.settingsDrawer.posRight')}</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item label={t('form.designer.settingsDrawer.labelWidth')} style={{ marginBottom: 10 }}>
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          value={conf.labelWidth ?? 100}
          onChange={(labelWidth) => onPatchConf({ labelWidth })}
        />
      </Form.Item>
      <Form.Item label={t('form.designer.settingsDrawer.componentSize')} style={{ marginBottom: 10 }}>
        <Radio.Group
          size="small"
          optionType="button"
          value={conf.size || 'default'}
          onChange={(e) => onPatchConf({ size: e.target.value })}
        >
          <Radio.Button value="large">{t('form.designer.settingsDrawer.sizeLarge')}</Radio.Button>
          <Radio.Button value="default">{t('form.designer.settingsDrawer.sizeDefault')}</Radio.Button>
          <Radio.Button value="small">{t('form.designer.settingsDrawer.sizeSmall')}</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Divider style={{ margin: '4px 0 12px' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('form.designer.settingsDrawer.mobileSettings')}
        </Typography.Text>
      </Divider>
      <Form.Item label={t('form.designer.settingsDrawer.labelPosition')} style={{ marginBottom: 10 }}>
        <Radio.Group
          size="small"
          optionType="button"
          value={conf._labelPosition || 'top'}
          onChange={(e) => onPatchConf({ _labelPosition: e.target.value })}
        >
          <Radio.Button value="top">{t('form.designer.settingsDrawer.posTop')}</Radio.Button>
          <Radio.Button value="left">{t('form.designer.settingsDrawer.posLeft')}</Radio.Button>
          <Radio.Button value="right">{t('form.designer.settingsDrawer.posRight')}</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item label={t('form.designer.settingsDrawer.labelWidth')} style={{ marginBottom: 10 }}>
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          value={conf._labelWidth ?? 100}
          onChange={(_labelWidth) => onPatchConf({ _labelWidth })}
        />
      </Form.Item>
    </Form>
  );

  const validTab = (
    <div>
      {jsNote}
      {(validConf.rules || []).map((rule: any, index: number) => (
        <Card
          key={index}
          size="small"
          className="fd-rule-card"
          title={t('form.designer.settingsDrawer.validRule').replace('{index}', String(index + 1))}
          extra={renderRuleDelete(() =>
            patchSection('valid', { rules: (validConf.rules || []).filter((_: any, i: number) => i !== index) })
          )}
        >
          <ConditionGroupEditor
            conditions={(rule.conditions || []) as ConditionItem[]}
            logic={rule.logic === true}
            fields={fields}
            dsOptions={dsOptions}
            onChange={(conditions, logic) =>
              patchSection('valid', {
                rules: (validConf.rules || []).map((item: any, i: number) =>
                  i === index ? { ...item, conditions, logic } : item
                ),
              })
            }
          />
          <Input
            style={{ marginTop: 8 }}
            allowClear
            placeholder={t('form.designer.settingsDrawer.errMsgPlaceholder')}
            value={rule.errMsg ?? ''}
            onChange={(e) =>
              patchSection('valid', {
                rules: (validConf.rules || []).map((item: any, i: number) =>
                  i === index ? { ...item, errMsg: e.target.value } : item
                ),
              })
            }
          />
        </Card>
      ))}
      <Button
        type="primary"
        ghost
        icon={<PlusOutlined />}
        onClick={() => patchSection('valid', { rules: [...(validConf.rules || []), { logic: true, errMsg: null, conditions: [] }] })}
      >
        {t('form.designer.settingsDrawer.addValidRule')}
      </Button>
    </div>
  );

  const showHideTab = (
    <div>
      {jsNote}
      {(showHideConf.rules || []).map((rule: any, index: number) => (
        <Card
          key={index}
          size="small"
          className="fd-rule-card"
          title={t('form.designer.settingsDrawer.showHideRule').replace('{index}', String(index + 1))}
          extra={renderRuleDelete(() =>
            patchSection('showHide', { rules: (showHideConf.rules || []).filter((_: any, i: number) => i !== index) })
          )}
        >
          <ConditionGroupEditor
            conditions={(rule.conditions || []) as ConditionItem[]}
            logic={rule.logic === true}
            fields={fields}
            dsOptions={dsOptions}
            onChange={(conditions, logic) =>
              patchSection('showHide', {
                rules: (showHideConf.rules || []).map((item: any, i: number) =>
                  i === index ? { ...item, conditions, logic } : item
                ),
              })
            }
          />
          <Space style={{ marginTop: 8, width: '100%' }} align="center">
            <Radio.Group
              size="small"
              optionType="button"
              value={rule.isShow !== false}
              onChange={(e) =>
                patchSection('showHide', {
                  rules: (showHideConf.rules || []).map((item: any, i: number) =>
                    i === index ? { ...item, isShow: e.target.value } : item
                  ),
                })
              }
            >
              <Radio.Button value={true}>{t('form.designer.settingsDrawer.show')}</Radio.Button>
              <Radio.Button value={false}>{t('form.designer.settingsDrawer.hide')}</Radio.Button>
            </Radio.Group>
            <Select
              mode="multiple"
              allowClear
              style={{ flex: 1, minWidth: 200 }}
              placeholder={t('form.designer.settingsDrawer.controlFields')}
              value={rule.fields || []}
              options={fields.map((field) => ({
                label: field.parent ? `${field.parent.name}.${field.name}` : field.name,
                value: field.key || field.id,
              }))}
              onChange={(value) =>
                patchSection('showHide', {
                  rules: (showHideConf.rules || []).map((item: any, i: number) =>
                    i === index ? { ...item, fields: value } : item
                  ),
                })
              }
            />
          </Space>
        </Card>
      ))}
      <Button
        type="primary"
        ghost
        icon={<PlusOutlined />}
        onClick={() =>
          patchSection('showHide', {
            rules: [...(showHideConf.rules || []), { logic: true, isShow: true, fields: [], conditions: [] }],
          })
        }
      >
        {t('form.designer.settingsDrawer.addShowHideRule')}
      </Button>
    </div>
  );

  const actionTab = (
    <div>
      {jsNote}
      <ActionListEditor
        rules={actionConf.rules || []}
        fields={fields}
        dsOptions={dsOptions}
        onChange={(rules) => patchSection('actionRule', { rules })}
      />
    </div>
  );

  const onLoadTab = (
    <div>
      {jsNote}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message={t('form.designer.settingsDrawer.onLoadTip')}
      />
      <MountedActionList
        actions={onLoadConf.actions || []}
        fields={fields}
        dsOptions={dsOptions}
        onChange={(actions) => patchSection('onLoad', { actions })}
      />
    </div>
  );

  return (
    <Drawer title={t('form.designer.settingsDrawer.title')} width={760} open={open} onClose={onClose} destroyOnHidden>
      <Tabs
        items={[
          { key: 'form', label: t('form.designer.settingsDrawer.tabForm'), children: formTab },
          {
            key: 'datasource',
            label: t('form.designer.settingsDrawer.tabDatasource'),
            children: <DatasourceEditor value={datasource} onChange={onChangeDatasource} />,
          },
          { key: 'valid', label: t('form.designer.settingsDrawer.tabValid'), children: validTab },
          { key: 'showHide', label: t('form.designer.settingsDrawer.tabShowHide'), children: showHideTab },
          { key: 'action', label: t('form.designer.settingsDrawer.tabAction'), children: actionTab },
          { key: 'onLoad', label: t('form.designer.settingsDrawer.tabOnLoad'), children: onLoadTab },
        ]}
      />
    </Drawer>
  );
};

export default FormSettingsDrawer;

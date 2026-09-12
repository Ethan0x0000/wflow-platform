import React from 'react';
import { Button, Card, Checkbox, Divider, Popover, Select, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { ConditionGroupEditor } from './ConditionGroupEditor';
import { DefaultValueInput } from './DefaultValueInput';
import { OptionsEditor } from './OptionsEditor';
import type { ConditionItem, DsGroupOption } from './types';

const ACTION_TYPES = [
  { labelKey: 'form.designer.action.types.setVal', value: 'SET_VAL' },
  { labelKey: 'form.designer.action.types.rfOptions', value: 'RF_OPTIONS' },
  { labelKey: 'form.designer.action.types.setOptions', value: 'SET_OPTIONS' },
  { labelKey: 'form.designer.action.types.required', value: 'REQUIRED' },
  { labelKey: 'form.designer.action.types.unRequired', value: 'UN_REQUIRED' },
];

const fieldLabel = (field: any): string => {
  const name = field?.name || field?.title || field?.key || '';
  return field?.parent ? `${field.parent.name}.${name}` : name;
};

const optionFields = (fields: any[]) =>
  fields.filter((field) => ['option', 'options'].includes(String(field?.valueType || '').toLowerCase()));

export const createEmptyAction = () => ({
  type: null,
  field: null,
  isDynamic: false,
  value: null,
  option: { optionType: 'static', static: [], http: {} },
});

export interface ActionListEditorProps {
  rules: any[];
  onChange: (rules: any[]) => void;
  fields?: any[];
  dsOptions?: DsGroupOption[];
}

/** 数据联动规则编辑器（条件组 + 动作列表） */
export const ActionListEditor: React.FC<ActionListEditorProps> = ({ rules = [], onChange, fields = [], dsOptions = [] }) => {
  const { t } = useTranslation();
  const actionTypeOptions = ACTION_TYPES.map((item) => ({ label: t(item.labelKey), value: item.value }));

  const updateRule = (index: number, delta: Record<string, any>) => {
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...delta } : rule)));
  };

  const updateAction = (ruleIndex: number, actionIndex: number, delta: Record<string, any>) => {
    const actions = (rules[ruleIndex].actions || []).map((action: any, i: number) =>
      i === actionIndex ? { ...action, ...delta } : action
    );
    updateRule(ruleIndex, { actions });
  };

  return (
    <div>
      {rules.map((rule, ruleIndex) => (
        <Card
          key={ruleIndex}
          size="small"
          className="fd-rule-card"
          title={t('form.designer.action.ruleTitle').replace('{index}', String(ruleIndex + 1))}
          extra={
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onChange(rules.filter((_, i) => i !== ruleIndex))}
            />
          }
        >
          <ConditionGroupEditor
            conditions={(rule.conditions || []) as ConditionItem[]}
            logic={rule.logic !== false}
            fields={fields}
            dsOptions={dsOptions}
            showChange
            onChange={(conditions, logic) => updateRule(ruleIndex, { conditions, logic })}
          />

          <Divider style={{ margin: '10px 0' }}>{t('form.designer.action.execute')}</Divider>
          {(rule.actions || []).map((action: any, actionIndex: number) => {
            const isOptionAction = String(action.type || '').endsWith('_OPTIONS');
            const fieldList = isOptionAction ? optionFields(fields) : fields.filter((f) => f?.valueType !== 'none');
            const targetField = fields.find((f) => (f.key || f.id) === action.field);
            return (
              <Space key={actionIndex} wrap align="center" style={{ marginBottom: 8 }}>
                <Select
                  style={{ width: 150 }}
                  placeholder={t('form.designer.action.actionType')}
                  value={action.type ?? undefined}
                  options={actionTypeOptions}
                  onChange={(type) => updateAction(ruleIndex, actionIndex, { type, field: null, value: null })}
                />
                <Select
                  style={{ width: 180 }}
                  showSearch
                  optionFilterProp="label"
                  placeholder={t('form.designer.action.selectField')}
                  value={action.field ?? undefined}
                  options={fieldList.map((field) => ({ label: fieldLabel(field), value: field.key || field.id }))}
                  onChange={(field) => updateAction(ruleIndex, actionIndex, { field, value: null })}
                />
                {action.type === 'SET_VAL' && action.field && (
                  <div style={{ width: 240 }}>
                    <DefaultValueInput
                      valueType={targetField?.valueType}
                      value={action.value}
                      staticOptions={targetField?.props?.static || targetField?.props?.options}
                      placeholder={t('form.designer.action.setValuePlaceholder')}
                      onChange={(value) => updateAction(ruleIndex, actionIndex, { value })}
                    />
                  </div>
                )}
                {action.type === 'SET_OPTIONS' && (
                  <Popover
                    trigger="click"
                    placement="right"
                    title={t('form.designer.action.setOptionRule')}
                    content={
                      <div style={{ width: 320 }}>
                        <OptionsEditor
                          props={(action.option || {}) as Record<string, any>}
                          onChange={(patch) =>
                            updateAction(ruleIndex, actionIndex, { option: { ...(action.option || {}), ...patch } })
                          }
                        />
                      </div>
                    }
                  >
                    <Button size="small" icon={<SettingOutlined />}>
                      {t('form.designer.action.setOption')}
                    </Button>
                  </Popover>
                )}
                {action.type === 'RF_OPTIONS' && (
                  <Typography.Text type="secondary">{t('form.designer.action.refreshHint')}</Typography.Text>
                )}
                {action.type === 'REQUIRED' && (
                  <Typography.Text>{t('form.designer.action.setRequiredHint')}</Typography.Text>
                )}
                {action.type === 'UN_REQUIRED' && (
                  <Typography.Text>{t('form.designer.action.unRequiredHint')}</Typography.Text>
                )}
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    updateRule(ruleIndex, {
                      actions: (rule.actions || []).filter((_: any, i: number) => i !== actionIndex),
                    })
                  }
                />
              </Space>
            );
          })}
          <div>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => updateRule(ruleIndex, { actions: [...(rule.actions || []), createEmptyAction()] })}
            >
              {t('form.designer.action.addAction')}
            </Button>
          </div>
        </Card>
      ))}

      <Button
        type="primary"
        ghost
        icon={<PlusOutlined />}
        onClick={() => onChange([...rules, { logic: true, conditions: [], actions: [createEmptyAction()] }])}
      >
        {t('form.designer.action.addRule')}
      </Button>
    </div>
  );
};

export interface MountedActionListProps {
  actions: any[];
  onChange: (actions: any[]) => void;
  fields?: any[];
  dsOptions?: DsGroupOption[];
}

const CD_TYPES = [
  { labelKey: 'form.designer.action.cdTypes.fill', value: 'FILL' },
  { labelKey: 'form.designer.action.cdTypes.viewer', value: 'VIEWER' },
  { labelKey: 'form.designer.action.cdTypes.none', value: 'NONE' },
];

/** 表单加载钩子动作编辑器（SET_VALUE + cdType + isDynamic） */
export const MountedActionList: React.FC<MountedActionListProps> = ({ actions = [], onChange, fields = [], dsOptions = [] }) => {
  const { t } = useTranslation();
  const dsVariables = dsOptions.flatMap((group) => group.children.map((child) => ({ label: `${group.label}.${child.label}`, value: child.value })));

  const updateAction = (index: number, delta: Record<string, any>) => {
    onChange(actions.map((action, i) => (i === index ? { ...action, ...delta } : action)));
  };

  return (
    <div>
      {actions.map((action, index) => {
        const field = fields.find((item) => (item.key || item.id) === action.symbol);
        return (
          <Card key={index} size="small" className="fd-rule-card">
            <Space wrap align="center">
              <Select
                style={{ width: 110 }}
                value={action.cdType || 'NONE'}
                options={CD_TYPES.map((item) => ({ label: t(item.labelKey), value: item.value }))}
                onChange={(cdType) => updateAction(index, { cdType })}
              />
              <Select
                style={{ width: 130 }}
                value={action.type || 'SET_VALUE'}
                options={[{ label: t('form.designer.action.setValue'), value: 'SET_VALUE' }]}
                onChange={(type) => updateAction(index, { type })}
              />
              <Select
                style={{ width: 180 }}
                showSearch
                optionFilterProp="label"
                placeholder={t('form.designer.action.selectField')}
                value={action.symbol ?? undefined}
                options={fields
                  .filter((item) => item?.valueType !== 'none')
                  .map((item) => ({ label: fieldLabel(item), value: item.key || item.id }))}
                onChange={(symbol) => updateAction(index, { symbol, value: null })}
              />
              <Checkbox checked={action.isDynamic === true} onChange={(e) => updateAction(index, { isDynamic: e.target.checked, value: null })}>
                {t('form.designer.action.dynamicValue')}
              </Checkbox>
              {action.isDynamic ? (
                <Select
                  style={{ width: 220 }}
                  allowClear
                  placeholder={t('form.designer.action.selectDsVar')}
                  value={action.value ?? undefined}
                  options={dsVariables}
                  onChange={(value) => updateAction(index, { value })}
                />
              ) : (
                <div style={{ width: 220 }}>
                  <DefaultValueInput
                    valueType={field?.valueType}
                    value={action.value}
                    staticOptions={field?.props?.static || field?.props?.options}
                    placeholder={t('form.designer.action.valuePlaceholder')}
                    onChange={(value) => updateAction(index, { value })}
                  />
                </div>
              )}
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onChange(actions.filter((_, i) => i !== index))}
              />
            </Space>
          </Card>
        );
      })}
      <Button
        type="primary"
        ghost
        icon={<PlusOutlined />}
        onClick={() => onChange([...actions, { type: 'SET_VALUE', symbol: null, isDynamic: false, value: null, cdType: 'NONE' }])}
      >
        {t('form.designer.action.addAction')}
      </Button>
    </div>
  );
};

export default ActionListEditor;

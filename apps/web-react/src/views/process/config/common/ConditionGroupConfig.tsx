import React, { useMemo, useState } from 'react';
import { Button, Card, Divider, Empty, Input, Modal, Select, Space, Switch, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { CompareOptions, normalizeValueType, ValueTypes } from '@/utils/ConditionCompare';
import { ConditionValueInput } from '@/components/ConditionValueInput';
import { formatMessage } from '@/utils/i18n';

export interface ConditionGroupConfigProps {
  groups?: any[];
  logic?: boolean;
  onChange: (patch: { groups?: any[]; logic?: boolean }) => void;
  formFields?: any[];
  namePrefix?: string;
  minGroups?: number;
  maxGroups?: number;
}

const fieldLabel = (field: any) => {
  const name = field?.name || field?.title || field?.key || '';
  return field?.parent ? `${field.parent.name}.${name}` : name;
};

const fieldOptions = (field: any): Array<{ label: string; value: any }> => {
  const raw = field?.props?.options || field?.options || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => {
    if (item && typeof item === 'object') {
      return { label: item.label ?? item.name ?? String(item.value ?? ''), value: item.value ?? item.name, ...item };
    }
    return { label: String(item), value: item };
  });
};

const AddConditionModal: React.FC<{
  open: boolean;
  formFields: any[];
  onCancel: () => void;
  onOk: (condition: any) => void;
}> = ({ open, formFields, onCancel, onOk }) => {
  const { t } = useTranslation();
  const [group, setGroup] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [name, setName] = useState<string[]>([]);
  const [valueType, setValueType] = useState<string | null>(null);

  const reset = () => {
    setGroup(null);
    setType(null);
    setSymbol(null);
    setName([]);
    setValueType(null);
  };

  const submit = () => {
    if (!group) {
      message.warning(t('process.condition.selectGroup'));
      return;
    }
    if (group === 'DEV' && !type) {
      message.warning(t('process.condition.selectDevType'));
      return;
    }
    if (group === 'FORM' && !symbol) {
      message.warning(t('process.condition.selectFormField'));
      return;
    }
    if (group === 'INITIATOR' && !type) {
      message.warning(t('process.condition.selectInitiatorProp'));
      return;
    }
    if (group === 'CONTEXT' && !type) {
      message.warning(t('process.condition.selectContext'));
      return;
    }
    onOk({
      group,
      type: group === 'DEV' ? type : group === 'FORM' ? undefined : type,
      symbol,
      name,
      valueType,
      compare: group === 'DEV' ? 'OTHER' : null,
      compareVal: [],
    });
    reset();
  };

  const userFields = useMemo(() => formFields.filter((v) => String(v?.type || '').toLowerCase().includes('user')), [formFields]);
  const deptFields = useMemo(() => formFields.filter((v) => String(v?.type || '').toLowerCase().includes('dept')), [formFields]);
  const conditionFields = useMemo(
    () => formFields.filter((v) => normalizeValueType(v?.valueType) !== ValueTypes.none),
    [formFields]
  );

  return (
    <Modal
      title={t('process.condition.modalTitle')}
      open={open}
      width={640}
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={submit}
      okText={t('process.condition.add')}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Space wrap>
          <Select
            style={{ width: 220 }}
            placeholder={t('process.condition.groupType')}
            value={group}
            onChange={(value) => {
              setGroup(value);
              setType(null);
              setSymbol(null);
              setName([]);
              setValueType(null);
            }}
            options={[
              { label: t('process.condition.initiator'), value: 'INITIATOR' },
              { label: t('process.condition.formField'), value: 'FORM' },
              { label: t('process.condition.context'), value: 'CONTEXT' },
              { label: t('process.condition.devMode'), value: 'DEV' },
            ]}
          />
          {group === 'INITIATOR' && (
            <Select
              style={{ width: 220 }}
              placeholder={t('process.condition.initiatorProp')}
              value={type}
              onChange={(value, option: any) => {
                setType(value);
                setSymbol(value);
                setValueType(value);
                setName([t('process.condition.initiator'), option?.label]);
              }}
              options={[
                { label: t('process.condition.self'), value: 'user' },
                { label: t('process.condition.dept'), value: 'dept' },
                { label: t('process.condition.role'), value: 'role' },
              ]}
            />
          )}
          {group === 'FORM' && (
            <Select
              style={{ width: 300 }}
              placeholder={t('process.condition.formFieldPlaceholder')}
              value={symbol}
              showSearch
              optionFilterProp="label"
              onChange={(value) => {
                const field = formFields.find((v) => (v.key || v.id) === value);
                setSymbol(value);
                setType(field?.type || null);
                setValueType(field?.valueType || 'all');
                setName([t('process.condition.formField'), fieldLabel(field)]);
              }}
              options={conditionFields.map((field) => ({ label: fieldLabel(field), value: field.key || field.id }))}
            />
          )}
          {group === 'CONTEXT' && (
            <Select
              style={{ width: 260 }}
              placeholder={t('process.condition.context')}
              value={type}
              onChange={(value) => {
                setType(value);
                if (value === 'result') {
                  setSymbol('PRE_HANDLER_RESULT');
                  setValueType('result');
                  setName([t('process.condition.context'), t('process.condition.approvalComment')]);
                } else {
                  setSymbol(null);
                  setValueType('all');
                  setName([t('process.condition.context'), t('process.condition.processVar')]);
                }
              }}
              options={[
                { label: t('process.condition.approvalComment'), value: 'result' },
                { label: t('process.condition.processVar'), value: 'variable' },
              ]}
            />
          )}
          {group === 'CONTEXT' && type === 'variable' && (
            <Input
              style={{ width: 220 }}
              placeholder={t('process.condition.variablePlaceholder')}
              value={symbol || ''}
              onChange={(e) => setSymbol(e.target.value)}
              addonAfter={undefined}
            />
          )}
          {group === 'DEV' && (
            <Select
              style={{ width: 220 }}
              placeholder={t('process.condition.devModePlain')}
              value={type}
              onChange={(value, option: any) => {
                setType(value);
                setSymbol(value);
                setName([t('process.condition.devModePlain'), option?.label]);
              }}
              options={[
                { label: t('process.condition.elJudge'), value: 'EL' },
                { label: t('process.condition.jsJudge'), value: 'JS' },
                { label: t('process.condition.httpJudge'), value: 'HTTP' },
              ]}
            />
          )}
        </Space>
        {group === 'FORM' && (
          <Typography.Text type="secondary">
            {t('process.condition.availableFields')}
            {conditionFields.length === 0
              ? t('process.condition.noFormFields')
              : formatMessage(t('process.condition.fieldCount'), { count: conditionFields.length })}
            {userFields.length > 0 && formatMessage(t('process.condition.userFieldCount'), { count: userFields.length })}
            {deptFields.length > 0 && formatMessage(t('process.condition.deptFieldCount'), { count: deptFields.length })}
          </Typography.Text>
        )}
      </Space>
    </Modal>
  );
};

export const ConditionGroupConfig: React.FC<ConditionGroupConfigProps> = ({
  groups = [],
  logic = true,
  onChange,
  formFields = [],
  namePrefix,
  minGroups = 1,
  maxGroups = 4,
}) => {
  const { t } = useTranslation();
  const effectiveNamePrefix = namePrefix || t('process.condition.groupName');
  const [addIndex, setAddIndex] = useState<number | null>(null);

  const updateGroup = (index: number, delta: Record<string, any>) => {
    onChange({ groups: groups.map((group, i) => (i === index ? { ...group, ...delta } : group)) });
  };

  const addGroup = () => {
    if (groups.length >= maxGroups) {
      message.warning(formatMessage(t('process.condition.maxGroups'), { max: maxGroups }));
      return;
    }
    onChange({ groups: [...groups, { logic: true, conditions: [] }] });
  };

  const delGroup = (index: number) => {
    if (groups.length <= minGroups) {
      message.warning(t('process.condition.minGroups'));
      return;
    }
    onChange({ groups: groups.filter((_, i) => i !== index) });
  };

  const addCondition = (index: number, condition: any) => {
    updateGroup(index, { conditions: [...(groups[index].conditions || []), condition] });
  };

  const updateCondition = (groupIndex: number, conditionIndex: number, condition: any) => {
    const conditions = (groups[groupIndex].conditions || []).map((item: any, i: number) => (i === conditionIndex ? condition : item));
    updateGroup(groupIndex, { conditions });
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const conditions = (groups[groupIndex].conditions || []).filter((_: any, i: number) => i !== conditionIndex);
    updateGroup(groupIndex, { conditions });
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={addGroup}>
          {t('process.condition.addGroup')}
        </Button>
        {groups.length > 1 && (
          <Space size={8}>
            <Typography.Text>{t('process.condition.groupLogic')}</Typography.Text>
            <Switch
              checked={logic}
              checkedChildren={t('process.condition.and')}
              unCheckedChildren={t('process.condition.or')}
              onChange={(value) => onChange({ logic: value })}
            />
          </Space>
        )}
      </Space>

      {groups.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('process.condition.noGroups')} />}

      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {groups.map((group, groupIndex) => (
          <Card
            key={groupIndex}
            size="small"
            title={`${effectiveNamePrefix} ${groupIndex + 1}`}
            extra={
              <Space size={12}>
                <Space size={4}>
                  <Typography.Text style={{ fontSize: 12 }}>{t('process.condition.innerLogic')}</Typography.Text>
                  <Switch
                    size="small"
                    checked={group.logic !== false}
                    checkedChildren={t('process.condition.and')}
                    unCheckedChildren={t('process.condition.or')}
                    onChange={(value) => updateGroup(groupIndex, { logic: value })}
                  />
                </Space>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => delGroup(groupIndex)} />
              </Space>
            }
          >
            {(group.conditions || []).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('process.condition.addConditionHint')} style={{ margin: '4px 0' }} />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {(group.conditions || []).map((cd: any, conditionIndex: number) => {
                  const field = formFields.find((item) => (item.key || item.id) === cd.symbol);
                  const options = fieldOptions(field);
                  return (
                    <div key={conditionIndex} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ width: 150, flexShrink: 0, paddingTop: 4 }}>
                        <Typography.Text ellipsis style={{ fontSize: 12 }}>
                          {(cd.name || []).join('-') || cd.symbol || t('process.condition.conditionFallback')}
                        </Typography.Text>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                          <Select
                            style={{ width: 260 }}
                            placeholder={t('process.condition.comparePlaceholder')}
                            value={cd.compare || undefined}
                            onChange={(value) => updateCondition(groupIndex, conditionIndex, { ...cd, compare: value, compareVal: [] })}
                            options={(CompareOptions[normalizeValueType(cd.valueType || cd.type)] || CompareOptions.string).map((op) => ({
                              label: op.name,
                              value: op.symbol,
                            }))}
                          />
                          {cd.compare !== 'EM' && cd.compare !== 'NEM' && (
                            <ConditionValueInput
                              condition={cd}
                              fields={formFields}
                              options={options}
                              variant="process"
                              onChange={(next) => updateCondition(groupIndex, conditionIndex, next)}
                            />
                          )}
                        </Space>
                      </div>
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeCondition(groupIndex, conditionIndex)} />
                    </div>
                  );
                })}
              </Space>
            )}
            <Divider style={{ margin: '10px 0' }} />
            <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setAddIndex(groupIndex)}>
              {t('process.condition.addCondition')}
            </Button>
          </Card>
        ))}
      </Space>

      <AddConditionModal
        open={addIndex !== null}
        formFields={formFields}
        onCancel={() => setAddIndex(null)}
        onOk={(condition) => {
          if (addIndex !== null) addCondition(addIndex, condition);
          setAddIndex(null);
        }}
      />
    </div>
  );
};

export default ConditionGroupConfig;

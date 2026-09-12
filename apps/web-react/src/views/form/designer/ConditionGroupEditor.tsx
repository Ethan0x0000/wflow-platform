import React, { useMemo } from 'react';
import { Button, Divider, Select, Space, Switch, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { CompareOptions, normalizeValueType } from '@/utils/ConditionCompare';
import { useTranslation } from '@/i18n';
import { ConditionValueInput } from '@/components/ConditionValueInput';
import { normalizeStaticOptions } from './DefaultValueInput';
import type { ConditionItem, DsGroupOption } from './types';

export const EMPTY_CONDITION = (): ConditionItem => ({
  type: null,
  valueType: null,
  fieldType: null,
  isDynamic: false,
  symbol: null,
  compare: null,
  compareVal: [],
});

const fieldLabel = (field: any): string => {
  const name = field?.name || field?.title || field?.key || '';
  return field?.parent ? `${field.parent.name}.${name}` : name;
};

export interface ConditionGroupEditorProps {
  conditions: ConditionItem[];
  logic?: boolean;
  onChange: (conditions: ConditionItem[], logic: boolean) => void;
  fields?: any[];
  dsOptions?: DsGroupOption[];
  showChange?: boolean;
}

/** 条件组编辑器：字段/数据源 + 比较符 + 比较值，组内 AND/OR 可切换 */
export const ConditionGroupEditor: React.FC<ConditionGroupEditorProps> = ({
  conditions,
  logic = true,
  onChange,
  fields = [],
  dsOptions = [],
  showChange,
}) => {
  const { t } = useTranslation();
  const flatDs = useMemo(
    () => dsOptions.flatMap((group) => group.children.map((child) => ({ ...child, groupLabel: group.label }))),
    [dsOptions]
  );

  const fieldOptions = useMemo(() => {
    const formOptions = fields
      .filter((field) => normalizeValueType(field?.valueType) !== 'none')
      .map((field) => ({ label: fieldLabel(field), value: field.key || field.id }));
    const groups: Array<{ label: string; options: Array<{ label: string; value: string }> }> = [];
    if (formOptions.length > 0) groups.push({ label: t('form.designer.condition.fieldGroup'), options: formOptions });
    dsOptions.forEach((group) => {
      if (group.children?.length) {
        groups.push({
          label: group.label,
          options: group.children.map((child) => ({ label: child.label, value: child.value })),
        });
      }
    });
    return groups;
  }, [fields, dsOptions, t]);

  const updateCondition = (index: number, next: ConditionItem) => {
    onChange(conditions.map((item, i) => (i === index ? next : item)), logic);
  };

  const handleSelectField = (index: number, value: string) => {
    const field = fields.find((item) => (item.key || item.id) === value);
    if (field) {
      updateCondition(index, {
        ...conditions[index],
        symbol: value,
        type: 'FORM',
        fieldType: field.type,
        valueType: field.valueType,
        name: [t('form.designer.condition.fieldPrefix'), fieldLabel(field)],
        compare: null,
        compareVal: [],
      });
      return;
    }
    const ds = flatDs.find((item) => item.value === value);
    updateCondition(index, {
      ...conditions[index],
      symbol: value,
      type: 'DS',
      fieldType: null,
      valueType: ds?.valueType || 'string',
      name: [t('form.designer.condition.dsPrefix'), ds?.label || value],
      compare: null,
      compareVal: [],
    });
  };

  const compareOptions = (condition: ConditionItem) => {
    const list = CompareOptions[normalizeValueType(condition.valueType || condition.type || undefined)] || CompareOptions.string;
    return showChange ? [{ name: t('form.designer.condition.change'), symbol: 'CHANGE' }, ...list] : list;
  };

  return (
    <div className="fd-condition-group">
      <div className="fd-condition-toolbar">
        {conditions.length > 1 && (
          <Space size={4}>
            <Typography.Text type="secondary">{t('form.designer.condition.logicLabel')}</Typography.Text>
            <Switch
              size="small"
              checked={logic}
              checkedChildren={t('form.designer.condition.and')}
              unCheckedChildren={t('form.designer.condition.or')}
              onChange={(checked) => onChange(conditions, checked)}
            />
          </Space>
        )}
        <Button
          size="small"
          type="link"
          icon={<PlusOutlined />}
          onClick={() => onChange([...conditions, EMPTY_CONDITION()], logic)}
        >
          {t('form.designer.condition.addCondition')}
        </Button>
      </div>

      {conditions.length === 0 && (
        <Typography.Text type="warning">{t('form.designer.condition.noConditions')}</Typography.Text>
      )}

      {conditions.map((condition, index) => {
        const noValue =
          !condition.compare || condition.compare === 'EM' || condition.compare === 'NEM' || condition.compare === 'CHANGE';
        const field = fields.find((item) => (item.key || item.id) === condition.symbol);
        const staticOptions = normalizeStaticOptions(field?.props?.static || field?.props?.options);
        return (
          <div className="fd-condition-row" key={index}>
            <Select
              className="fd-condition-field"
              showSearch
              optionFilterProp="label"
              placeholder={t('form.designer.condition.selectField')}
              value={condition.symbol ?? undefined}
              options={fieldOptions}
              onChange={(value) => handleSelectField(index, value)}
            />
            <Select
              className="fd-condition-op"
              placeholder={t('form.designer.condition.compare')}
              value={condition.compare ?? undefined}
              options={compareOptions(condition).map((op) => ({ label: op.name, value: op.symbol }))}
              onChange={(value) =>
                updateCondition(index, { ...condition, compare: value, compareVal: [] })
              }
            />
            {!noValue && (
              <div className="fd-condition-value">
                <ConditionValueInput
                  condition={condition}
                  fields={fields}
                  options={staticOptions}
                  variant="form"
                  onChange={(next) => updateCondition(index, next)}
                />
              </div>
            )}
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onChange(conditions.filter((_, i) => i !== index), logic)}
            />
            {index < conditions.length - 1 && <Divider className="fd-condition-divider" />}
          </div>
        );
      })}
    </div>
  );
};

export default ConditionGroupEditor;

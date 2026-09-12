import React from 'react';
import { Input, InputNumber, Radio, Select, Space } from 'antd';
import { WOrgTags } from '@/components/WOrgTags';
import { WCodeEditor } from '@/components/WCodeEditor';
import { WExpInput } from '@/components/WExpInput';
import { ProcessHttpConfig } from '@/components/HttpConfigPanel';
import { useTranslation } from '@/i18n';
import { normalizeValueType } from '@/utils/ConditionCompare';

export interface ConditionValueInputProps {
  condition: any;
  fields?: any[];
  /** 由调用方按各自规则归一化后的静态选项 */
  options?: Array<{ label: any; value: any; [key: string]: any }>;
  onChange: (condition: any) => void;
  /** process：流程条件面板（宽控件、差异化按钮文案）；form：表单联动条件（紧凑） */
  variant?: 'process' | 'form';
}

const ORG_BUTTON_TEXT: Record<string, string> = {
  user: 'workspace.org.selectUser',
  dept: 'workspace.org.selectDept',
  role: 'workspace.org.selectRole',
  org: 'workspace.org.selectOrg',
};

/** 条件比较值编辑器：流程条件组与表单联动条件共用实现（超集，默认值/宽度/文案由 variant 控制） */
export const ConditionValueInput: React.FC<ConditionValueInputProps> = ({
  condition,
  fields = [],
  options = [],
  onChange,
  variant = 'form',
}) => {
  const { t } = useTranslation();
  const isProcess = variant === 'process';
  const values: any[] = Array.isArray(condition.compareVal) ? condition.compareVal : [];
  const patch = (delta: Record<string, any>) => onChange({ ...condition, ...delta });
  const valueType = normalizeValueType(condition.valueType || condition.type || undefined);

  if (condition.group === 'DEV') {
    if (condition.type === 'EL') {
      return (
        <WExpInput
          value={values[0] || ''}
          onChange={(next) => patch({ compareVal: [next] })}
          variables={fields.map((field) => ({
            label: field.name || field.key || field.id,
            value: field.key || field.id,
          }))}
          placeholder={t('workspace.condition.elPlaceholder')}
        />
      );
    }
    if (condition.type === 'JS') {
      return (
        <WCodeEditor
          lang="javascript"
          height={140}
          value={values[0] || ''}
          onChange={(next) => patch({ compareVal: [next] })}
        />
      );
    }
    return (
      <ProcessHttpConfig value={values[0] || {}} onChange={(http) => patch({ compareVal: [http] })} showAft />
    );
  }

  const selectWidth = isProcess ? 260 : 220;
  const pairNumberWidth = isProcess ? 120 : 110;
  const singleNumberWidth = isProcess ? 220 : 200;
  const singleTimeWidth = isProcess ? 240 : 210;
  const radioSize = isProcess ? undefined : ('small' as const);

  switch (valueType) {
    case 'user':
    case 'dept':
    case 'role':
    case 'org':
      return (
        <WOrgTags
          type={valueType}
          value={values}
          onChange={(orgs) => patch({ compareVal: orgs })}
          buttonText={isProcess ? t(ORG_BUTTON_TEXT[valueType]) : t('workspace.org.select')}
        />
      );
    case 'orgArray': {
      const pickerType = String(condition.fieldType || condition.type || '').toLowerCase().includes('dept') ? 'dept' : 'user';
      return <WOrgTags type={pickerType} value={values} onChange={(orgs) => patch({ compareVal: orgs })} buttonText={t('workspace.org.select')} />;
    }
    case 'bool':
      return (
        <Radio.Group size={radioSize} value={values[0]} onChange={(e) => patch({ compareVal: [e.target.value] })}>
          <Radio.Button value={true}>{t('workspace.condition.true')}</Radio.Button>
          <Radio.Button value={false}>{t('workspace.condition.false')}</Radio.Button>
        </Radio.Group>
      );
    case 'result':
      return (
        <Radio.Group size={radioSize} value={values[0]} onChange={(e) => patch({ compareVal: [e.target.value] })}>
          <Radio value="agree">{t('workspace.condition.agree')}</Radio>
          <Radio value="reject">{t('workspace.condition.reject')}</Radio>
        </Radio.Group>
      );
    case 'number':
    case 'timeRange':
    case 'dateTimeRange': {
      const unit = valueType === 'timeRange'
        ? t('workspace.condition.hours')
        : valueType === 'dateTimeRange'
          ? t('workspace.condition.days')
          : undefined;
      if (condition.compare === 'BT' || condition.compare === 'CT' || condition.compare === 'NCT') {
        return (
          <Space.Compact>
            <InputNumber
              style={{ width: pairNumberWidth }}
              value={values[0]}
              onChange={(value) => patch({ compareVal: [value, values[1]] })}
            />
            <InputNumber
              style={{ width: pairNumberWidth }}
              value={values[1]}
              onChange={(value) => patch({ compareVal: [values[0], value] })}
            />
          </Space.Compact>
        );
      }
      return isProcess ? (
        <InputNumber
          style={{ width: singleNumberWidth }}
          value={values[0]}
          addonAfter={unit}
          onChange={(value) => patch({ compareVal: [value] })}
        />
      ) : (
        <InputNumber
          style={{ width: singleNumberWidth }}
          value={values[0]}
          suffix={unit}
          onChange={(value) => patch({ compareVal: [value] })}
        />
      );
    }
    case 'time':
    case 'dateTime': {
      if (condition.compare === 'CT' || condition.compare === 'NCT') {
        return (
          <Space.Compact>
            <Input
              style={isProcess ? undefined : { width: 160 }}
              placeholder={valueType === 'time' ? 'HH:mm:ss' : t('workspace.condition.startTime')}
              value={values[0] ?? ''}
              onChange={(e) => patch({ compareVal: [e.target.value, values[1]] })}
            />
            <Input
              style={isProcess ? undefined : { width: 160 }}
              placeholder={valueType === 'time' ? 'HH:mm:ss' : t('workspace.condition.endTime')}
              value={values[1] ?? ''}
              onChange={(e) => patch({ compareVal: [values[0], e.target.value] })}
            />
          </Space.Compact>
        );
      }
      return (
        <Input
          style={{ width: singleTimeWidth }}
          placeholder={valueType === 'time' ? 'HH:mm:ss' : 'YYYY-MM-DD HH:mm:ss'}
          value={values[0] ?? ''}
          onChange={(e) => patch({ compareVal: [e.target.value] })}
        />
      );
    }
    case 'option':
      return (
        <Select
          style={{ width: selectWidth }}
          placeholder={t('workspace.condition.selectCompare')}
          value={condition.compare === 'EQ' || condition.compare === 'NEQ' ? values[0] ?? undefined : values}
          mode={condition.compare === 'EQ' || condition.compare === 'NEQ' ? undefined : 'multiple'}
          options={options}
          onChange={(value) => patch({ compareVal: Array.isArray(value) ? value : [value] })}
        />
      );
    case 'options':
    case 'array':
      if (isProcess) {
        if (valueType === 'options') {
          return (
            <Select
              style={{ width: selectWidth }}
              mode="multiple"
              placeholder={t('workspace.condition.selectPossible')}
              value={values}
              options={options}
              onChange={(value) => patch({ compareVal: value })}
            />
          );
        }
        return (
          <Select
            style={{ width: selectWidth }}
            mode="tags"
            placeholder={t('workspace.condition.inputEnter')}
            value={values}
            onChange={(value) => patch({ compareVal: value })}
          />
        );
      }
      return (
        <Select
          style={{ width: selectWidth }}
          mode={options.length > 0 ? 'multiple' : 'tags'}
          placeholder={t('workspace.condition.selectOrInput')}
          value={values}
          options={options}
          onChange={(value) => patch({ compareVal: value })}
        />
      );
    default:
      if (condition.compare === 'IN' || condition.compare === 'NIN') {
        return (
          <Select
            style={{ width: selectWidth }}
            mode="tags"
            placeholder={t('workspace.condition.inputEnter')}
            value={values}
            onChange={(value) => patch({ compareVal: value })}
          />
        );
      }
      return (
        <Input
          style={{ width: selectWidth }}
          placeholder={t('workspace.condition.inputCompare')}
          value={values[0] ?? ''}
          onChange={(e) => patch({ compareVal: [e.target.value] })}
        />
      );
  }
};

export default ConditionValueInput;

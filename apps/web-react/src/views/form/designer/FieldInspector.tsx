import React from 'react';
import { Divider, Empty, Form, Input, Switch, Tag, Typography } from 'antd';
import type { FormItemConfig } from '@/types/workflow';
import { useTranslation } from '@/i18n';
import { DefaultValueInput } from './DefaultValueInput';
import { TypeConfig } from './TypeConfig';
import { isContainerItem } from './helpers';

const DEFAULT_VALUE_TYPES = ['TextInput', 'TextareaInput', 'NumberInput', 'RichText', 'PhoneNumber', 'IdCard', 'Provinces'];

export interface FieldInspectorProps {
  item: FormItemConfig | null;
  duplicateKeys?: Set<string>;
  onChange: (patch: Partial<FormItemConfig>) => void;
  onChangeProps: (patch: Record<string, any>) => void;
  datasourceOptions?: Array<{ label: string; value: string }>;
}

export const FieldInspector: React.FC<FieldInspectorProps> = ({
  item,
  duplicateKeys,
  onChange,
  onChangeProps,
  datasourceOptions,
}) => {
  const { t } = useTranslation();
  if (!item) {
    return (
      <div className="fd-inspector">
        <div className="fd-panel-title">{t('form.designer.inspector.title')}</div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('form.designer.inspector.selectInCanvas')}
          style={{ marginTop: 60 }}
        />
      </div>
    );
  }

  const props = item.props || {};
  const keyValue = item.key || '';
  const duplicated = Boolean(keyValue && duplicateKeys?.has(keyValue));
  const showPlaceholder = !Array.isArray(props.placeholder);
  const showDefaultValue = DEFAULT_VALUE_TYPES.includes(String(item.type || ''));

  return (
    <div className="fd-inspector">
      <div className="fd-panel-title">
        {t('form.designer.inspector.title')}
        <Tag color={isContainerItem(item) ? 'geekblue' : 'blue'} style={{ marginLeft: 8 }}>
          {item.type}
        </Tag>
      </div>
      <div className="fd-inspector-scroll">
        <Form layout="vertical" size="small">
          <Form.Item label={t('form.designer.inspector.labelName')} style={{ marginBottom: 10 }}>
            <Input
              value={item.name}
              placeholder={t('form.designer.inspector.labelNamePlaceholder')}
              onChange={(e) => onChange({ name: e.target.value, title: e.target.value })}
            />
          </Form.Item>
          <Form.Item
            label={t('form.designer.inspector.fieldKey')}
            style={{ marginBottom: 10 }}
            validateStatus={duplicated ? 'warning' : undefined}
            help={duplicated ? t('form.designer.inspector.fieldKeyDuplicate') : undefined}
          >
            <Input
              value={keyValue}
              placeholder={t('form.designer.inspector.fieldKeyPlaceholder')}
              onChange={(e) => onChange({ key: e.target.value })}
            />
          </Form.Item>
          {showPlaceholder && (
            <Form.Item label={t('form.designer.inspector.placeholder')} style={{ marginBottom: 10 }}>
              <Input
                value={props.placeholder ?? ''}
                placeholder={t('form.designer.inspector.placeholderTip')}
                onChange={(e) => onChangeProps({ placeholder: e.target.value })}
              />
            </Form.Item>
          )}
          <Form.Item label={t('form.designer.inspector.desc')} style={{ marginBottom: 10 }}>
            <Input.TextArea
              rows={2}
              value={props.desc ?? ''}
              placeholder={t('form.designer.inspector.descPlaceholder')}
              onChange={(e) => onChangeProps({ desc: e.target.value })}
            />
          </Form.Item>
          {showDefaultValue && (
            <Form.Item label={t('form.designer.inspector.defaultValue')} style={{ marginBottom: 10 }}>
              <DefaultValueInput
                valueType={item.valueType}
                value={props.defaultValue}
                staticOptions={props.static || props.options}
                placeholder={t('form.designer.inspector.defaultValuePlaceholder')}
                onChange={(defaultValue) => onChangeProps({ defaultValue })}
              />
            </Form.Item>
          )}
          <Form.Item label={t('form.designer.inspector.required')} style={{ marginBottom: 10 }}>
            <Switch checked={props.required === true} onChange={(required) => onChangeProps({ required })} />
          </Form.Item>
          <Form.Item label={t('form.designer.inspector.disable')} style={{ marginBottom: 10 }}>
            <Switch checked={props.disable === true} onChange={(disable) => onChangeProps({ disable })} />
          </Form.Item>
          <Form.Item label={t('form.designer.inspector.hideLabel')} style={{ marginBottom: 10 }}>
            <Switch checked={props.hideLabel === true} onChange={(hideLabel) => onChangeProps({ hideLabel })} />
          </Form.Item>

          <Divider style={{ margin: '4px 0 12px' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('form.designer.inspector.advanced')}
            </Typography.Text>
          </Divider>
          <TypeConfig item={item} onChange={onChange} onChangeProps={onChangeProps} datasourceOptions={datasourceOptions} />
        </Form>
      </div>
    </div>
  );
};

export default FieldInspector;

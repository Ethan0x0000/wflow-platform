import React from 'react';
import { Button, Form, Input, Radio, Select, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { HttpConfigEditor } from './HttpConfigEditor';

export interface OptionsEditorProps {
  props: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  datasourceOptions?: Array<{ label: string; value: string }>;
  showExpanding?: boolean;
}

/** 单选/多选组件的选项源配置（静态/接口/字典/数据源） */
export const OptionsEditor: React.FC<OptionsEditorProps> = ({ props, onChange, datasourceOptions = [] }) => {
  const { t } = useTranslation();
  const optionType = props.optionType || 'static';
  const staticList: any[] = Array.isArray(props.static) ? props.static : [];

  const updateStatic = (index: number, delta: Record<string, any>) => {
    onChange({ static: staticList.map((item, i) => (i === index ? { ...item, ...delta } : item)) });
  };

  return (
    <div className="fd-options-editor">
      <Form.Item label={t('form.designer.options.source')} style={{ marginBottom: 8 }}>
        <Radio.Group
          size="small"
          optionType="button"
          buttonStyle="solid"
          value={optionType}
          onChange={(e) => onChange({ optionType: e.target.value, defaultValue: null })}
        >
          <Radio.Button value="static">{t('form.designer.options.static')}</Radio.Button>
          <Radio.Button value="http">{t('form.designer.options.http')}</Radio.Button>
          <Radio.Button value="dict">{t('form.designer.options.dict')}</Radio.Button>
          <Radio.Button value="datasource">{t('form.designer.options.datasource')}</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {optionType === 'static' && (
        <div className="fd-option-rows">
          {staticList.map((opt, index) => (
            <Space.Compact key={index} style={{ width: '100%', marginBottom: 4 }}>
              <Input
                placeholder={t('form.designer.options.displayName')}
                value={opt.label ?? ''}
                onChange={(e) => updateStatic(index, { label: e.target.value })}
              />
              <Input
                placeholder={t('form.designer.options.boundValue')}
                value={opt.value ?? ''}
                onChange={(e) => updateStatic(index, { value: e.target.value })}
              />
              <Button
                icon={<DeleteOutlined />}
                onClick={() => onChange({ static: staticList.filter((_, i) => i !== index) })}
              />
            </Space.Compact>
          ))}
          <Button
            size="small"
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              const label = t('form.designer.options.optionLabel').replace('{index}', String(staticList.length + 1));
              onChange({ static: [...staticList, { label, value: label }] });
            }}
          >
            {t('form.designer.options.addOption')}
          </Button>
        </div>
      )}

      {optionType === 'dict' && (
        <Input
          placeholder={t('form.designer.options.dictKeyPlaceholder')}
          value={props.dictKey ?? ''}
          onChange={(e) => onChange({ dictKey: e.target.value })}
        />
      )}

      {optionType === 'http' && (
        <HttpConfigEditor
          value={props.http || {}}
          onChange={(http) => onChange({ http })}
          showPath
          showMap
        />
      )}

      {optionType === 'datasource' && (
        <Select
          allowClear
          style={{ width: '100%' }}
          placeholder={t('form.designer.options.selectDsVar')}
          value={props.datasource ?? undefined}
          options={datasourceOptions}
          onChange={(datasource) => onChange({ datasource })}
        />
      )}
    </div>
  );
};

export default OptionsEditor;

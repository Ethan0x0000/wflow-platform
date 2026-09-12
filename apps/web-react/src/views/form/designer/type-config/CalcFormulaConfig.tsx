import React from 'react';
import { Button, Form, Input, InputNumber, Space, Switch, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { WCodeEditor } from '@/components/WCodeEditor';
import { useTranslation } from '@/i18n';
import { item } from './shared';
import type { TypeConfigProps } from './types';

export const CalcFormulaConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const explain: any[] = Array.isArray(props.explain) ? props.explain : [];
  const operators = [
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: '×', value: '*' },
    { label: '÷', value: '/' },
    { label: '(', value: '(' },
    { label: ')', value: ')' },
  ];
  return (
    <>
      {item(t('form.designer.calc.formula'), <Typography.Text type="secondary">{t('form.designer.calc.formulaHint')}</Typography.Text>)}
      <div className="fd-calc-explain">
        {explain.length === 0 && (
          <Typography.Text type="warning">{t('form.designer.calc.noFormula')}</Typography.Text>
        )}
        {explain.map((token, index) => (
          <Space.Compact key={index} style={{ width: '100%', marginBottom: 4 }}>
            <Input
              placeholder={t('form.designer.calc.namePlaceholder')}
              value={token?.label ?? ''}
              onChange={(e) =>
                onChangeProps({ explain: explain.map((t, i) => (i === index ? { ...t, label: e.target.value } : t)) })
              }
            />
            <Input
              placeholder={t('form.designer.calc.valuePlaceholder')}
              value={token?.value ?? ''}
              onChange={(e) =>
                onChangeProps({ explain: explain.map((t, i) => (i === index ? { ...t, value: e.target.value } : t)) })
              }
            />
            <Button
              icon={<DeleteOutlined />}
              onClick={() => onChangeProps({ explain: explain.filter((_, i) => i !== index) })}
            />
          </Space.Compact>
        ))}
        <Space wrap size={4}>
          {operators.map((op) => (
            <Button key={op.value} size="small" onClick={() => onChangeProps({ explain: [...explain, { label: op.label, value: op.value }] })}>
              {op.label}
            </Button>
          ))}
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => onChangeProps({ explain: [...explain, { label: '', value: '' }] })}>
            {t('form.designer.calc.custom')}
          </Button>
        </Space>
      </div>
      {item(
        t('form.designer.calc.precision'),
        <InputNumber
          min={0}
          max={20}
          style={{ width: '100%' }}
          value={props.precision}
          onChange={(precision) => onChangeProps({ precision })}
        />
      )}
      {item(
        t('form.designer.calc.affix'),
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder={t('form.designer.calc.prefix')}
            value={props.prefix ?? ''}
            onChange={(e) => onChangeProps({ prefix: e.target.value })}
          />
          <Input
            placeholder={t('form.designer.calc.suffix')}
            value={props.suffix ?? ''}
            onChange={(e) => onChangeProps({ suffix: e.target.value })}
          />
        </Space.Compact>
      )}
      {item(
        t('form.designer.calc.advancedJs'),
        <Switch checked={props.isCustom === true} onChange={(isCustom) => onChangeProps({ isCustom })} />
      )}
      {props.isCustom && (
        <Form.Item label={t('form.designer.calc.jsCode')} style={{ marginBottom: 10 }}>
          <WCodeEditor
            lang="javascript"
            height={130}
            placeholder="return formData.a * formData.b"
            value={props.jsCode ?? ''}
            onChange={(next) => onChangeProps({ jsCode: next })}
          />
        </Form.Item>
      )}
    </>
  );
};

export default CalcFormulaConfig;

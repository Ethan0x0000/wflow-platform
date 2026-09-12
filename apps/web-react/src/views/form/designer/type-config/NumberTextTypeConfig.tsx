import React from 'react';
import { AutoComplete, Input, InputNumber, Space, Switch } from 'antd';
import { useTranslation } from '@/i18n';
import { colorPicker, item, regOptions } from './shared';
import type { TypeConfigProps } from './types';

export const NumberTextTypeConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps }) => {
  const { t } = useTranslation();
  const p = config.props || {};

  switch (config.type) {
    case 'NumberInput':
      return (
        <>
          {item(
            t('form.designer.numberText.range'),
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                style={{ width: '50%' }}
                placeholder={t('form.designer.numberText.minPlaceholder')}
                value={p.min}
                onChange={(min) => onChangeProps({ min })}
              />
              <InputNumber
                style={{ width: '50%' }}
                placeholder={t('form.designer.numberText.maxPlaceholder')}
                value={p.max}
                onChange={(max) => onChangeProps({ max })}
              />
            </Space.Compact>
          )}
          {item(
            t('form.designer.numberText.precision'),
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={p.precision ?? 0}
              onChange={(precision) => onChangeProps({ precision })}
            />
          )}
        </>
      );
    case 'TextInput':
      return (
        <>
          {item(
            t('form.designer.numberText.lengthRange'),
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                style={{ width: '50%' }}
                placeholder={t('form.designer.numberText.shortest')}
                value={p.length?.[0]}
                onChange={(min) => onChangeProps({ length: [min, p.length?.[1] ?? null] })}
              />
              <InputNumber
                style={{ width: '50%' }}
                placeholder={t('form.designer.numberText.longest')}
                value={p.length?.[1]}
                onChange={(max) => onChangeProps({ length: [p.length?.[0] ?? 0, max] })}
              />
            </Space.Compact>
          )}
          {item(
            t('form.designer.numberText.regex'),
            <Space.Compact direction="vertical" style={{ width: '100%' }}>
              <AutoComplete
                options={regOptions.map((reg) => ({ label: t(reg.labelKey), value: reg.value }))}
                value={p.regex?.exp ?? ''}
                placeholder={t('form.designer.numberText.regexPlaceholder')}
                onChange={(value) => onChangeProps({ regex: { ...(p.regex || {}), exp: value || null } })}
                onSelect={(value: string) => {
                  const reg = regOptions.find((r) => r.value === value);
                  onChangeProps({
                    regex: {
                      exp: value,
                      error: reg
                        ? t('form.designer.numberText.regexErrorTemplate').replace('{label}', t(reg.labelKey))
                        : p.regex?.error ?? null,
                    },
                  });
                }}
              />
              <Input
                placeholder={t('form.designer.numberText.errorTip')}
                value={p.regex?.error ?? ''}
                onChange={(e) => onChangeProps({ regex: { ...(p.regex || {}), error: e.target.value } })}
              />
            </Space.Compact>
          )}
          {item(
            t('form.designer.numberText.allowClear'),
            <Switch checked={p.enableClear === true} onChange={(enableClear) => onChangeProps({ enableClear })} />
          )}
        </>
      );
    case 'TextareaInput':
      return item(
        t('form.designer.numberText.maxChars'),
        <InputNumber
          min={1}
          style={{ width: '100%' }}
          value={p.max ?? 255}
          onChange={(max) => onChangeProps({ max })}
        />
      );
    case 'Score':
      return (
        <>
          {item(
            t('form.designer.numberText.maxScore'),
            <InputNumber
              min={1}
              max={20}
              style={{ width: '100%' }}
              value={p.max ?? 5}
              onChange={(max) => onChangeProps({ max })}
            />
          )}
          {item(
            t('form.designer.numberText.showScore'),
            <Switch checked={p.showScore !== false} onChange={(showScore) => onChangeProps({ showScore })} />
          )}
          {item(
            t('form.designer.numberText.allowHalf'),
            <Switch checked={p.enableHalf === true} onChange={(enableHalf) => onChangeProps({ enableHalf })} />
          )}
          {item(
            t('form.designer.numberText.iconColor'),
            colorPicker(p.color, (color) => onChangeProps({ color }), t('form.designer.preset'))
          )}
          {item(
            t('form.designer.numberText.allowClear'),
            <Switch checked={p.allowClear === true} onChange={(allowClear) => onChangeProps({ allowClear })} />
          )}
        </>
      );
    default:
      return null;
  }
};

export default NumberTextTypeConfig;

import React from 'react';
import { Form, Input, InputNumber, Radio, Select, Switch } from 'antd';
import { useTranslation } from '@/i18n';
import { colorPicker, item } from './shared';
import type { TypeConfigProps } from './types';

export const ContentTypeConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps }) => {
  const { t } = useTranslation();
  const p = config.props || {};

  switch (config.type) {
    case 'Text':
      return (
        <>
          {item(
            t('form.designer.content.theme'),
            <Select
              style={{ width: '100%' }}
              value={p.type || 'text'}
              options={[
                { label: t('form.designer.content.default'), value: 'text' },
                { label: t('form.designer.content.info'), value: 'info' },
                { label: t('form.designer.content.primary'), value: 'primary' },
                { label: t('form.designer.content.success'), value: 'success' },
                { label: t('form.designer.content.warning'), value: 'warning' },
                { label: t('form.designer.content.error'), value: 'error' },
              ]}
              onChange={(type) => onChangeProps({ type })}
            />
          )}
          {item(
            t('form.designer.content.textAlign'),
            <Radio.Group
              size="small"
              optionType="button"
              value={p.align || 'left'}
              onChange={(e) => onChangeProps({ align: e.target.value })}
            >
              <Radio.Button value="left">{t('form.designer.content.left')}</Radio.Button>
              <Radio.Button value="center">{t('form.designer.content.center')}</Radio.Button>
              <Radio.Button value="right">{t('form.designer.content.right')}</Radio.Button>
            </Radio.Group>
          )}
          {item(
            t('form.designer.content.textType'),
            <Select
              style={{ width: '100%' }}
              value={p.tag || 'div'}
              options={[
                { label: t('form.designer.content.heading1'), value: 'h1' },
                { label: t('form.designer.content.heading2'), value: 'h2' },
                { label: t('form.designer.content.heading3'), value: 'h3' },
                { label: t('form.designer.content.heading4'), value: 'h4' },
                { label: t('form.designer.content.normal'), value: 'div' },
                { label: t('form.designer.content.bold'), value: 'b' },
                { label: t('form.designer.content.italic'), value: 'em' },
                { label: t('form.designer.content.underline'), value: 'u' },
                { label: t('form.designer.content.strike'), value: 's' },
              ]}
              onChange={(tag) => onChangeProps({ tag })}
            />
          )}
          <Form.Item label={t('form.designer.content.textContent')} style={{ marginBottom: 10 }}>
            <Input.TextArea
              rows={2}
              value={p.content ?? ''}
              placeholder={t('form.designer.content.textContentPlaceholder')}
              onChange={(e) => onChangeProps({ content: e.target.value })}
            />
          </Form.Item>
        </>
      );
    case 'LabelText':
      return (
        <>
          {item(
            t('form.designer.content.labelColor'),
            colorPicker(p.color, (color) => onChangeProps({ color }), t('form.designer.preset'))
          )}
          {item(
            t('form.designer.content.showBgc'),
            <Switch checked={p.showBgc === true} onChange={(showBgc) => onChangeProps({ showBgc })} />
          )}
        </>
      );
    case 'AlertBlock':
      return (
        <>
          {item(
            t('form.designer.content.theme'),
            <Select
              style={{ width: '100%' }}
              value={p.type || 'primary'}
              options={[
                { label: t('form.designer.content.primary'), value: 'primary' },
                { label: t('form.designer.content.success'), value: 'success' },
                { label: t('form.designer.content.warning'), value: 'warning' },
                { label: t('form.designer.content.error'), value: 'error' },
                { label: t('form.designer.content.info'), value: 'info' },
              ]}
              onChange={(type) => onChangeProps({ type })}
            />
          )}
          <Form.Item label={t('form.designer.content.textContent')} style={{ marginBottom: 10 }}>
            <Input.TextArea
              rows={2}
              value={p.content ?? ''}
              onChange={(e) => onChangeProps({ content: e.target.value })}
            />
          </Form.Item>
          {item(
            t('form.designer.content.hideIcon'),
            <Switch checked={p.hideIcon === true} onChange={(hideIcon) => onChangeProps({ hideIcon })} />
          )}
          {item(
            t('form.designer.content.closable'),
            <Switch checked={p.closable === true} onChange={(closable) => onChangeProps({ closable })} />
          )}
        </>
      );
    case 'Signature':
      return (
        <>
          {item(
            t('form.designer.content.thickness'),
            <InputNumber
              min={1}
              max={10}
              style={{ width: '100%' }}
              value={p.thickness ?? 2}
              onChange={(thickness) => onChangeProps({ thickness })}
            />
          )}
          {item(
            t('form.designer.content.btnText'),
            <Input value={p.btnText ?? ''} onChange={(e) => onChangeProps({ btnText: e.target.value })} />
          )}
          {item(
            t('form.designer.content.strokeColor'),
            colorPicker(p.color, (color) => onChangeProps({ color }), t('form.designer.preset'))
          )}
        </>
      );
    case 'InstQuote':
      return (
        <>
          {item(
            t('form.designer.content.instCode'),
            <Input
              value={p.code ?? ''}
              placeholder={t('form.designer.content.instCodePlaceholder')}
              onChange={(e) => onChangeProps({ code: e.target.value })}
            />
          )}
          {item(
            t('form.designer.content.btnText'),
            <Input value={p.addText ?? ''} onChange={(e) => onChangeProps({ addText: e.target.value })} />
          )}
          {item(
            t('form.designer.content.multiple'),
            <Switch checked={p.multiple === true} onChange={(multiple) => onChangeProps({ multiple })} />
          )}
        </>
      );
    default:
      return null;
  }
};

export default ContentTypeConfig;

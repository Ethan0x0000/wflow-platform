import React from 'react';
import { Form, Input, InputNumber, Radio, Select } from 'antd';
import { WCodeEditor } from '@/components/WCodeEditor';
import { useTranslation } from '@/i18n';
import { item } from './shared';
import type { TypeConfigProps } from './types';

export const UploadTypeConfig: React.FC<TypeConfigProps> = ({ item: config, onChange, onChangeProps }) => {
  const { t } = useTranslation();
  const p = config.props || {};

  switch (config.type) {
    case 'ImageUpload':
      return (
        <>
          {item(
            t('form.designer.upload.maxNumber'),
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              value={p.maxNumber ?? 10}
              onChange={(maxNumber) => onChangeProps({ maxNumber })}
            />
          )}
          {item(
            t('form.designer.upload.maxSize'),
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              value={p.maxSize ?? 5}
              suffix="MB"
              onChange={(maxSize) => onChangeProps({ maxSize })}
            />
          )}
        </>
      );
    case 'FileUpload':
      return (
        <>
          {item(
            t('form.designer.upload.maxNumber'),
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              value={p.maxNumber ?? 10}
              onChange={(maxNumber) => onChangeProps({ maxNumber })}
            />
          )}
          {item(
            t('form.designer.upload.maxSize'),
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              value={p.maxSize ?? 100}
              suffix="MB"
              onChange={(maxSize) => onChangeProps({ maxSize })}
            />
          )}
          {item(
            t('form.designer.upload.fileTypes'),
            <Select
              mode="tags"
              allowClear
              style={{ width: '100%' }}
              placeholder={t('form.designer.upload.fileTypesPlaceholder')}
              value={p.fileTypes || []}
              onChange={(fileTypes) => onChangeProps({ fileTypes })}
            />
          )}
        </>
      );
    case 'Html':
      return (
        <>
          {item(
            t('form.designer.upload.render'),
            <Radio.Group
              size="small"
              optionType="button"
              value={p.render || 'vue'}
              onChange={(e) => onChangeProps({ render: e.target.value })}
            >
              <Radio.Button value="vue">{t('form.designer.upload.htmlEmbed')}</Radio.Button>
              <Radio.Button value="iframe">{t('form.designer.upload.iframe')}</Radio.Button>
            </Radio.Group>
          )}
          {p.render === 'iframe' &&
            item(
              t('form.designer.upload.windowHeight'),
              <InputNumber
                min={20}
                style={{ width: '100%' }}
                value={p.height ?? 200}
                suffix="px"
                onChange={(height) => onChangeProps({ height })}
              />
            )}
          <Form.Item label={t('form.designer.upload.htmlContent')} style={{ marginBottom: 10 }}>
            <WCodeEditor
              lang="html"
              height={140}
              value={p.code ?? ''}
              placeholder={t('form.designer.upload.htmlPlaceholder')}
              onChange={(next) => onChangeProps({ code: next })}
            />
          </Form.Item>
        </>
      );
    case 'WebIframe':
      return (
        <>
          {item(
            t('form.designer.upload.url'),
            <Input
              value={p.url ?? ''}
              placeholder={t('form.designer.upload.urlPlaceholder')}
              onChange={(e) => onChangeProps({ url: e.target.value })}
            />
          )}
          {item(
            t('form.designer.upload.height'),
            <InputNumber
              min={20}
              max={2000}
              style={{ width: '100%' }}
              value={p.height}
              placeholder={t('form.designer.upload.heightPlaceholder')}
              onChange={(height) => onChangeProps({ height })}
            />
          )}
        </>
      );
    case 'VueSfc':
      return (
        <>
          {item(
            t('form.designer.upload.valueType'),
            <Select
              style={{ width: '100%' }}
              value={config.valueType}
              options={['none', 'all', 'option', 'options', 'string', 'number', 'bool', 'time', 'dateTime', 'timeRange', 'dateTimeRange', 'object', 'array', 'org', 'objArray', 'orgArray', 'image', 'imageArray', 'fileArray'].map(
                (type) => ({ label: type, value: type })
              )}
              onChange={(valueType) => onChange({ valueType })}
            />
          )}
          <Form.Item label={t('form.designer.upload.sfcCode')} style={{ marginBottom: 10 }}>
            <WCodeEditor
              lang="vue"
              height={160}
              value={p.sfc ?? ''}
              placeholder="<template>...</template>"
              onChange={(next) => onChangeProps({ sfc: next })}
            />
          </Form.Item>
        </>
      );
    default:
      return null;
  }
};

export default UploadTypeConfig;

import React from 'react';
import { InputNumber, Radio, Switch } from 'antd';
import { useTranslation } from '@/i18n';
import { item } from './shared';
import type { TypeConfigProps } from './types';

export const FormListConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  return (
    <>
      {item(
        t('form.designer.formList.allowPut'),
        <Switch checked={props.allowPut !== false} onChange={(allowPut) => onChangeProps({ allowPut })} />
      )}
      {item(
        t('form.designer.formList.maxSize'),
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          value={props.maxSize ?? 0}
          placeholder={t('form.designer.formList.noLimitPlaceholder')}
          onChange={(maxSize) => onChangeProps({ maxSize })}
        />
      )}
      {item(
        t('form.designer.formList.labelPosition'),
        <Radio.Group
          size="small"
          optionType="button"
          value={props.labelPosition || 'right'}
          onChange={(e) => onChangeProps({ labelPosition: e.target.value })}
        >
          <Radio.Button value="top">{t('form.designer.settingsDrawer.posTop')}</Radio.Button>
          <Radio.Button value="left">{t('form.designer.settingsDrawer.posLeft')}</Radio.Button>
          <Radio.Button value="right">{t('form.designer.settingsDrawer.posRight')}</Radio.Button>
        </Radio.Group>
      )}
      {item(
        t('form.designer.formList.labelWidth'),
        <InputNumber
          min={0}
          style={{ width: '100%' }}
          value={props.labelWidth ?? 100}
          onChange={(labelWidth) => onChangeProps({ labelWidth })}
        />
      )}
      {item(
        t('form.designer.formList.size'),
        <Radio.Group
          size="small"
          optionType="button"
          value={props.size || 'default'}
          onChange={(e) => onChangeProps({ size: e.target.value })}
        >
          <Radio.Button value="large">{t('form.designer.settingsDrawer.sizeLarge')}</Radio.Button>
          <Radio.Button value="default">{t('form.designer.settingsDrawer.sizeDefault')}</Radio.Button>
          <Radio.Button value="small">{t('form.designer.settingsDrawer.sizeSmall')}</Radio.Button>
        </Radio.Group>
      )}
    </>
  );
};

export default FormListConfig;

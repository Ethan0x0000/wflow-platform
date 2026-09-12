import React from 'react';
import { Input, Select, Space, Switch } from 'antd';
import { useTranslation } from '@/i18n';
import { OptionsEditor } from '../OptionsEditor';
import { dateFormats, item, rangeDateFormats } from './shared';
import type { TypeConfigProps } from './types';

export const PickerTypeConfig: React.FC<TypeConfigProps> = ({ item: config, onChangeProps, datasourceOptions }) => {
  const { t } = useTranslation();
  const p = config.props || {};

  switch (config.type) {
    case 'SinglePicker':
    case 'MultiplePicker':
      return (
        <>
          <OptionsEditor props={p} onChange={onChangeProps} datasourceOptions={datasourceOptions} />
          {item(
            t('form.designer.picker.expanding'),
            <Switch checked={p.expanding === true} onChange={(expanding) => onChangeProps({ expanding })} />
          )}
        </>
      );
    case 'DateTimePicker':
      return (
        <>
          {item(
            t('form.designer.picker.format'),
            <Select
              style={{ width: '100%' }}
              value={p.format || 'YYYY-MM-DD HH:mm'}
              options={dateFormats.map((format) => ({ label: t(format.labelKey), value: format.value }))}
              onChange={(format) => onChangeProps({ format })}
            />
          )}
          {item(
            t('form.designer.picker.defaultNow'),
            <Switch checked={p.defaultValue === true} onChange={(defaultValue) => onChangeProps({ defaultValue })} />
          )}
        </>
      );
    case 'DateTimeRangePicker':
      return (
        <>
          {item(
            t('form.designer.picker.format'),
            <Select
              style={{ width: '100%' }}
              value={p.format || 'YYYY-MM-DD'}
              options={rangeDateFormats.map((format) => ({ label: t(format.labelKey), value: format.value }))}
              onChange={(format) => onChangeProps({ format })}
            />
          )}
          {item(
            t('form.designer.picker.placeholder'),
            <Space.Compact direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder={t('form.designer.picker.startDatePlaceholder')}
                value={p.placeholder?.[0] ?? ''}
                onChange={(e) => onChangeProps({ placeholder: [e.target.value, p.placeholder?.[1] ?? ''] })}
              />
              <Input
                placeholder={t('form.designer.picker.endDatePlaceholder')}
                value={p.placeholder?.[1] ?? ''}
                onChange={(e) => onChangeProps({ placeholder: [p.placeholder?.[0] ?? '', e.target.value] })}
              />
            </Space.Compact>
          )}
        </>
      );
    case 'TimePicker':
      return item(
        t('form.designer.picker.defaultNow'),
        <Switch checked={p.defaultValue === true} onChange={(defaultValue) => onChangeProps({ defaultValue })} />
      );
    case 'TimeRangePicker':
      return item(
        t('form.designer.picker.placeholder'),
        <Space.Compact direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder={t('form.designer.picker.startTimePlaceholder')}
            value={p.placeholder?.[0] ?? ''}
            onChange={(e) => onChangeProps({ placeholder: [e.target.value, p.placeholder?.[1] ?? ''] })}
          />
          <Input
            placeholder={t('form.designer.picker.endTimePlaceholder')}
            value={p.placeholder?.[1] ?? ''}
            onChange={(e) => onChangeProps({ placeholder: [p.placeholder?.[0] ?? '', e.target.value] })}
          />
        </Space.Compact>
      );
    case 'UserPicker':
    case 'DeptPicker':
      return item(
        t('form.designer.picker.multiple'),
        <Switch checked={p.multiple === true} onChange={(multiple) => onChangeProps({ multiple })} />
      );
    case 'Provinces':
      return (
        <>
          {item(
            t('form.designer.picker.level'),
            <Select
              style={{ width: '100%' }}
              value={p.level ?? 3}
              options={[
                { label: t('form.designer.picker.province'), value: 1 },
                { label: t('form.designer.picker.provinceCity'), value: 2 },
                { label: t('form.designer.picker.provinceCityDistrict'), value: 3 },
              ]}
              onChange={(level) => onChangeProps({ level })}
            />
          )}
          {item(
            t('form.designer.picker.allowClear'),
            <Switch checked={p.enableClear === true} onChange={(enableClear) => onChangeProps({ enableClear })} />
          )}
        </>
      );
    default:
      return null;
  }
};

export default PickerTypeConfig;

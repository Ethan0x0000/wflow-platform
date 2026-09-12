import type { FC } from 'react';
import { useMemo } from 'react';
import { Cascader, Typography } from 'antd';
import { areaList } from '@vant/area-data';
import { useTranslation } from '@/i18n';
import { isEmpty, useDefaultValue } from '../runtime';
import type { FormComponentProps } from '../types';

interface AreaOption {
  label: string;
  value: string;
  children?: AreaOption[];
}

function buildAreaOptions(level: number): AreaOption[] {
  const provinceList: Record<string, string> = { ...areaList.province_list };
  const cityList: Record<string, string> = { ...areaList.city_list };
  const countyList: Record<string, string> = { ...areaList.county_list };
  const tree: AreaOption[] = [];
  for (const provinceCode in provinceList) {
    const province: AreaOption = {
      label: provinceList[provinceCode],
      value: provinceList[provinceCode],
      children: [],
    };
    if (level >= 2) {
      for (const cityCode in cityList) {
        const diff = Number(cityCode) - Number(provinceCode);
        if (diff > 0 && diff < 10000) {
          const city: AreaOption = {
            label: cityList[cityCode],
            value: cityList[cityCode],
            children: [],
          };
          if (level > 2) {
            for (const countyCode in countyList) {
              const countyDiff = Number(countyCode) - Number(cityCode);
              if (countyDiff > 0 && countyDiff < 100) {
                city.children?.push({ label: countyList[countyCode], value: countyList[countyCode] });
                delete countyList[countyCode];
              }
            }
          } else {
            delete city.children;
          }
          province.children?.push(city);
          delete cityList[cityCode];
        }
      }
    } else {
      delete province.children;
    }
    delete provinceList[provinceCode];
    tree.push(province);
  }
  return tree;
}

export const Provinces: FC<FormComponentProps> = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const level = Math.min(3, Math.max(1, Number(props.level ?? 3) || 3));
  const placeholder = props.placeholder || t('form.component.provinces.placeholder');
  const options = useMemo(() => buildAreaOptions(level), [level]);

  useDefaultValue(config, mode, value, onChange);

  if (mode === 'V') {
    return <Typography.Text>{isEmpty(value) ? '' : String(value)}</Typography.Text>;
  }

  const selected = isEmpty(value) ? [] : String(value).split('-');

  return (
    <Cascader
      style={{ width: '100%' }}
      options={options}
      value={selected}
      placeholder={placeholder}
      displayRender={(labels) => labels.join('-')}
      disabled={mode === 'R'}
      onChange={(next) => onChange(Array.isArray(next) ? next.join('-') : String(next ?? ''))}
    />
  );
};

export default Provinces;

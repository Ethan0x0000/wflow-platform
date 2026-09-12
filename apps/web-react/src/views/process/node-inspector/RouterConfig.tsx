import React from 'react';
import { Form, Radio, Select, Space } from 'antd';
import { useTranslation } from '@/i18n';
import { ConditionGroupConfig } from '../config/common/ConditionGroupConfig';

export interface RouterConfigProps {
  props: any;
  allNodes: any[];
  routerTargets: any[];
  formFields: any[];
  mutate: (fn: (node: any) => void) => void;
}

export const RouterConfig: React.FC<RouterConfigProps> = ({ props, allNodes, routerTargets, formFields, mutate }) => {
  const { t } = useTranslation();
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <Form.Item label={t('process.router.target')} style={{ marginBottom: 0 }}>
        <Select
          placeholder={t('process.router.targetPlaceholder')}
          value={props.target?.id}
          onChange={(value) => {
            const target = allNodes.find((item) => item.id === value) || null;
            mutate((d) => { d.props.target = target; });
          }}
          options={routerTargets.map((item) => ({ label: item.name, value: item.id }))}
        />
      </Form.Item>
      <Form.Item label={t('process.router.mode')} style={{ marginBottom: 0 }}>
        <Radio.Group value={props.hasCondition || false} onChange={(e) => mutate((d) => { d.props.hasCondition = e.target.value; })}>
          <Radio value={false}>{t('process.router.direct')}</Radio>
          <Radio value={true}>{t('process.router.conditional')}</Radio>
        </Radio.Group>
      </Form.Item>
      {props.hasCondition && (
        <ConditionGroupConfig
          groups={props.groups || []}
          logic={props.logic !== false}
          formFields={formFields}
          onChange={(patch) => mutate((d) => { Object.assign(d.props, patch); })}
        />
      )}
    </Space>
  );
};

export default RouterConfig;

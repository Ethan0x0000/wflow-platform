import React from 'react';
import { Form, Input, InputNumber, Radio, Select, Space } from 'antd';
import { useTranslation } from '@/i18n';

export interface WaitingConfigProps {
  props: any;
  mutate: (fn: (node: any) => void) => void;
}

export const WaitingConfig: React.FC<WaitingConfigProps> = ({ props, mutate }) => {
  const { t } = useTranslation();
  return (
    <Form layout="vertical">
      <Form.Item label={t('process.waiting.type')}>
        <Radio.Group value={props.type || 'FIXED'} onChange={(e) => mutate((d) => { d.props.type = e.target.value; })}>
          <Radio value="FIXED">{t('process.waiting.fixed')}</Radio>
          <Radio value="TODAY">{t('process.waiting.today')}</Radio>
          <Radio value="DATETIME">{t('process.waiting.datetime')}</Radio>
          <Radio value="SIGNAL">{t('process.waiting.signal')}</Radio>
        </Radio.Group>
      </Form.Item>
      {props.type === 'FIXED' && (
        <Form.Item label={t('process.waiting.duration')}>
          <Space>
            <InputNumber min={1} value={props.timeout || 1} onChange={(timeout) => mutate((d) => { d.props.timeout = timeout || 1; })} />
            <Select
              style={{ width: 100 }}
              value={props.timeUnit || 'M'}
              onChange={(timeUnit) => mutate((d) => { d.props.timeUnit = timeUnit; })}
              options={[
                { label: t('process.unit.day'), value: 'D' },
                { label: t('process.unit.hour'), value: 'H' },
                { label: t('process.unit.minute'), value: 'M' },
                { label: t('process.unit.second'), value: 'S' },
              ]}
            />
          </Space>
        </Form.Item>
      )}
      {props.type === 'TODAY' && (
        <Form.Item label={t('process.waiting.today')}>
          <Input placeholder="HH:mm:ss" value={props.time || ''} onChange={(e) => mutate((d) => { d.props.time = e.target.value; })} />
        </Form.Item>
      )}
      {props.type === 'DATETIME' && (
        <Form.Item label={t('process.waiting.datetime')}>
          <Input placeholder="YYYY-MM-DD HH:mm:ss" value={props.dateTime || ''} onChange={(e) => mutate((d) => { d.props.dateTime = e.target.value; })} />
        </Form.Item>
      )}
      {props.type === 'SIGNAL' && (
        <Form.Item label={t('process.trigger.signalName')}>
          <Input placeholder={t('process.waiting.signalPlaceholder')} value={props.signal || ''} onChange={(e) => mutate((d) => { d.props.signal = e.target.value; })} />
        </Form.Item>
      )}
    </Form>
  );
};

export default WaitingConfig;

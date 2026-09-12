import React from 'react';
import { Form, Input, Radio } from 'antd';
import { useTranslation } from '@/i18n';
import { HttpConfig } from '../config/common/HttpConfig';

export interface TriggerConfigProps {
  props: any;
  mutate: (fn: (node: any) => void) => void;
}

export const TriggerConfig: React.FC<TriggerConfigProps> = ({ props, mutate }) => {
  const { t } = useTranslation();
  return (
    <Form layout="vertical">
      <Form.Item label={t('process.trigger.type')}>
        <Radio.Group
          value={props.type || 'EL'}
          onChange={(e) =>
            mutate((d) => {
              d.props.type = e.target.value;
              if (e.target.value === 'SIGNAL' && !d.props.signal) {
                d.props.signal = { name: '', scope: 'INSTANCE', code: null, instId: null };
              }
              if (e.target.value === 'HTTP' && !d.props.http) d.props.http = {};
            })
          }
        >
          <Radio value="EL">{t('process.trigger.el')}</Radio>
          <Radio value="JS">{t('process.trigger.js')}</Radio>
          <Radio value="SIGNAL">{t('process.trigger.signal')}</Radio>
          <Radio value="HTTP">{t('process.common.http')}</Radio>
        </Radio.Group>
      </Form.Item>
      {props.type === 'EL' && (
        <Form.Item label={t('process.trigger.elLabel')}>
          <Input placeholder={t('process.common.elPlaceholder')} value={props.el || ''} onChange={(e) => mutate((d) => { d.props.el = e.target.value; })} />
        </Form.Item>
      )}
      {props.type === 'JS' && (
        <Form.Item label={t('process.trigger.jsLabel')}>
          <Input.TextArea
            rows={8}
            value={props.jsCode || ''}
            onChange={(e) => mutate((d) => { d.props.jsCode = e.target.value; })}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </Form.Item>
      )}
      {props.type === 'SIGNAL' && (
        <>
          <Form.Item label={t('process.trigger.signalName')}>
            <Input
              value={props.signal?.name || ''}
              placeholder={t('process.trigger.signalNamePlaceholder')}
              onChange={(e) => mutate((d) => { d.props.signal = { ...d.props.signal, name: e.target.value }; })}
            />
          </Form.Item>
          <Form.Item label={t('process.trigger.signalScope')}>
            <Radio.Group
              value={props.signal?.scope || 'INSTANCE'}
              onChange={(e) => mutate((d) => { d.props.signal = { ...d.props.signal, scope: e.target.value }; })}
            >
              <Radio value="GLOBAL">{t('process.trigger.scopeGlobal')}</Radio>
              <Radio value="PROCESS">{t('process.trigger.scopeProcess')}</Radio>
              <Radio value="LOCAL">{t('process.trigger.scopeLocal')}</Radio>
              <Radio value="INSTANCE">{t('process.trigger.scopeInstance')}</Radio>
            </Radio.Group>
          </Form.Item>
          {props.signal?.scope === 'PROCESS' && (
            <Form.Item label={t('process.trigger.processCode')}>
              <Input
                value={props.signal?.code || ''}
                placeholder={t('process.trigger.processCodePlaceholder')}
                onChange={(e) => mutate((d) => { d.props.signal = { ...d.props.signal, code: e.target.value }; })}
              />
            </Form.Item>
          )}
          {props.signal?.scope === 'INSTANCE' && (
            <Form.Item label={t('process.trigger.processInst')}>
              <Input
                value={props.signal?.instId || ''}
                placeholder={t('process.trigger.processInstPlaceholder')}
                onChange={(e) => mutate((d) => { d.props.signal = { ...d.props.signal, instId: e.target.value }; })}
              />
            </Form.Item>
          )}
        </>
      )}
      {props.type === 'HTTP' && (
        <HttpConfig value={props.http || {}} onChange={(http) => mutate((d) => { d.props.http = http; })} serverMode />
      )}
    </Form>
  );
};

export default TriggerConfig;

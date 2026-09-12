import React from 'react';
import { Checkbox, Divider, InputNumber, Space, Typography } from 'antd';
import { useTranslation } from '@/i18n';
import { EventListenerConfig } from './EventListenerConfig';

export interface EventHandlerConfigProps {
  value?: any;
  onChange?: (value: any) => void;
  type?: string;
}

const defaultEvents = (type?: string) => {
  const events: Record<string, any> = {
    async: true,
    retry: 0,
    enter: [],
    leave: [],
    created: [],
    complete: [],
  };
  if (type !== 'Start') events.calcComplete = [];
  return events;
};

export const EventHandlerConfig: React.FC<EventHandlerConfigProps> = ({ value, onChange, type }) => {
  const { t } = useTranslation();
  const events = value && typeof value === 'object' ? value : defaultEvents(type);

  const patch = (delta: Record<string, any>) => onChange?.({ ...events, ...delta });

  const keys: Array<{ key: string; label: string }> = [
    { key: 'enter', label: t('process.events.enter') },
    { key: 'leave', label: t('process.events.leave') },
    ...(type !== 'Start' ? [{ key: 'calcComplete', label: t('process.events.calcComplete') }] : []),
    { key: 'created', label: t('process.events.created') },
    { key: 'complete', label: t('process.events.complete') },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 8 }} size={24} wrap>
        <Space size={8}>
          <Typography.Text>{t('process.events.rule')}</Typography.Text>
          <Checkbox checked={events.async !== false} onChange={(e) => patch({ async: e.target.checked })}>
            {t('process.events.async')}
          </Checkbox>
        </Space>
        <Space size={8}>
          <Typography.Text>{t('process.events.retry')}</Typography.Text>
          <InputNumber
            min={0}
            max={5}
            precision={0}
            size="small"
            value={events.retry || 0}
            onChange={(retry) => patch({ retry: retry || 0 })}
          />
          <Typography.Text>{t('process.events.times')}</Typography.Text>
        </Space>
      </Space>
      <Divider style={{ margin: '8px 0' }} />
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        {keys.map(({ key, label }) => (
          <EventListenerConfig
            key={key}
            label={label}
            value={Array.isArray(events[key]) ? events[key] : []}
            onChange={(list) => patch({ [key]: list })}
          />
        ))}
      </Space>
    </div>
  );
};

export default EventHandlerConfig;

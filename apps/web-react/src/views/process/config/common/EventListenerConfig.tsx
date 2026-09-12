import React from 'react';
import { Button, Card, Empty, Input, Radio, Space, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { HttpConfig } from './HttpConfig';
import { WCodeEditor } from '@/components/WCodeEditor';

export interface EventListenerConfigProps {
  value?: any[];
  onChange?: (value: any[]) => void;
  label?: string;
  max?: number;
}

export const EventListenerConfig: React.FC<EventListenerConfigProps> = ({ value = [], onChange, label, max = 5 }) => {
  const { t } = useTranslation();
  const list = Array.isArray(value) ? value : [];

  const addAction = () => {
    if (list.length >= max) {
      message.error(formatMessage(t('process.eventListener.max'), { max }));
      return;
    }
    onChange?.([...list, { type: 'NONE', js: null, el: null, http: {} }]);
  };

  const update = (index: number, delta: Record<string, any>) => {
    onChange?.(list.map((item, i) => (i === index ? { ...item, ...delta } : item)));
  };

  const remove = (index: number) => onChange?.(list.filter((_, i) => i !== index));

  return (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        {label && <Typography.Text>{label}</Typography.Text>}
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={addAction}>
          {t('process.eventListener.add')}
        </Button>
      </div>
      {list.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('process.eventListener.empty')} style={{ margin: '8px 0' }} />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {list.map((event, index) => (
            <Card
              key={index}
              size="small"
              title={
                <Radio.Group value={event.type || 'NONE'} onChange={(e) => update(index, { type: e.target.value })}>
                  <Radio value="NONE">{t('process.eventListener.none')}</Radio>
                  <Radio value="EL">{t('process.common.el')}</Radio>
                  <Radio value="JS">{t('process.common.js')}</Radio>
                  <Radio value="HTTP">{t('process.common.http')}</Radio>
                </Radio.Group>
              }
              extra={<Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(index)} />}
            >
              {event.type === 'EL' && (
                <Input
                  placeholder={t('process.eventListener.elPlaceholder')}
                  value={event.el || ''}
                  onChange={(e) => update(index, { el: e.target.value })}
                />
              )}
              {event.type === 'JS' && (
                <WCodeEditor
                  lang="javascript"
                  height={140}
                  value={event.js || ''}
                  onChange={(next) => update(index, { js: next })}
                />
              )}
              {event.type === 'HTTP' && (
                <HttpConfig value={event.http || {}} onChange={(http) => update(index, { http })} showAft />
              )}
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
};

export default EventListenerConfig;

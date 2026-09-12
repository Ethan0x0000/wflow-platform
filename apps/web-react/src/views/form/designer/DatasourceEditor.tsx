import React, { useState } from 'react';
import { Button, Card, Empty, Form, Input, Modal, Select, Space, Switch, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { HttpConfigEditor } from './HttpConfigEditor';
import { randomFieldKey } from '../catalog';

export const emptyDatasource = () => ({
  id: '',
  name: '',
  async: true,
  request: {
    url: null,
    method: 'GET',
    headers: [],
    params: [],
    bodyForms: [],
    data: 'return {}',
    isJson: true,
    preJs: null,
  },
  handler: [] as any[],
});

const VALUE_TYPES = [
  { labelKey: 'form.designer.datasource.valueTypes.string', value: 'string' },
  { labelKey: 'form.designer.datasource.valueTypes.number', value: 'number' },
  { labelKey: 'form.designer.datasource.valueTypes.options', value: 'options' },
];

export interface DatasourceEditorProps {
  value: any[];
  onChange: (next: any[]) => void;
}

/** 全局数据源配置（SIMPLE：名称/标识/HTTP/变量列表） */
export const DatasourceEditor: React.FC<DatasourceEditorProps> = ({ value = [], onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>(emptyDatasource());

  const startAdd = () => {
    const next = emptyDatasource();
    next.id = randomFieldKey('ds');
    setEditIndex(null);
    setDraft(next);
    setOpen(true);
  };

  const startEdit = (index: number) => {
    setEditIndex(index);
    setDraft(JSON.parse(JSON.stringify(value[index])));
    setOpen(true);
  };

  const patchDraft = (delta: Record<string, any>) => setDraft((prev: any) => ({ ...prev, ...delta }));

  const patchRequest = (request: any) => patchDraft({ request });

  const patchHandler = (index: number, delta: Record<string, any>) => {
    patchDraft({ handler: (draft.handler || []).map((item: any, i: number) => (i === index ? { ...item, ...delta } : item)) });
  };

  const confirm = () => {
    if (!String(draft.name || '').trim()) {
      message.warning(t('form.designer.datasource.nameRequired'));
      return;
    }
    if (!String(draft.id || '').trim()) {
      message.warning(t('form.designer.datasource.idRequired'));
      return;
    }
    const next = value.map((item, i) => (i === editIndex ? draft : item));
    onChange(editIndex === null ? [...value, draft] : next);
    setOpen(false);
  };

  return (
    <div>
      {value.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('form.designer.datasource.empty')} />
      )}
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {value.map((ds, index) => (
          <Card
            key={ds.id || index}
            size="small"
            className="fd-ds-card"
            title={
              <Space size={4}>
                <Typography.Text strong>{ds.name || t('form.designer.datasource.unnamed')}</Typography.Text>
                <Tag color={ds.async ? 'orange' : 'green'}>
                  {ds.async ? t('form.designer.datasource.async') : t('form.designer.datasource.sync')}
                </Tag>
              </Space>
            }
            extra={
              <Space size={2}>
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startEdit(index)} />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                />
              </Space>
            }
          >
            <Space size={4} wrap>
              <Tag color="blue">{ds.request?.method || 'GET'}</Tag>
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                {ds.request?.url || t('form.designer.datasource.noUrl')}
              </Typography.Text>
              <Typography.Text type="secondary">
                {t('form.designer.datasource.varCount').replace('{count}', String((ds.handler || []).length))}
              </Typography.Text>
            </Space>
          </Card>
        ))}
      </Space>

      <Button type="primary" ghost icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={startAdd}>
        {t('form.designer.datasource.add')}
      </Button>

      <Modal
        title={editIndex === null ? t('form.designer.datasource.add') : t('form.designer.datasource.edit')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={confirm}
        width={720}
        destroyOnHidden
      >
        <Form layout="vertical" size="small">
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item label={t('form.designer.datasource.name')} style={{ marginBottom: 12, width: 240 }}>
              <Input
                value={draft.name ?? ''}
                placeholder={t('form.designer.datasource.namePlaceholder')}
                onChange={(e) => patchDraft({ name: e.target.value })}
              />
            </Form.Item>
            <Form.Item label={t('form.designer.datasource.id')} style={{ marginBottom: 12, width: 240 }}>
              <Input
                value={draft.id ?? ''}
                placeholder={t('form.designer.datasource.idPlaceholder')}
                onChange={(e) => patchDraft({ id: e.target.value })}
              />
            </Form.Item>
            <Form.Item label={t('form.designer.datasource.asyncExec')} style={{ marginBottom: 12 }}>
              <Switch checked={draft.async !== false} onChange={(async) => patchDraft({ async })} />
            </Form.Item>
          </Space>

          <div className="fd-ds-section-title">{t('form.designer.datasource.requestConfig')}</div>
          <HttpConfigEditor value={draft.request || {}} onChange={patchRequest} showHeaders showParams showBody showPath />

          <div className="fd-ds-section-title">
            {t('form.designer.datasource.variables')}
            <Button
              size="small"
              type="link"
              icon={<PlusOutlined />}
              onClick={() =>
                patchDraft({
                  handler: [...(draft.handler || []), { name: '', value: '', valueType: 'string', jsonPath: '' }],
                })
              }
            >
              {t('form.designer.datasource.addVariable')}
            </Button>
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {(draft.handler || []).map((item: any, index: number) => (
              <Space.Compact key={index} style={{ width: '100%' }}>
                <Input
                  style={{ width: '22%' }}
                  placeholder={t('form.designer.datasource.varName')}
                  value={item.label ?? ''}
                  onChange={(e) => patchHandler(index, { label: e.target.value })}
                />
                <Input
                  style={{ width: '22%' }}
                  placeholder={t('form.designer.datasource.varKey')}
                  value={item.value ?? ''}
                  onChange={(e) => patchHandler(index, { value: e.target.value })}
                />
                <Select
                  style={{ width: 110 }}
                  value={item.valueType || 'string'}
                  options={VALUE_TYPES.map((type) => ({ label: t(type.labelKey), value: type.value }))}
                  onChange={(valueType) => patchHandler(index, { valueType })}
                />
                <Input
                  placeholder={t('form.designer.datasource.jsonPath')}
                  value={item.jsonPath ?? ''}
                  onChange={(e) => patchHandler(index, { jsonPath: e.target.value })}
                />
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => patchDraft({ handler: (draft.handler || []).filter((_: any, i: number) => i !== index) })}
                />
              </Space.Compact>
            ))}
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default DatasourceEditor;

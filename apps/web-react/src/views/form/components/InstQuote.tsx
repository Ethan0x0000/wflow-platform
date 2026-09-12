import type { FC } from 'react';
import { useState } from 'react';
import { Button, Space, Typography, message } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { WInstPicker } from '@/components/WInstPicker';
import { ProcessInstPreview } from '@/views/workspace/subs/ProcessInstPreview';
import { useTranslation } from '@/i18n';
import { isEmpty } from '../runtime';
import type { FormComponentProps } from '../types';

export interface InstQuoteItem {
  label: string;
  value: string;
}

export const InstQuote: FC<FormComponentProps> = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const code = props.code ? String(props.code) : '';
  const addText = props.addText || t('form.component.instQuote.defaultAdd');
  const multiple = props.multiple !== false;
  const placeholder = props.placeholder || '';
  const items: InstQuoteItem[] = Array.isArray(value) ? value : [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const handlePick = (record: any) => {
    const instId = String(record?.instId ?? record?.id ?? '');
    if (!instId) return;
    if (items.some((item) => item.value === instId)) {
      message.warning(t('form.component.instQuote.alreadyAdded'));
      return;
    }
    onChange([
      ...items,
      { value: instId, label: String(record?.title ?? record?.name ?? instId) },
    ]);
    setPickerOpen(false);
  };

  if (isEmpty(code)) {
    return <Typography.Text type="warning">{t('form.component.instQuote.setProcessType')}</Typography.Text>;
  }

  const editable = mode === 'E' || mode === 'D';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {editable && (multiple || items.length === 0) ? (
        <Button icon={<PlusOutlined />} shape="round" onClick={() => setPickerOpen(true)}>
          {addText}
        </Button>
      ) : null}
      {editable && items.length === 0 && placeholder ? (
        <Typography.Text type="secondary">{placeholder}</Typography.Text>
      ) : null}
      {items.map((item, index) => (
        <Space key={`${item.value}-${index}`} size={6}>
          <Typography.Link onClick={() => setPreviewId(item.value)}>{item.label}</Typography.Link>
          {mode === 'E' ? (
            <CloseOutlined
              style={{ fontSize: 12, color: '#8c8c8c', cursor: 'pointer' }}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            />
          ) : null}
        </Space>
      ))}
      <WInstPicker
        open={pickerOpen}
        code={code}
        title={t('form.component.instQuote.pickerTitle')}
        onOk={handlePick}
        onCancel={() => setPickerOpen(false)}
      />
      {previewId ? (
        <ProcessInstPreview open instId={previewId} onClose={() => setPreviewId(null)} />
      ) : null}
    </div>
  );
};

export default InstQuote;

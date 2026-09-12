import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, Space, message } from 'antd';
import { ClearOutlined, EditOutlined } from '@ant-design/icons';
import SignaturePad from 'signature_pad';
import { uploadSign } from '@/api/instance';
import { useTranslation } from '@/i18n';
import { dataUrlToFormData, resUrl } from '@/utils/resource';

export interface WSignatureProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  height?: number;
}

function resizeDataUrl(dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

export const WSignature: React.FC<WSignatureProps> = ({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  height = 260,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const blocked = disabled || readOnly;

  useEffect(() => {
    if (!open || !canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth || 600;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext('2d');
    context?.scale(ratio, ratio);
    padRef.current = new SignaturePad(canvas, {
      penColor: '#000',
      minWidth: 1.5,
      maxWidth: 3.5,
    });
    return () => {
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open, height]);

  const handleClear = () => {
    padRef.current?.clear();
  };

  const handleSave = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await resizeDataUrl(padRef.current.toDataURL('image/png'), 500, 200);
      const formData = dataUrlToFormData(dataUrl, 'sign.png');
      formData.append('isImg', 'true');
      formData.append('isSign', 'true');
      const res = await uploadSign(formData);
      const url = res.data?.url;
      if (url) {
        const next = `${url}${url.includes('?') ? '&' : '?'}isSign=true`;
        onChange?.(next);
        message.success(t('workspace.sign.saved'));
        setOpen(false);
      } else {
        message.error(t('workspace.sign.uploadFailed'));
      }
    } catch (err: any) {
      message.error(err?.msg || t('workspace.sign.uploadFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={resUrl(value)}
            alt={t('workspace.sign.alt')}
            onClick={() => !blocked && setOpen(true)}
            style={{
              maxHeight: Math.min(height, 100),
              maxWidth: 240,
              border: '1px solid #e8e8e8',
              borderRadius: 4,
              padding: 4,
              backgroundColor: '#fff',
              cursor: blocked ? 'default' : 'pointer',
            }}
          />
          {!blocked && (
            <Button size="small" icon={<EditOutlined />} onClick={() => setOpen(true)}>
              {t('workspace.sign.reSign')}
            </Button>
          )}
        </div>
      ) : (
        <Button icon={<EditOutlined />} disabled={blocked} onClick={() => setOpen(true)}>
          {t('workspace.sign.clickToSign')}
        </Button>
      )}

      <Modal
        title={t('workspace.sign.title')}
        open={open}
        width={660}
        destroyOnHidden
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText={t('workspace.sign.use')}
        cancelText={t('common.cancel')}
        footer={
          <Space>
            <Button icon={<ClearOutlined />} onClick={handleClear}>
              {t('workspace.sign.clear')}
            </Button>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              {t('workspace.sign.use')}
            </Button>
          </Space>
        }
      >
        <div style={{ border: '1px dashed #bbb', borderRadius: 4, background: '#fafafa', marginTop: 12 }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height }} />
        </div>
      </Modal>
    </div>
  );
};

export default WSignature;

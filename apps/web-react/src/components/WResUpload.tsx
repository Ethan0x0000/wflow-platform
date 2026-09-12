import React, { useRef } from 'react';
import { Button, Space, Tooltip, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import {
  CloseCircleFilled,
  DownloadOutlined,
  FileOutlined,
  PaperClipOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import request from '@/api/request';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { downloadResUrl, resUrl } from '@/utils/resource';

export interface ResFile {
  id: string;
  name: string;
  url: string;
  size?: number;
  isImage?: boolean;
}

export interface WResUploadValue {
  images?: ResFile[];
  files?: ResFile[];
}

export interface WResUploadProps {
  value?: WResUploadValue;
  onChange?: (value: { images: ResFile[]; files: ResFile[] }) => void;
  disabled?: boolean;
  compact?: boolean;
}

const MAX_IMAGE_COUNT = 5;
const MAX_FILE_COUNT = 5;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_FILE_SIZE_MB = 100;

export const WResUpload: React.FC<WResUploadProps> = ({
  value,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  const valueRef = useRef<WResUploadValue>(value || {});
  valueRef.current = value || {};

  const images = value?.images || [];
  const files = value?.files || [];

  const update = (next: { images: ResFile[]; files: ResFile[] }) => {
    valueRef.current = next;
    onChange?.(next);
  };

  const appendRes = (resource: ResFile, isImage: boolean) => {
    const current = valueRef.current || {};
    const nextImages = [...(current.images || [])];
    const nextFiles = [...(current.files || [])];
    if (isImage) {
      nextImages.push(resource);
    } else {
      nextFiles.push(resource);
    }
    update({ images: nextImages, files: nextFiles });
  };

  const removeRes = (isImage: boolean, index: number) => {
    const current = valueRef.current || {};
    const nextImages = [...(current.images || [])];
    const nextFiles = [...(current.files || [])];
    if (isImage) {
      nextImages.splice(index, 1);
    } else {
      nextFiles.splice(index, 1);
    }
    update({ images: nextImages, files: nextFiles });
  };

  const createUpload = (isImage: boolean): UploadProps['customRequest'] => async (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file as Blob);
    formData.append('isImg', String(isImage));
    try {
      const res = await request<ResFile>({ url: '/res', method: 'post', data: formData });
      const result = res.data;
      if (result?.id) {
        appendRes(result, isImage);
        message.success(formatMessage(t('workspace.upload.success'), { name: result.name }));
        onSuccess?.(result);
      } else {
        message.error(formatMessage(t('workspace.upload.failedDetail'), { msg: res.msg || '' }));
        onError?.(new Error(res.msg || t('workspace.upload.failed')));
      }
    } catch (err: any) {
      message.error(formatMessage(t('workspace.upload.failedDetail'), { msg: err?.msg || err?.message || '' }));
      onError?.(err instanceof Error ? err : new Error(String(err?.msg || err || '')));
    }
  };

  const createBeforeUpload = (isImage: boolean): UploadProps['beforeUpload'] => (file, batch) => {
    const list = (isImage ? valueRef.current?.images : valueRef.current?.files) || [];
    const maxCount = isImage ? MAX_IMAGE_COUNT : MAX_FILE_COUNT;
    const batchCount = Array.isArray(batch) ? batch.length : 1;
    if (list.length + batchCount > maxCount) {
      message.warning(t('workspace.upload.maxCount'));
      return Upload.LIST_IGNORE;
    }
    const limit = isImage ? MAX_IMAGE_SIZE_MB : MAX_FILE_SIZE_MB;
    if (file.size / 1024 / 1024 > limit) {
      message.warning(
        formatMessage(
          isImage ? t('workspace.upload.imageMax') : t('workspace.upload.fileMax'),
          { size: limit }
        )
      );
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const imageUploadProps: UploadProps = {
    multiple: true,
    accept: 'image/*',
    showUploadList: false,
    disabled,
    customRequest: createUpload(true),
    beforeUpload: createBeforeUpload(true),
  };

  const fileUploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    disabled,
    customRequest: createUpload(false),
    beforeUpload: createBeforeUpload(false),
  };

  const resetStyle: React.CSSProperties = {
    position: 'absolute',
    top: -6,
    right: -6,
    cursor: 'pointer',
    background: '#fff',
    borderRadius: '50%',
    color: '#ff4d4f',
    fontSize: 14,
    lineHeight: 1,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: compact ? 4 : 8, width: '100%' }}>
      <Space wrap size={[6, 6]} style={{ flex: 1 }}>
        {images.map((img, index) => (
          <div
            key={img.id || `image-${index}`}
            style={{ position: 'relative', width: 50, height: 40, borderRadius: 5, overflow: 'hidden' }}
          >
            <Tooltip title={img.name}>
              <img
                src={resUrl(img.url, { zip: 'true' })}
                alt={img.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => window.open(resUrl(img.url), '_blank')}
              />
            </Tooltip>
            {!disabled && (
              <CloseCircleFilled style={resetStyle} onClick={() => removeRes(true, index)} />
            )}
          </div>
        ))}
        {files.map((file, index) => (
          <div
            key={file.id || `file-${index}`}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              maxWidth: 180,
              height: 40,
              padding: '0 8px',
              borderRadius: 5,
              background: '#f5f5f5',
            }}
          >
            <FileOutlined style={{ color: '#1677ff' }} />
            <Typography.Text
              ellipsis
              style={{ maxWidth: compact ? 60 : 110, fontSize: 12, cursor: 'pointer' }}
              onClick={() => window.open(downloadResUrl(file.url, file.name), '_blank')}
            >
              {file.name}
            </Typography.Text>
            <DownloadOutlined
              style={{ color: '#8c8c8c', cursor: 'pointer' }}
              onClick={() => window.open(downloadResUrl(file.url, file.name), '_blank')}
            />
            {!disabled && (
              <CloseCircleFilled style={resetStyle} onClick={() => removeRes(false, index)} />
            )}
          </div>
        ))}
      </Space>
      <Space size={compact ? 0 : 4}>
        <Upload {...imageUploadProps}>
          <Button size="small" type="text" icon={<PictureOutlined />} disabled={disabled} title={t('workspace.upload.imageTip')} />
        </Upload>
        <Upload {...fileUploadProps}>
          <Button size="small" type="text" icon={<PaperClipOutlined />} disabled={disabled} title={t('workspace.upload.fileTip')} />
        </Upload>
      </Space>
    </div>
  );
};

export default WResUpload;

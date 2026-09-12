import type { FC } from 'react';
import { useMemo, useRef } from 'react';
import { Image, Typography, Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '@/api/request';
import { useTranslation } from '@/i18n';
import { resUrl } from '@/utils/resource';
import { useDefaultValue } from '../runtime';
import type { FormComponentProps } from '../types';

export interface ResFile {
  id: string;
  name: string;
  url: string;
  size?: number;
  isImage?: boolean;
}

export const ImageUpload: FC<FormComponentProps> = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const maxSize = Number(props.maxSize ?? 5);
  const maxNumber = Number(props.maxNumber ?? 10);
  const placeholder = props.placeholder || t('form.component.upload.imagePlaceholder');
  const list: ResFile[] = Array.isArray(value) ? (value as ResFile[]) : [];
  const listRef = useRef(list);
  listRef.current = list;

  useDefaultValue(config, mode, value, onChange);

  const fileList: UploadFile[] = useMemo(
    () =>
      list.map((file, index) => ({
        uid: `${file.id || file.name || 'image'}-${index}`,
        name: file.name || t('form.component.upload.imageName').replace('{index}', String(index + 1)),
        status: 'done' as const,
        url: resUrl(file.url, { zip: 'true' }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list]
  );

  const beforeUpload: UploadProps['beforeUpload'] = (file, batch) => {
    const current = listRef.current.length;
    const batchCount = Array.isArray(batch) ? batch.length : 1;
    if (current + batchCount > maxNumber) {
      message.warning(t('form.component.upload.maxCount'));
      return Upload.LIST_IGNORE;
    }
    if (!file.type || !file.type.startsWith('image/')) {
      message.warning(t('form.component.upload.unsupportedImage'));
      return Upload.LIST_IGNORE;
    }
    if (maxSize > 0 && file.size / 1024 / 1024 > maxSize) {
      message.warning(t('form.component.upload.imageMaxSize').replace('{size}', String(maxSize)));
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file as Blob);
    formData.append('isImg', 'true');
    try {
      const res = await request<ResFile>({ url: '/res', method: 'post', data: formData });
      const uploaded = res?.data;
      if (uploaded?.id) {
        const next = [...listRef.current, uploaded];
        listRef.current = next;
        onChange(next);
        message.success(t('form.component.upload.uploadSuccess').replace('{name}', String(uploaded.name)));
        onSuccess?.(uploaded);
      } else {
        const failMsg = res?.msg || '';
        message.error(t('form.component.upload.uploadFailed').replace('{msg}', String(failMsg)));
        onError?.(new Error(res?.msg || t('form.component.upload.uploadFailedShort')));
      }
    } catch (err: any) {
      message.error(t('form.component.upload.uploadFailed').replace('{msg}', String(err?.msg || err?.message || '')));
      onError?.(err instanceof Error ? err : new Error(String(err?.msg || err || '')));
    }
  };

  const handleRemove: UploadProps['onRemove'] = (file) => {
    const index = fileList.findIndex((item) => item.uid === file.uid);
    if (index > -1) {
      const next = listRef.current.filter((_, i) => i !== index);
      listRef.current = next;
      onChange(next);
    }
    return true;
  };

  if (mode === 'R' || mode === 'V') {
    if (!list.length) return <Typography.Text type="secondary">-</Typography.Text>;
    if (mode === 'V') {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {list.map((file, index) => (
            <img
              key={`${file.id || file.name || 'image'}-${index}`}
              src={resUrl(file.url, { zip: 'true' })}
              alt={file.name}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
            />
          ))}
        </div>
      );
    }
    return (
      <Image.PreviewGroup>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {list.map((file, index) => (
            <Image
              key={`${file.id || file.name || 'image'}-${index}`}
              src={resUrl(file.url, { zip: 'true' })}
              alt={file.name}
              width={80}
              height={80}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          ))}
        </div>
      </Image.PreviewGroup>
    );
  }

  const sizeTip = maxSize > 0 ? t('form.component.upload.imageSizeTip').replace('{size}', String(maxSize)) : '';

  return (
    <div>
      <Upload
        listType="picture-card"
        accept="image/*"
        multiple={maxNumber > 1}
        fileList={fileList}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        onRemove={handleRemove}
      >
        {list.length < maxNumber ? (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 4 }}>{t('form.component.upload.uploadText')}</div>
          </div>
        ) : null}
      </Upload>
      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
        {placeholder}
        {sizeTip ? ` | ${sizeTip}` : ''}
      </Typography.Text>
    </div>
  );
};

export default ImageUpload;

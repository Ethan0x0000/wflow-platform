import type { FC } from 'react';
import { useMemo, useRef } from 'react';
import { Button, Tag, Typography, Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { FileOutlined, PaperClipOutlined } from '@ant-design/icons';
import request from '@/api/request';
import { useTranslation } from '@/i18n';
import { downloadResUrl, resUrl } from '@/utils/resource';
import { useDefaultValue } from '../runtime';
import type { FormComponentProps } from '../types';
import type { ResFile } from './ImageUpload';

function formatSize(size?: number): string {
  if (!size || size <= 0) return '';
  if (size > 1048576) return `${(size / 1048576).toFixed(1)}MB`;
  if (size > 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${size}B`;
}

function normalizeType(type: string): string {
  const trimmed = String(type || '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

export const FileUpload: FC<FormComponentProps> = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const maxSize = Number(props.maxSize ?? 100);
  const maxNumber = Number(props.maxNumber ?? 10);
  const fileTypes: string[] = (Array.isArray(props.fileTypes) ? props.fileTypes : [])
    .map(normalizeType)
    .filter(Boolean);
  const placeholder = props.placeholder || t('form.component.upload.filePlaceholder');
  const files: ResFile[] = Array.isArray(value) ? (value as ResFile[]) : [];
  const filesRef = useRef(files);
  filesRef.current = files;

  useDefaultValue(config, mode, value, onChange);

  const fileList: UploadFile[] = useMemo(
    () =>
      files.map((file, index) => ({
        uid: `${file.id || file.name || 'file'}-${index}`,
        name: file.name || t('form.component.upload.fileName').replace('{index}', String(index + 1)),
        status: 'done' as const,
        size: file.size,
        url: resUrl(file.url),
        response: file,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files]
  );

  const beforeUpload: UploadProps['beforeUpload'] = (file, batch) => {
    const current = filesRef.current.length;
    const batchCount = Array.isArray(batch) ? batch.length : 1;
    if (current + batchCount > maxNumber) {
      message.warning(t('form.component.upload.maxFiles').replace('{max}', String(maxNumber)));
      return Upload.LIST_IGNORE;
    }
    if (maxSize > 0 && file.size / 1024 / 1024 > maxSize) {
      message.warning(t('form.component.upload.fileMaxSize').replace('{size}', String(maxSize)));
      return Upload.LIST_IGNORE;
    }
    const hasExt = file.name.includes('.');
    const ext = hasExt ? normalizeType(`.${file.name.split('.').pop() || ''}`) : '';
    if (fileTypes.length && !fileTypes.includes(ext)) {
      message.warning(t('form.component.upload.fileTypeUnsupported').replace('{name}', String(ext || file.name)));
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file as Blob);
    formData.append('isImg', 'false');
    try {
      const res = await request<ResFile>({ url: '/res', method: 'post', data: formData });
      const uploaded = res?.data;
      if (uploaded?.id) {
        const next = [...filesRef.current, uploaded];
        filesRef.current = next;
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
      const next = filesRef.current.filter((_, i) => i !== index);
      filesRef.current = next;
      onChange(next);
    }
    return true;
  };

  const handlePreview: UploadProps['onPreview'] = (file) => {
    const target = (file.response as ResFile | undefined) || filesRef.current.find((item) => item.name === file.name);
    if (target?.url) window.open(downloadResUrl(target.url, target.name), '_blank');
  };

  if (mode === 'R' || mode === 'V') {
    if (!files.length) return <Typography.Text type="secondary">-</Typography.Text>;
    return (
      <div>
        {files.map((file, index) => {
          const sizeText = formatSize(file.size);
          return (
            <div key={`${file.id || file.name || 'file'}-${index}`} style={{ marginBottom: 4 }}>
              <Typography.Link onClick={() => window.open(downloadResUrl(file.url, file.name), '_blank')}>
                <FileOutlined /> {file.name}
              </Typography.Link>
              {sizeText ? <Tag style={{ marginLeft: 6 }}>{sizeText}</Tag> : null}
            </div>
          );
        })}
      </div>
    );
  }

  const sizeTip = fileTypes.length
    ? t('form.component.upload.fileSizeTipWithTypes')
        .replace('{types}', fileTypes.join('、'))
        .replace('{size}', String(maxSize))
    : maxSize > 0
      ? t('form.component.upload.fileSizeTip').replace('{size}', String(maxSize))
      : '';

  return (
    <div style={{ width: '100%' }}>
      <Upload
        fileList={fileList}
        multiple={maxNumber > 1}
        accept={fileTypes.join(',') || undefined}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        onRemove={handleRemove}
        onPreview={handlePreview}
      >
        <Button icon={<PaperClipOutlined />} shape="round">
          {t('form.component.upload.chooseFile')}
        </Button>
      </Upload>
      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
        {placeholder}
        {sizeTip}
      </Typography.Text>
    </div>
  );
};

export default FileUpload;

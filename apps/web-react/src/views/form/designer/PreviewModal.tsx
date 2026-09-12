import React, { useState } from 'react';
import { Alert, Modal, Radio, Segmented, Space, Typography } from 'antd';
import { MobileOutlined, MonitorOutlined } from '@ant-design/icons';
import type { FormItemConfig } from '@/types/workflow';
import { useTranslation } from '@/i18n';

type TranslateFn = (key: string, fallback?: string) => string;
import { isMasterCell, toGrid } from '../components/table-layout-utils';
import { isContainerItem, isListContainer, isSpanLayout, isTableLayout } from './helpers';

export interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  value: { conf?: Record<string, any>; components?: FormItemConfig[] };
}

const placeholderText = (item: FormItemConfig, t: TranslateFn): string => {
  const props = item.props || {};
  const ph = props.placeholder;
  if (Array.isArray(ph)) return ph.filter(Boolean).join(' ~ ') || t('form.designer.canvas.pickPlaceholder');
  if (ph) return String(ph);
  return t('form.catalog.inputPlaceholder').replace('{name}', String(item.name ?? ''));
};

const renderStaticValue = (item: FormItemConfig, t: TranslateFn) => {
  const props = item.props || {};
  switch (item.type) {
    case 'LabelText':
      return (
        <div
          className="fd-preview-label-text"
          style={{ color: props.color, background: props.showBgc ? `${props.color}1a` : undefined }}
        >
          {props.placeholder || item.name}
        </div>
      );
    case 'AlertBlock':
      return <Alert type={props.type === 'text' ? 'info' : props.type || 'info'} message={props.content} showIcon={!props.hideIcon} />;
    case 'Text':
      return <div style={{ textAlign: props.align || 'left' }}>{props.content || t('form.designer.canvas.staticText')}</div>;
    case 'Html':
      return <div dangerouslySetInnerHTML={{ __html: String(props.code || '') }} />;
    case 'ImageUpload':
      return <Typography.Text type="secondary">{t('form.designer.previewModal.noImage')}</Typography.Text>;
    case 'FileUpload':
      return <Typography.Text type="secondary">{t('form.designer.previewModal.noFile')}</Typography.Text>;
    case 'Signature':
      return (
        <Typography.Text type="secondary">
          {props.btnText || t('form.component.signature.defaultBtn')}
        </Typography.Text>
      );
    case 'Score':
      return t('form.designer.previewModal.scoreMax').replace('{max}', String(props.max ?? 5));
    default:
      if (props.defaultValue !== undefined && props.defaultValue !== null && props.defaultValue !== '') {
        return String(Array.isArray(props.defaultValue) ? props.defaultValue.join('、') : props.defaultValue);
      }
      return <Typography.Text type="secondary">{placeholderText(item, t)}</Typography.Text>;
  }
};

const renderPreviewList = (items: FormItemConfig[], t: TranslateFn): React.ReactNode =>
  items.map((item) => {
    if (!isContainerItem(item)) {
      return (
        <div className="fd-preview-field" key={item.id}>
          <div className="fd-preview-label">
            {item.name}
            {item.props?.required === true && <span style={{ color: '#ff4d4f' }}> *</span>}
          </div>
          <div className="fd-preview-value">{renderStaticValue(item, t)}</div>
        </div>
      );
    }
    if (isSpanLayout(item)) {
      const columns: any[] = Array.isArray(item.props?.columns) ? item.props.columns : [];
      const number = Math.max(1, Number(item.props?.number) || columns.length || 2);
      return (
        <div className="fd-preview-span" key={item.id} style={{ gap: item.props?.gutter || 0 }}>
          {Array.from({ length: number }).map((_, index) => (
            <div className="fd-preview-span-col" key={index}>
              {renderPreviewList(Array.isArray(columns[index]) ? columns[index] : [], t)}
            </div>
          ))}
        </div>
      );
    }
    if (isTableLayout(item)) {
      const grid = toGrid(item.props || {});
      return (
        <table className="fd-preview-table" key={item.id}>
          <colgroup>
            {grid.widths.map((width, index) => (
              <col key={`preview-col-${index}`} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <tbody>
            {grid.columns.map((row, ri) => (
              <tr key={ri} style={{ height: grid.heights[ri] }}>
                {row.map((cell, ci) => {
                  const span = grid.cellSpans[ri]?.[ci];
                  if (!isMasterCell(span)) return null;
                  return (
                    <td key={ci} colSpan={span.col} rowSpan={span.row}>
                      {renderPreviewList(Array.isArray(cell) ? cell : [], t)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (isListContainer(item)) {
      const columns: FormItemConfig[] = Array.isArray(item.props?.columns) ? item.props.columns : [];
      return (
        <div className="fd-preview-formlist" key={item.id}>
          <div className="fd-preview-formlist-title">{item.name}</div>
          {columns.map((column) => (
            <div className="fd-preview-field" key={column.id}>
              <div className="fd-preview-label">{column.name}</div>
              <div className="fd-preview-value">{renderStaticValue(column, t)}</div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="fd-preview-field" key={item.id}>
        <div className="fd-preview-label">{item.name}</div>
        <div className="fd-preview-value">
          <Typography.Text type="secondary">
            {t('form.designer.previewModal.component').replace('{type}', String(item.type))}
          </Typography.Text>
        </div>
      </div>
    );
  });

export const PreviewModal: React.FC<PreviewModalProps> = ({ open, onClose, value }) => {
  const { t } = useTranslation();
  const [device, setDevice] = useState<'pc' | 'mb'>('pc');
  const [mode, setMode] = useState<'E' | 'R' | 'V'>('E');
  const components = Array.isArray(value.components) ? value.components : [];
  const width = device === 'pc' ? '100%' : 375;

  return (
    <Modal
      title={t('form.designer.previewModal.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={device === 'pc' ? 820 : 480}
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <Segmented
          value={device}
          onChange={(next) => setDevice(next as 'pc' | 'mb')}
          options={[
            { label: t('form.designer.pc'), value: 'pc', icon: <MonitorOutlined /> },
            { label: t('form.designer.mb'), value: 'mb', icon: <MobileOutlined /> },
          ]}
        />
        <Radio.Group size="small" value={mode} onChange={(e) => setMode(e.target.value)}>
          <Radio.Button value="E">{t('form.designer.previewModal.editMode')}</Radio.Button>
          <Radio.Button value="R">{t('form.designer.previewModal.readMode')}</Radio.Button>
          <Radio.Button value="V">{t('form.designer.previewModal.viewMode')}</Radio.Button>
        </Radio.Group>
        <Typography.Text type="secondary">{t('form.designer.previewModal.note')}</Typography.Text>
      </Space>
      {components.length === 0 ? (
        <Alert type="warning" message={t('form.designer.previewModal.empty')} showIcon />
      ) : (
        <div className="fd-preview-wrap">
          <div className="fd-preview-canvas" style={{ width }}>
            {renderPreviewList(components, t)}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PreviewModal;

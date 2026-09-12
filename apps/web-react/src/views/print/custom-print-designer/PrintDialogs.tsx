import React from 'react';
import { ColorPicker, Input, InputNumber, Modal, Select, Switch, message } from 'antd';
import { useTranslation } from '@/i18n';
import { FONT_TYPES } from '../printConfig';
import type { LinkState, PromptState, WatermarkState } from './useCustomPrintDesigner';

export interface PrintDialogsProps {
  watermarkOpen: boolean;
  onCancelWatermark: () => void;
  watermark: WatermarkState;
  setWatermark: React.Dispatch<React.SetStateAction<WatermarkState>>;
  onInsertWatermark: () => void;
  linkOpen: boolean;
  onCancelLink: () => void;
  link: LinkState;
  setLink: React.Dispatch<React.SetStateAction<LinkState>>;
  onInsertLinkOk: () => void;
  codeblockOpen: boolean;
  onCancelCodeblock: () => void;
  codeblockContent: string;
  setCodeblockContent: React.Dispatch<React.SetStateAction<string>>;
  onInsertCodeblock: () => void;
  promptState: PromptState;
  setPromptState: React.Dispatch<React.SetStateAction<PromptState>>;
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
}

export const PrintDialogs: React.FC<PrintDialogsProps> = ({
  watermarkOpen,
  onCancelWatermark,
  watermark,
  setWatermark,
  onInsertWatermark,
  linkOpen,
  onCancelLink,
  link,
  setLink,
  onInsertLinkOk,
  codeblockOpen,
  onCancelCodeblock,
  codeblockContent,
  setCodeblockContent,
  onInsertCodeblock,
  promptState,
  setPromptState,
  promptValue,
  setPromptValue,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        title={t('print.designer.dialog.watermark.title')}
        open={watermarkOpen}
        onCancel={onCancelWatermark}
        onOk={onInsertWatermark}
        okText={t('print.common.insert')}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{t('print.designer.dialog.watermark.preview')}</div>
          <div style={{ fontFamily: watermark.font, fontSize: watermark.size, color: watermark.color }}>{watermark.data}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>{t('print.designer.dialog.watermark.content')}</div>
          <Input
            value={watermark.data}
            onChange={(e) => setWatermark((w) => ({ ...w, data: e.target.value }))}
            placeholder={t('print.designer.dialog.watermark.contentPlaceholder')}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>{t('print.designer.dialog.watermark.font')}</div>
          <Select
            style={{ width: '100%' }}
            value={watermark.font}
            onChange={(value) => setWatermark((w) => ({ ...w, font: value }))}
            options={FONT_TYPES.map((ft) => ({ value: ft.value, label: <span style={{ fontFamily: ft.value }}>{t(ft.labelKey)}</span> }))}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>{t('print.designer.dialog.watermark.size')}</div>
          <InputNumber min={5} max={50} value={watermark.size} onChange={(v) => setWatermark((w) => ({ ...w, size: Number(v) || 5 }))} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>{t('print.designer.dialog.watermark.color')}</div>
          <ColorPicker value={watermark.color} onChangeComplete={(color) => setWatermark((w) => ({ ...w, color: color.toHexString() }))} />
        </div>
        <div>
          <span style={{ marginRight: 8 }}>{t('print.designer.dialog.watermark.repeat')}</span>
          <Switch checked={watermark.repeat} onChange={(checked) => setWatermark((w) => ({ ...w, repeat: checked }))} />
        </div>
      </Modal>

      <Modal
        title={t('print.designer.dialog.link.title')}
        open={linkOpen}
        onCancel={onCancelLink}
        onOk={onInsertLinkOk}
        okText={t('print.common.confirm')}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>{t('print.designer.dialog.link.text')}</div>
          <Input
            value={link.label}
            onChange={(e) => setLink((l) => ({ ...l, label: e.target.value }))}
            placeholder={t('print.designer.dialog.link.textPlaceholder')}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>{t('print.designer.dialog.link.url')}</div>
          <Input value={link.url} onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))} placeholder={t('print.designer.dialog.link.urlPlaceholder')} />
        </div>
      </Modal>

      <Modal
        title={t('print.designer.dialog.codeblock.title')}
        open={codeblockOpen}
        onCancel={onCancelCodeblock}
        onOk={onInsertCodeblock}
        okText={t('print.common.insert')}
        width={620}
        destroyOnHidden
      >
        <Input.TextArea
          rows={10}
          value={codeblockContent}
          onChange={(e) => setCodeblockContent(e.target.value)}
          placeholder={t('print.designer.dialog.codeblock.placeholder')}
          style={{ fontFamily: 'Consolas, Monaco, monospace' }}
        />
      </Modal>

      <Modal
        title={promptState.title}
        open={promptState.open}
        onCancel={() => setPromptState((s) => ({ ...s, open: false }))}
        onOk={() => {
          if (!promptState.pattern.test(promptValue)) {
            message.error(promptState.error);
            return;
          }
          promptState.onOk(promptValue);
          setPromptState((s) => ({ ...s, open: false }));
        }}
        okText={t('print.common.confirm')}
        destroyOnHidden
      >
        <Input value={promptValue} onChange={(e) => setPromptValue(e.target.value)} placeholder={promptState.placeholder} />
      </Modal>
    </>
  );
};

export default PrintDialogs;

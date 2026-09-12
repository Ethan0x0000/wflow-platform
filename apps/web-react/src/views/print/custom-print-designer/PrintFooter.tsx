import React from 'react';
import { Button, Dropdown } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { PaperDirection } from '@hufe921/canvas-editor';
import { useTranslation } from '@/i18n';
import { PAGE_PADDING, PAGE_SIZES } from '../printConfig';
import { IconBtn } from './IconBtn';
import { interpolate } from './helpers';
import type { PrintCmd } from './types';

export interface PrintFooterProps {
  wordCount: number;
  pageNo: number;
  pageCount: number;
  scale: number;
  onScale: (zoom: number) => void;
  cmd: PrintCmd;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ wordCount, pageNo, pageCount, scale, onScale, cmd }) => {
  const { t } = useTranslation();
  const pageSizeMenu = {
    items: PAGE_SIZES.map((ps, i) => ({ key: String(i), label: t(ps.labelKey) })),
    onClick: ({ key }: { key: string }) => {
      const ps = PAGE_SIZES[Number(key)];
      if (ps) cmd('executePaperSize', ps.value[0], ps.value[1]);
    },
  };
  const pageDirMenu = {
    items: [
      { key: 'h', label: t('print.designer.footer.landscape') },
      { key: 'v', label: t('print.designer.footer.portrait') },
    ],
    onClick: ({ key }: { key: string }) => cmd('executePaperDirection', key === 'h' ? PaperDirection.HORIZONTAL : PaperDirection.VERTICAL),
  };
  const pagePaddingMenu = {
    items: PAGE_PADDING.map((pd, i) => ({ key: String(i), label: t(pd.labelKey) })),
    onClick: ({ key }: { key: string }) => {
      const pd = PAGE_PADDING[Number(key)];
      if (pd) cmd('executeSetPaperMargin', pd.size);
    },
  };

  return (
    <div className="w-print-designer-footer">
      <span>{interpolate(t('print.designer.footer.pageInfo'), { page: pageNo, total: pageCount, words: wordCount })}</span>
      <span>{t('print.designer.footer.editMode')}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <IconBtn title={t('print.designer.footer.zoomOut')} onClick={() => onScale(-0.1)}>
          <ZoomOutOutlined />
        </IconBtn>
        <span>{Math.round(scale * 100)}%</span>
        <IconBtn title={t('print.designer.footer.zoomIn')} onClick={() => onScale(0.1)}>
          <ZoomInOutlined />
        </IconBtn>
        <Dropdown menu={pageSizeMenu} trigger={['click']}>
          <Button size="small" type="text">
            {t('print.designer.footer.paper')}
          </Button>
        </Dropdown>
        <Dropdown menu={pageDirMenu} trigger={['click']}>
          <Button size="small" type="text">
            {t('print.designer.footer.direction')}
          </Button>
        </Dropdown>
        <Dropdown menu={pagePaddingMenu} trigger={['click']}>
          <Button size="small" type="text">
            {t('print.designer.footer.margin')}
          </Button>
        </Dropdown>
      </span>
    </div>
  );
};

export default PrintFooter;

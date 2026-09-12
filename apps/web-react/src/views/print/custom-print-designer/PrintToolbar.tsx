import React, { useState } from 'react';
import { Button, Checkbox, ColorPicker, Dropdown, Input, Popover, Tooltip } from 'antd';
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BarcodeOutlined,
  BoldOutlined,
  BgColorsOutlined,
  ClearOutlined,
  CodeOutlined,
  ColumnWidthOutlined,
  DashOutlined,
  DeleteOutlined,
  ExportOutlined,
  FileWordOutlined,
  FontSizeOutlined,
  ItalicOutlined,
  LinkOutlined,
  MenuOutlined,
  MinusOutlined,
  OrderedListOutlined,
  PartitionOutlined,
  PictureOutlined,
  PrinterOutlined,
  SearchOutlined,
  QrcodeOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UploadOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { ListStyle, ListType } from '@hufe921/canvas-editor';
import { useTranslation } from '@/i18n';
import { FONT_SIZES, FONT_TITLES, FONT_TYPES, LINE_MARGINS } from '../printConfig';
import { IconBtn } from './IconBtn';
import { FONT_FAMILY_ITEM, interpolate } from './helpers';
import type { PrintCmd, SearchFlags, SearchInfo } from './types';

export interface PrintToolbarProps {
  cmd: PrintCmd;
  selected: any;
  searchInfo: SearchInfo | null;
  onInsertImgCode: (isQr: boolean) => void;
  onInsertImage: () => void;
  onUploadImage: () => void;
  onImportDoc: () => void;
  onOpenWatermark: () => void;
  onOpenLink: () => void;
  onOpenCodeblock: () => void;
  onInsertDiagram: () => void;
  onSearch: (value: string, flags: SearchFlags) => void;
  onSearchNavigate: (direction: 'pre' | 'next') => void;
  onReplace: (value: string) => void;
  onReplaceAll: (value: string) => void;
}

export const PrintToolbar: React.FC<PrintToolbarProps> = ({
  cmd,
  selected,
  searchInfo,
  onInsertImgCode,
  onInsertImage,
  onUploadImage,
  onImportDoc,
  onOpenWatermark,
  onOpenLink,
  onOpenCodeblock,
  onInsertDiagram,
  onSearch,
  onSearchNavigate,
  onReplace,
  onReplaceAll,
}) => {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regexEnable, setRegexEnable] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tablePos, setTablePos] = useState({ x: 0, y: 0 });

  const searchFlags: SearchFlags = { caseSensitive, regex: regexEnable };

  const fontType = FONT_TYPES.find((v) => v.value === selected.font);
  const fontSize = FONT_SIZES.find((v) => v.value === selected.size);
  const fontTitle = FONT_TITLES.find((v) => v.value === selected.level);
  const fontTypeLabel = fontType ? t(fontType.labelKey) : '?';
  const fontSizeLabel = fontSize ? t(fontSize.labelKey) : '?';
  const fontTitleLabel = fontTitle ? t(fontTitle.labelKey) : '?';

  const fontMenu = {
    items: FONT_TYPES.map((ft) => FONT_FAMILY_ITEM(ft.value, t(ft.labelKey))),
    onClick: ({ key }: { key: string }) => cmd('executeFont', key),
  };
  const sizeMenu = {
    items: FONT_SIZES.map((fs) => ({ key: String(fs.value), label: t(fs.labelKey) })),
    onClick: ({ key }: { key: string }) => cmd('executeSize', Number(key)),
  };
  const titleMenu = {
    items: FONT_TITLES.map((ft, i) => ({ key: String(i), label: t(ft.labelKey) })),
    onClick: ({ key }: { key: string }) => cmd('executeTitle', FONT_TITLES[Number(key)].value),
  };
  const listMenu = {
    items: [
      { key: 'ol', label: t('print.designer.toolbar.list.ordered') },
      { key: 'checkbox', label: t('print.designer.toolbar.list.checkbox') },
      { key: 'square', label: t('print.designer.toolbar.list.square') },
      { key: 'decimal', label: t('print.designer.toolbar.list.decimal') },
      { key: 'circle', label: t('print.designer.toolbar.list.circle') },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'ol') cmd('executeList', ListType.OL, ListStyle.DISC);
      else if (key === 'checkbox') cmd('executeList', ListType.UL, ListStyle.CHECKBOX);
      else if (key === 'square') cmd('executeList', ListType.UL, ListStyle.SQUARE);
      else if (key === 'decimal') cmd('executeList', ListType.UL, ListStyle.DECIMAL);
      else cmd('executeList', ListType.UL, ListStyle.CIRCLE);
    },
  };
  const separatorMenu = {
    items: [
      { key: 'solid', label: t('print.designer.toolbar.separator.solid') },
      { key: 'dot', label: t('print.designer.toolbar.separator.dot') },
      { key: 'dash', label: t('print.designer.toolbar.separator.dash') },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'solid') cmd('executeSeparator', [0, 0]);
      else if (key === 'dot') cmd('executeSeparator', [1, 1]);
      else cmd('executeSeparator', [3, 1]);
    },
  };
  const lineMarginMenu = {
    items: LINE_MARGINS.map((v) => ({ key: String(v), label: String(v) })),
    onClick: ({ key }: { key: string }) => cmd('executeRowMargin', Number(key)),
  };
  const watermarkMenu = {
    items: [
      { key: 'add', label: t('print.designer.toolbar.watermark.add') },
      { key: 'del', label: t('print.designer.toolbar.watermark.delete') },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'add') onOpenWatermark();
      else cmd('executeDeleteWatermark');
    },
  };
  const imageMenu = {
    items: [
      { key: 'net', label: t('print.designer.toolbar.image.insertUrl') },
      { key: 'local', label: t('print.designer.toolbar.image.upload') },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'net') onInsertImage();
      else onUploadImage();
    },
  };
  const tableGrid = (
    <div>
      <div style={{ marginBottom: 6, fontSize: 12 }}>
        {interpolate(t('print.designer.toolbar.table.gridText'), { row: tablePos.y, col: tablePos.x })}
      </div>
      <table className="w-print-table-grid" onMouseLeave={() => setTablePos({ x: 0, y: 0 })}>
        <tbody>
          {Array.from({ length: 10 }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: 10 }, (_, c) => (
                <td
                  key={c}
                  className={tablePos.x >= c + 1 && tablePos.y >= r + 1 ? 'on' : ''}
                  onMouseOver={() => setTablePos({ x: c + 1, y: r + 1 })}
                  onClick={() => {
                    cmd('executeInsertTable', r + 1, c + 1);
                    setTableOpen(false);
                  }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const searchPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 390 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input
          size="small"
          value={searchValue}
          placeholder={t('print.designer.search.placeholder')}
          allowClear
          onChange={(e) => {
            setSearchValue(e.target.value);
            if (!e.target.value) onSearch('', searchFlags);
          }}
          onPressEnter={() => onSearch(searchValue, searchFlags)}
        />
        <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>
          {searchInfo ? `${searchInfo.index || '-'} / ${searchInfo.count}` : '0 / 0'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          size="small"
          value={replaceValue}
          placeholder={t('print.designer.search.replacePlaceholder')}
          onChange={(e) => setReplaceValue(e.target.value)}
          onPressEnter={() => onReplace(replaceValue)}
        />
        <Button size="small" onClick={() => onReplace(replaceValue)}>
          {t('print.designer.search.replace')}
        </Button>
        <Button size="small" onClick={() => onReplaceAll(replaceValue)}>
          {t('print.designer.search.replaceAll')}
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)}>
          {t('print.designer.search.caseSensitive')}
        </Checkbox>
        <Checkbox checked={regexEnable} onChange={(e) => setRegexEnable(e.target.checked)}>
          {t('print.designer.search.regex')}
        </Checkbox>
        <Button size="small" type="primary" onClick={() => onSearch(searchValue, searchFlags)}>
          {t('print.designer.search.find')}
        </Button>
        <Button size="small" onClick={() => onSearchNavigate('pre')}>
          {t('print.designer.search.previous')}
        </Button>
        <Button size="small" onClick={() => onSearchNavigate('next')}>
          {t('print.designer.search.next')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-print-designer-toolbar">
      <IconBtn title={t('print.designer.toolbar.undo')} disabled={!selected.undo} onClick={() => cmd('executeUndo')}>
        <UndoOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.redo')} disabled={!selected.redo} onClick={() => cmd('executeRedo')}>
        <RedoOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.painter')} active={selected.painter} onClick={() => cmd('executePainter')}>
        <ClearOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.clearFormat')} onClick={() => cmd('executeFormat')}>
        <DeleteOutlined />
      </IconBtn>
      <span className="w-tool-sep" />
      <Dropdown menu={fontMenu} trigger={['click']}>
        <Button size="small" type="text">
          {fontTypeLabel}
        </Button>
      </Dropdown>
      <Dropdown menu={sizeMenu} trigger={['click']}>
        <Button size="small" type="text">
          {fontSizeLabel}
        </Button>
      </Dropdown>
      <IconBtn title={t('print.designer.toolbar.fontSizeAdd')} onClick={() => cmd('executeSizeAdd')}>
        <FontSizeOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.fontSizeMinus')} onClick={() => cmd('executeSizeMinus')}>
        <DashOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.bold')} active={!!selected.bold} onClick={() => cmd('executeBold')}>
        <BoldOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.italic')} active={!!selected.italic} onClick={() => cmd('executeItalic')}>
        <ItalicOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.underline')} active={!!selected.underline} onClick={() => cmd('executeUnderline')}>
        <UnderlineOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.strikeout')} active={!!selected.strikeout} onClick={() => cmd('executeStrikeout')}>
        <StrikethroughOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.superscript')} active={!!selected.superscript} onClick={() => cmd('executeSuperscript')}>
        <VerticalAlignTopOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.subscript')} active={!!selected.subscript} onClick={() => cmd('executeSubscript')}>
        <VerticalAlignBottomOutlined />
      </IconBtn>
      <Tooltip title={t('print.designer.toolbar.fontColor')}>
        <span style={{ display: 'inline-flex', padding: '0 4px' }}>
          <ColorPicker
            size="small"
            value={selected.color || '#000000'}
            onChangeComplete={(color) => cmd('executeColor', color.toHexString())}
          />
        </span>
      </Tooltip>
      <Tooltip title={t('print.designer.toolbar.backgroundColor')}>
        <span style={{ display: 'inline-flex', padding: '0 4px' }}>
          <ColorPicker size="small" value={selected.highlight || '#ffffff'} onChangeComplete={(color) => cmd('executeHighlight', color.toHexString())} />
        </span>
      </Tooltip>
      <Dropdown menu={titleMenu} trigger={['click']}>
        <Button size="small" type="text">
          {fontTitleLabel}
        </Button>
      </Dropdown>
      <IconBtn title={t('print.designer.toolbar.alignLeft')} onClick={() => cmd('executeRowFlex', 'left')}>
        <AlignLeftOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.alignCenter')} onClick={() => cmd('executeRowFlex', 'center')}>
        <AlignCenterOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.alignRight')} onClick={() => cmd('executeRowFlex', 'right')}>
        <AlignRightOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.justify')} onClick={() => cmd('executeRowFlex', 'alignment')}>
        <MenuOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.distribute')} onClick={() => cmd('executeRowFlex', 'justify')}>
        <ColumnWidthOutlined />
      </IconBtn>
      <Dropdown menu={lineMarginMenu} trigger={['click']}>
        <Button size="small" type="text">
          {t('print.designer.toolbar.lineMargin')}
        </Button>
      </Dropdown>
      <Dropdown menu={listMenu} trigger={['click']}>
        <Button size="small" type="text" icon={<OrderedListOutlined />} />
      </Dropdown>
      <span className="w-tool-sep" />
      <Popover content={tableGrid} trigger="click" open={tableOpen} onOpenChange={setTableOpen}>
        <span className="w-print-icon-btn">
          <TableOutlined />
        </span>
      </Popover>
      <Dropdown menu={imageMenu} trigger={['click']}>
        <Button size="small" type="text" icon={<PictureOutlined />} />
      </Dropdown>
      <IconBtn title={t('print.designer.toolbar.insertLink')} onClick={onOpenLink}>
        <LinkOutlined />
      </IconBtn>
      <Dropdown menu={separatorMenu} trigger={['click']}>
        <Button size="small" type="text" icon={<MinusOutlined />} />
      </Dropdown>
      <Dropdown menu={watermarkMenu} trigger={['click']}>
        <Button size="small" type="text" icon={<BgColorsOutlined />} />
      </Dropdown>
      <IconBtn title={t('print.designer.toolbar.insertPageBreak')} onClick={() => cmd('executePageBreak')}>
        <ExportOutlined />
      </IconBtn>
      <span className="w-tool-sep" />
      <IconBtn title={t('print.designer.toolbar.importWord')} onClick={onImportDoc}>
        <UploadOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.exportWord')} onClick={() => cmd('executeExportDocx', { fileName: t('print.designer.toolbar.exportFileName') })}>
        <FileWordOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.insertBarcode')} onClick={() => onInsertImgCode(false)}>
        <BarcodeOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.insertQrcode')} onClick={() => onInsertImgCode(true)}>
        <QrcodeOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.insertCodeblock')} onClick={onOpenCodeblock}>
        <CodeOutlined />
      </IconBtn>
      <IconBtn title={t('print.designer.toolbar.insertDiagram')} onClick={onInsertDiagram}>
        <PartitionOutlined />
      </IconBtn>
      <span className="w-tool-sep" />
      <Popover trigger="click" open={searchOpen} onOpenChange={setSearchOpen} content={searchPanel}>
        <button type="button" className="w-print-icon-btn" title={t('print.designer.toolbar.searchReplace')}>
          <SearchOutlined />
        </button>
      </Popover>
      <IconBtn title={t('print.designer.toolbar.printPreview')} onClick={() => cmd('executePrint')}>
        <PrinterOutlined />
      </IconBtn>
    </div>
  );
};

export default PrintToolbar;

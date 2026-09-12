import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Editor, { ControlType, ElementType, ImageDisplay, splitText } from '@hufe921/canvas-editor';
import floatingToolbarPlugin from '@hufe921/canvas-editor-plugin-floating-toolbar';
import barcode1DPlugin from '@hufe921/canvas-editor-plugin-barcode1d';
import barcode2DPlugin from '@hufe921/canvas-editor-plugin-barcode2d';
import codeblockPlugin from '@hufe921/canvas-editor-plugin-codeblock';
import docxPlugin from '@hufe921/canvas-editor-plugin-docx';
import diagramPlugin from '@hufe921/canvas-editor-plugin-diagram';
import { message } from 'antd';
import { t as translate, useTranslation } from '@/i18n';
import { ValueType } from '@/views/form/valueType';
import {
  CanvasEditorConfig,
  FONT_TYPES,
  NODE_RECORD_COLUMNS,
  TD_BGC,
  defaultCanvasConfig,
} from '../printConfig';
import {
  buildSearchOption,
  computeInsertSize,
  extractDiagramSvg,
  parseSvgSize,
  svgToDataUrl,
  svgToPngDataUrl,
} from './advancedBlocks';
import type { PrintDesignerHandle, SearchFlags, SearchInfo } from './types';

export interface PromptState {
  open: boolean;
  title: string;
  placeholder: string;
  pattern: RegExp;
  error: string;
  onOk: (value: string) => void;
}

export interface WatermarkState {
  data: string;
  color: string;
  size: number;
  font: string;
  repeat: boolean;
}

export interface LinkState {
  label: string;
  url: string;
}

export interface UseCustomPrintDesignerOptions {
  ref: React.ForwardedRef<PrintDesignerHandle>;
  config?: CanvasEditorConfig;
  formFields: any[];
}

export function useCustomPrintDesigner({ ref, config, formFields = [] }: UseCustomPrintDesignerOptions) {
  const { t } = useTranslation();
  const printerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<any>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [selected, setSelected] = useState<any>({ undo: false, redo: false, painter: false, color: '#000000', highlight: null, font: 'Microsoft YaHei', size: 16, level: null });

  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkState>({ data: '', color: '#000000', size: 50, font: FONT_TYPES[0].value, repeat: false });
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState<LinkState>({ label: '', url: '' });
  const [promptState, setPromptState] = useState<PromptState>({ open: false, title: '', placeholder: '', pattern: /.*/, error: '', onOk: () => undefined });
  const [promptValue, setPromptValue] = useState('');
  const [codeblockOpen, setCodeblockOpen] = useState(false);
  const [codeblockContent, setCodeblockContent] = useState('');
  const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const searchKeywordRef = useRef('');
  const searchFlagsRef = useRef<SearchFlags>({ caseSensitive: false, regex: false });

  const fieldGroups = useMemo(() => {
    const systemFields = [
      { name: t('print.designer.field.instId'), type: 'text', valueType: ValueType.string, symbol: 'instId' },
      { name: t('print.designer.field.instUserName'), type: 'text', valueType: ValueType.string, symbol: 'instUserName' },
      { name: t('print.designer.field.instDeptName'), type: 'text', valueType: ValueType.string, symbol: 'instDeptName' },
      { name: t('print.designer.field.instName'), type: 'text', valueType: ValueType.string, symbol: 'instName' },
      { name: t('print.designer.field.instTitle'), type: 'text', valueType: ValueType.string, symbol: 'instTitle' },
      { name: t('print.designer.field.instCode'), type: 'text', valueType: ValueType.string, symbol: 'instCode' },
      { name: t('print.designer.field.instCreateTime'), type: 'text', valueType: ValueType.string, symbol: 'instCreateTime' },
      { name: t('print.designer.field.instEndTime'), type: 'text', valueType: ValueType.string, symbol: 'instEndTime' },
      { name: t('print.designer.field.instStatusName'), type: 'text', valueType: ValueType.string, symbol: 'instStatusName' },
      { name: t('print.designer.field.instVer'), type: 'text', valueType: ValueType.string, symbol: 'instVer' },
      { name: t('print.designer.field.instQrCode'), type: 'instQr', valueType: ValueType.image, symbol: 'instIdQrCode' },
      { name: t('print.designer.field.instPrintTime'), type: 'text', valueType: ValueType.string, symbol: 'instPrintTime' },
    ];
    const form = (formFields || [])
      .filter((v) => v.valueType !== ValueType.none && !v.parent)
      .map((v) => ({ name: v.name, type: v.type, valueType: v.valueType, symbol: v.key, columns: v.props?.columns }));
    return [
      { name: t('print.designer.group.system'), fields: systemFields },
      { name: t('print.designer.group.form'), fields: form },
      {
        name: t('print.designer.group.records'),
        fields: [{ name: t('print.designer.field.allRecords'), type: 'NodeRecords', valueType: ValueType.objArray, symbol: 'nodeRecords' }],
      },
    ];
  }, [formFields, t]);

  useEffect(() => {
    if (!printerRef.current) return;
    const editorConfig: CanvasEditorConfig = config && config.data ? config : defaultCanvasConfig();
    try {
      const editor = new Editor(printerRef.current, editorConfig.data, editorConfig.options);
      editor.use(floatingToolbarPlugin);
      editor.use(barcode1DPlugin);
      editor.use(barcode2DPlugin);
      editor.use(codeblockPlugin);
      editor.use(docxPlugin);
      editor.use(diagramPlugin);
      editorRef.current = editor;
      editor.listener.contentChange = async () => {
        try {
          setWordCount(await editor.command.getWordCount());
        } catch {
          /* ignore */
        }
      };
      editor.listener.rangeStyleChange = (payload: any) => setSelected((prev: any) => ({ ...prev, ...payload }));
      editor.listener.pageSizeChange = (size: number) => setPageCount(size || 1);
      editor.listener.intersectionPageNoChange = (no: number) => setPageNo((no ?? 0) + 1);
      editor.command.getWordCount?.().then?.(setWordCount).catch?.(() => undefined);
      (window as any).wflowPrintEditor = editor;
    } catch (e) {
      console.error(e);
      message.error(translate('print.error.initEditorFailed'));
    }
    return () => {
      try {
        editorRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cmd = (fn: string, ...args: any[]) => {
    const command = editorRef.current?.command;
    if (!command) return;
    try {
      command[fn](...args);
    } catch (err) {
      console.error(err);
    }
  };

  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.command?.getValue?.({ extraPickAttrs: ['id', '_type', '_key'] }) || null,
  }));

  /* ------------------------- insert helpers ------------------------- */

  const insertImgCode = (isQr: boolean) => {
    setPromptValue('');
    setPromptState({
      open: true,
      title: t(isQr ? 'print.designer.prompt.generateQr' : 'print.designer.prompt.generateBarcode'),
      placeholder: t(isQr ? 'print.designer.prompt.qrPlaceholder' : 'print.designer.prompt.barcodePlaceholder'),
      pattern: isQr ? /^[\s\S]{2,100}$/ : /^[a-z0-9]{2,40}$/i,
      error: t('print.designer.prompt.invalidContent'),
      onOk: (value) => {
        if (isQr) cmd('executeInsertBarcode2D', value, 120, 120);
        else cmd('executeInsertBarcode1D', value, 200, 100);
      },
    });
  };

  const insertWatermark = () => {
    setWatermarkOpen(false);
    cmd('executeAddWatermark', { ...watermark });
  };

  const insertImage = () => {
    setPromptValue('');
    setPromptState({
      open: true,
      title: t('print.designer.prompt.insertImage'),
      placeholder: t('print.designer.prompt.imageUrlPlaceholder'),
      pattern: /^https?:\/\/.+/i,
      error: t('print.designer.prompt.invalidImageUrl'),
      onOk: (value) => cmd('executeImage', { width: 100, height: 100, imgDisplay: ImageDisplay.BLOCK, value }),
    });
  };

  const importDoc = () => fileInputRef.current?.click();
  const uploadImage = () => imageInputRef.current?.click();

  const onImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      cmd('executeImage', {
        width: 100,
        height: 100,
        imgDisplay: ImageDisplay.BLOCK,
        value: reader.result,
      });
    reader.readAsDataURL(file);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      message.warning(translate('print.designer.prompt.noFileSelected'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => cmd('executeImportDocx', { arrayBuffer: (e.target as FileReader).result });
    reader.readAsArrayBuffer(file);
  };

  const openCodeblock = () => {
    setCodeblockContent('');
    setCodeblockOpen(true);
  };

  const insertCodeblock = () => {
    const content = codeblockContent.replace(/\r\n/g, '\n');
    if (!content.trim()) {
      message.warning(translate('print.designer.prompt.emptyCode'));
      return;
    }
    setCodeblockOpen(false);
    cmd('executeInsertCodeblock', content);
  };

  // FE-11: the diagram plugin opens an embed.diagrams.net iframe and hands the
  // exported SVG back through onDestroy. Rasterize it to PNG before insertion so
  // the template keeps working when it is later rendered/printed.
  const insertDiagram = () => {
    const editor = editorRef.current;
    if (!editor?.command?.executeLoadDiagram) {
      message.warning(translate('print.designer.prompt.diagramUnsupported'));
      return;
    }
    editor.command.executeLoadDiagram({
      onDestroy: async (payload: any) => {
        const svg = extractDiagramSvg(payload);
        if (!svg) return;
        const parsed = parseSvgSize(svg);
        const size = computeInsertSize(parsed.width, parsed.height);
        let value = svgToDataUrl(svg);
        try {
          value = await svgToPngDataUrl(svg);
        } catch {
          /* keep the SVG data URL when rasterization is unavailable */
        }
        cmd('executeImage', { width: size.width, height: size.height, imgDisplay: ImageDisplay.BLOCK, value });
      },
    });
  };

  const refreshSearchInfo = () => {
    try {
      setSearchInfo(editorRef.current?.command?.getSearchNavigateInfo?.() || null);
    } catch {
      setSearchInfo(null);
    }
  };

  const search = (payload: string, flags: SearchFlags) => {
    searchKeywordRef.current = payload;
    searchFlagsRef.current = flags;
    if (!payload) {
      cmd('executeSearch', null);
      setSearchInfo(null);
      return;
    }
    cmd('executeSearch', payload, buildSearchOption(flags));
    refreshSearchInfo();
  };

  const searchNavigate = (direction: 'pre' | 'next') => {
    cmd(direction === 'pre' ? 'executeSearchNavigatePre' : 'executeSearchNavigateNext');
    refreshSearchInfo();
  };

  const replaceSearch = (payload: string) => {
    if (!searchKeywordRef.current) {
      message.warning(translate('print.designer.prompt.searchFirst'));
      return;
    }
    const index = searchInfo && searchInfo.index > 0 ? searchInfo.index - 1 : 0;
    cmd('executeReplace', payload, { index });
    cmd('executeSearch', searchKeywordRef.current, buildSearchOption(searchFlagsRef.current));
    refreshSearchInfo();
  };

  const replaceAllSearch = (payload: string) => {
    if (!searchKeywordRef.current) {
      message.warning(translate('print.designer.prompt.searchFirst'));
      return;
    }
    cmd('executeReplace', payload);
    cmd('executeSearch', searchKeywordRef.current, buildSearchOption(searchFlagsRef.current));
    refreshSearchInfo();
  };

  const insertLinkOk = () => {
    if (!link.label) {
      message.error(translate('print.designer.prompt.linkTextRequired'));
      return;
    }
    if (!/^(https?|ftp|file):\/\/([^\s]+)$/.test(link.url)) {
      message.error(translate('print.designer.prompt.invalidUrl'));
      return;
    }
    setLinkOpen(false);
    cmd('executeHyperlink', {
      type: ElementType.HYPERLINK,
      value: '',
      url: link.url,
      valueList: splitText(link.label).map((n) => ({ value: n, size: 16 })),
    });
  };

  const doScale = (zoom: number) => {
    if ((scaleRef.current < 0.5 && zoom < 0) || (scaleRef.current > 3 && zoom > 0)) {
      message.warning(translate('print.designer.prompt.zoomLimit'));
      return;
    }
    scaleRef.current = Number((scaleRef.current + zoom).toFixed(2));
    setScale(scaleRef.current);
    cmd('executePageScale', scaleRef.current);
  };

  /* ------------------------- field dragging ------------------------- */

  const getColumn = (col: any) => {
    const isImgs = col.valueType === ValueType.imageArray;
    if (col.valueType === ValueType.image || isImgs) {
      return [
        {
          _key: col.key,
          _type: col.valueType,
          width: 80,
          height: isImgs ? 80 : 40,
          type: ElementType.IMAGE,
          value: `/image/${isImgs ? 'img-occupy' : 'sign-occupy'}.png`,
          imgDisplay: ImageDisplay.BLOCK,
        },
      ];
    }
    return [{ type: ElementType.CONTROL, value: '', control: { conceptId: col.key, type: ControlType.TEXT, value: '', placeholder: col.name } }];
  };

  const insertNodeRecords = (field: any) => {
    const options = editorRef.current?.command?.getOptions?.() || { width: 794, margins: [96, 72, 96, 72] };
    const colWidth = (options.width - 2 * (options.margins?.[1] ?? 72)) / NODE_RECORD_COLUMNS.length;
    cmd('executeInsertElementList', [
      {
        type: ElementType.TABLE,
        value: '',
        id: field.symbol,
        _key: field.symbol,
        _type: field.type,
        conceptId: field.type,
        disabled: true,
        colgroup: NODE_RECORD_COLUMNS.map(() => ({ width: colWidth })),
        trList: [
          {
            height: 30,
            tdList: NODE_RECORD_COLUMNS.map((col) => ({ colspan: 1, rowspan: 1, backgroundColor: TD_BGC, value: [{ value: t(col.nameKey) }] })),
          },
          {
            height: 30,
            tdList: NODE_RECORD_COLUMNS.map((col) => {
              const td: any[] = [{ type: ElementType.CONTROL, control: { conceptId: col.key, type: ControlType.TEXT, value: '', placeholder: t(col.nameKey) } }];
              if (col.key === 'nodeResult') {
                td.push({ _key: 'nodeSignature', _type: ValueType.image, width: 50, height: 25, type: ElementType.IMAGE, value: '/image/sign.png', imgDisplay: ImageDisplay.BLOCK });
              }
              return { colspan: 1, rowspan: 1, value: td };
            }),
          },
        ],
      },
    ]);
  };

  const insertRecordNode = (field: any) => {
    cmd('executeInsertElementList', [
      { conceptId: '$node_begin', value: '[[', type: ElementType.TEXT },
      { type: ElementType.CONTROL, value: '', control: { conceptId: '$node_user', type: ControlType.TEXT, value: '', placeholder: `${field.name}` } },
      { value: t('print.designer.nodeRecord.separator'), type: ElementType.TEXT },
      { type: ElementType.CONTROL, value: '', control: { conceptId: '$node_result', type: ControlType.TEXT, value: '', placeholder: t('print.designer.nodeColumn.nodeResult') } },
      { value: '  ', type: ElementType.TEXT },
      { _key: '$node_sign', width: 50, height: 25, type: ElementType.IMAGE, value: '/image/sign.png', imgDisplay: ImageDisplay.BLOCK },
      { value: '  ', type: ElementType.TEXT },
      { type: ElementType.CONTROL, value: '', control: { conceptId: '$node_comment', type: ControlType.TEXT, value: '', placeholder: t('print.designer.nodeColumn.nodeComment') } },
      { value: '  ', type: ElementType.TEXT },
      { type: ElementType.CONTROL, value: '', control: { conceptId: '$node_time', type: ControlType.TEXT, value: '', placeholder: t('print.designer.field.completeTime') } },
      { conceptId: '$node_end', value: ']]', type: ElementType.TEXT },
      { value: '\n', type: ElementType.TEXT },
    ]);
  };

  const dragField = (field: any) => {
    if (!editorRef.current?.command) return;
    switch (field.type) {
      case 'NodeRecords':
        insertNodeRecords(field);
        break;
      case 'Node':
        insertRecordNode(field);
        break;
      case 'instQr':
        cmd('executeImage', { id: field.symbol, _key: field.symbol, _type: ValueType.image, width: 100, height: 100, value: '/image/code.png', imgDisplay: ImageDisplay.BLOCK });
        break;
      case 'Signature':
        cmd('executeInsertElementList', [
          { id: field.symbol, _key: field.symbol, _type: field.valueType, width: 120, height: 60, type: ElementType.IMAGE, value: '/image/sign-occupy.png', imgDisplay: ImageDisplay.BLOCK },
        ]);
        break;
      case 'FormList':
      case 'TableList': {
        const options = editorRef.current.command.getOptions();
        const columns: any[] = field.columns || [];
        if (!columns.length) break;
        const colWidth = (options.width - 2 * options.margins[1]) / columns.length;
        cmd('executeInsertElementList', [
          {
            type: ElementType.TABLE,
            value: '',
            id: field.symbol,
            _key: field.symbol,
            _type: field.type,
            disabled: true,
            colgroup: columns.map(() => ({ width: colWidth })),
            trList: [
              { height: 30, tdList: columns.map((col) => ({ backgroundColor: TD_BGC, colspan: 1, rowspan: 1, value: [{ value: col.name, size: 16 }] })) },
              { height: 30, tdList: columns.map((col) => ({ colspan: 1, rowspan: 1, value: getColumn(col) })) },
            ],
          },
        ]);
        break;
      }
      default:
        if (field.valueType === ValueType.image || field.valueType === ValueType.imageArray) {
          cmd('executeInsertElementList', [
            { id: field.symbol, _key: field.symbol, _type: field.valueType, width: 100, height: 100, value: '/image/img-occupy.png', imgDisplay: ImageDisplay.BLOCK, type: ElementType.IMAGE },
          ]);
        } else {
          cmd('executeInsertElementList', [
            { type: ElementType.CONTROL, value: '', control: { conceptId: field.symbol, type: ControlType.TEXT, value: '', placeholder: field.name } },
          ]);
        }
        break;
    }
  };

  return {
    printerRef,
    fileInputRef,
    imageInputRef,
    scale,
    wordCount,
    selected,
    fieldGroups,
    watermarkOpen,
    setWatermarkOpen,
    watermark,
    setWatermark,
    linkOpen,
    setLinkOpen,
    link,
    setLink,
    promptState,
    setPromptState,
    promptValue,
    setPromptValue,
    codeblockOpen,
    setCodeblockOpen,
    codeblockContent,
    setCodeblockContent,
    searchInfo,
    pageNo,
    pageCount,
    cmd,
    insertImgCode,
    insertWatermark,
    insertImage,
    importDoc,
    uploadImage,
    onImageChange,
    onFileChange,
    openCodeblock,
    insertCodeblock,
    insertDiagram,
    search,
    searchNavigate,
    replaceSearch,
    replaceAllSearch,
    insertLinkOk,
    doScale,
    dragField,
  };
}

export type CustomPrintDesignerApi = ReturnType<typeof useCustomPrintDesigner>;

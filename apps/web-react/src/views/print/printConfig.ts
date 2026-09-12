import { t } from '@/i18n';
import { ValueType } from '@/views/form/valueType';

export interface CanvasDocument {
  header: any[];
  main: any[];
  footer: any[];
}

export interface CanvasEditorConfig {
  version?: string;
  data: CanvasDocument;
  options?: Record<string, any>;
}

export interface PrintConf {
  type: string;
  template: string | null;
}

export interface PrintField {
  name: string;
  type: string;
  valueType: string;
  symbol: string;
  columns?: any[];
}

export interface PrintFieldGroup {
  name: string;
  fields: PrintField[];
}

export const FONT_TYPES = [
  { labelKey: 'print.designer.font.microsoftYaHei', value: 'Microsoft YaHei' },
  { labelKey: 'print.designer.font.huaWenSongTi', value: '华文宋体' },
  { labelKey: 'print.designer.font.huaWenFangSong', value: '华文仿宋' },
  { labelKey: 'print.designer.font.huaWenHeiTi', value: '华文黑体' },
  { labelKey: 'print.designer.font.huaWenKaiTi', value: '华文楷体' },
  { labelKey: 'print.designer.font.huaWenLiShu', value: '华文隶书' },
  { labelKey: 'print.designer.font.huaWenXinWei', value: '华文新魏' },
  { labelKey: 'print.designer.font.huaWenXingKai', value: '华文行楷' },
  { labelKey: 'print.designer.font.huaWenZhongSong', value: '华文中宋' },
  { labelKey: 'print.designer.font.arial', value: 'Arial' },
  { labelKey: 'print.designer.font.segoeUi', value: 'Segoe UI' },
];

export const FONT_SIZES = [
  { labelKey: 'print.designer.fontSize.chuHao', value: 56 },
  { labelKey: 'print.designer.fontSize.xiaoChu', value: 48 },
  { labelKey: 'print.designer.fontSize.yiHao', value: 34 },
  { labelKey: 'print.designer.fontSize.xiaoYi', value: 32 },
  { labelKey: 'print.designer.fontSize.erHao', value: 29 },
  { labelKey: 'print.designer.fontSize.xiaoEr', value: 24 },
  { labelKey: 'print.designer.fontSize.sanHao', value: 21 },
  { labelKey: 'print.designer.fontSize.xiaoSan', value: 20 },
  { labelKey: 'print.designer.fontSize.siHao', value: 18 },
  { labelKey: 'print.designer.fontSize.xiaoSi', value: 16 },
  { labelKey: 'print.designer.fontSize.wuHao', value: 14 },
  { labelKey: 'print.designer.fontSize.xiaoWu', value: 12 },
  { labelKey: 'print.designer.fontSize.liuHao', value: 10 },
  { labelKey: 'print.designer.fontSize.qiHao', value: 7 },
  { labelKey: 'print.designer.fontSize.baHao', value: 6 },
];

export const FONT_TITLES = [
  { labelKey: 'print.designer.fontTitle.body', value: null },
  { labelKey: 'print.designer.fontTitle.h1', value: 'first' },
  { labelKey: 'print.designer.fontTitle.h2', value: 'second' },
  { labelKey: 'print.designer.fontTitle.h3', value: 'third' },
  { labelKey: 'print.designer.fontTitle.h4', value: 'fourth' },
  { labelKey: 'print.designer.fontTitle.h5', value: 'fifth' },
  { labelKey: 'print.designer.fontTitle.h6', value: 'sixth' },
];

export const PAGE_SIZES = [
  { labelKey: 'print.designer.pageSize.a4', value: [794, 1123] },
  { labelKey: 'print.designer.pageSize.a2', value: [1593, 2251] },
  { labelKey: 'print.designer.pageSize.a3', value: [1125, 1593] },
  { labelKey: 'print.designer.pageSize.a5', value: [565, 796] },
  { labelKey: 'print.designer.pageSize.envelope5', value: [412, 488] },
  { labelKey: 'print.designer.pageSize.envelope6', value: [450, 866] },
  { labelKey: 'print.designer.pageSize.envelope7', value: [609, 862] },
  { labelKey: 'print.designer.pageSize.envelope9', value: [862, 1221] },
  { labelKey: 'print.designer.pageSize.legal', value: [813, 1266] },
  { labelKey: 'print.designer.pageSize.letter', value: [813, 1054] },
];

export const LINE_MARGINS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export const PAGE_PADDING = [
  { labelKey: 'print.designer.padding.none', size: [0, 0, 0, 0] },
  { labelKey: 'print.designer.padding.narrow', size: [48, 48, 48, 48] },
  { labelKey: 'print.designer.padding.normal', size: [96, 72, 96, 72] },
  { labelKey: 'print.designer.padding.moderate', size: [96, 120, 96, 120] },
  { labelKey: 'print.designer.padding.wide', size: [96, 192, 96, 192] },
];

export const TD_BGC = '#E6E6E6';

export const NODE_RECORD_COLUMNS = [
  { nameKey: 'print.designer.nodeColumn.nodeName', key: 'nodeName' },
  { nameKey: 'print.designer.nodeColumn.nodeAssignee', key: 'nodeAssignee' },
  { nameKey: 'print.designer.nodeColumn.nodeResult', key: 'nodeResult' },
  { nameKey: 'print.designer.nodeColumn.nodeComment', key: 'nodeComment' },
  { nameKey: 'print.designer.nodeColumn.nodeEndTime', key: 'nodeEndTime' },
];

export function defaultCanvasConfig(): CanvasEditorConfig {
  return {
    version: '0.9.104',
    data: { header: [], main: [], footer: [] },
    options: { placeholder: t('print.designer.editor.placeholder') },
  };
}

interface SystemFieldDef {
  labelKey: string;
  type: string;
  valueType: string;
  symbol: string;
}

const SYSTEM_FIELDS: SystemFieldDef[] = [
  { labelKey: 'print.designer.field.instId', type: 'text', valueType: ValueType.string, symbol: 'instId' },
  { labelKey: 'print.designer.field.instUserName', type: 'text', valueType: ValueType.string, symbol: 'instUserName' },
  { labelKey: 'print.designer.field.instDeptName', type: 'text', valueType: ValueType.string, symbol: 'instDeptName' },
  { labelKey: 'print.designer.field.instName', type: 'text', valueType: ValueType.string, symbol: 'instName' },
  { labelKey: 'print.designer.field.instTitle', type: 'text', valueType: ValueType.string, symbol: 'instTitle' },
  { labelKey: 'print.designer.field.instCode', type: 'text', valueType: ValueType.string, symbol: 'instCode' },
  { labelKey: 'print.designer.field.instCreateTime', type: 'text', valueType: ValueType.string, symbol: 'instCreateTime' },
  { labelKey: 'print.designer.field.instEndTime', type: 'text', valueType: ValueType.string, symbol: 'instEndTime' },
  { labelKey: 'print.designer.field.instStatusName', type: 'text', valueType: ValueType.string, symbol: 'instStatusName' },
  { labelKey: 'print.designer.field.instVer', type: 'text', valueType: ValueType.string, symbol: 'instVer' },
  { labelKey: 'print.designer.field.instQrCode', type: 'instQr', valueType: ValueType.image, symbol: 'instIdQrCode' },
  { labelKey: 'print.designer.field.instPrintTime', type: 'text', valueType: ValueType.string, symbol: 'instPrintTime' },
];

export function buildPrintFieldGroups(formFields: any[], translate: (key: string) => string = t): PrintFieldGroup[] {
  return [
    {
      name: translate('print.designer.group.system'),
      fields: SYSTEM_FIELDS.map((field) => ({
        name: translate(field.labelKey),
        type: field.type,
        valueType: field.valueType,
        symbol: field.symbol,
      })),
    },
    {
      name: translate('print.designer.group.form'),
      fields: (formFields || [])
        .filter((v) => v.valueType !== ValueType.none && !v.parent)
        .map((v) => ({
          name: v.name || v.title,
          type: v.type,
          valueType: v.valueType,
          symbol: v.key || v.id,
          columns: v.props?.columns,
        })),
    },
    {
      name: translate('print.designer.group.records'),
      fields: [
        { name: translate('print.designer.field.allRecords'), type: 'NodeRecords', valueType: ValueType.objArray, symbol: 'nodeRecords' },
      ],
    },
  ];
}

/** Convert a form value into plain text used by the canvas print template. */
export function getFieldTextVal(val: any, field?: any): any {
  if (!field) return val;
  const separator = t('print.common.listSeparator');
  switch (field.valueType) {
    case ValueType.option:
      return val?.label;
    case ValueType.options:
      return (val || []).map((v: any) => v.label).join(separator);
    case ValueType.timeRange:
    case ValueType.dateTimeRange:
      return Array.isArray(val) ? `${val[0]} ~ ${val[1]}` : '';
    case ValueType.orgArray:
      return (val || []).map((v: any) => v.name).join(separator);
    case ValueType.org:
      return val?.name;
    case ValueType.array:
      return Array.isArray(val) ? val.join(separator) : val || '';
    case ValueType.fileArray:
      return (val || []).map((v: any) => v.name).join(separator);
    case ValueType.object:
      if (field.type === 'PhoneNumber') return `+${val?.prefix} ${val?.number}`;
      return JSON.stringify(val);
    default:
      return val;
  }
}

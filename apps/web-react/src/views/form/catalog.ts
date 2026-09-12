import type { FormItemConfig } from '@/types/workflow';
import { t } from '@/i18n';

/** 组件库单个组件元数据（对齐 Vue BaseFormComponents.js） */
export interface CatalogItem {
  icon: string;
  type: string;
  /** 组件名称的 i18n key（禁止作为 type/key 使用，仅用于展示与创建字段命名） */
  nameKey: string;
  valueType: string;
  props: Record<string, any>;
}

export interface CatalogGroup {
  /** 分组名称的 i18n key */
  labelKey: string;
  components: CatalogItem[];
}

/** 默认 props 中需要按当前语言解析的字符串标记 */
const I18N_PREFIX = '@i18n:';
const i18n = (key: string) => `${I18N_PREFIX}${key}`;

function resolveI18n<T>(value: T): T {
  if (typeof value === 'string' && value.startsWith(I18N_PREFIX)) {
    return t(value.slice(I18N_PREFIX.length)) as T;
  }
  if (Array.isArray(value)) return value.map(resolveI18n) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveI18n(item)])) as T;
  }
  return value;
}

export const BaseCatalogGroups: CatalogGroup[] = [
  {
    labelKey: 'form.catalog.groups.layout',
    components: [
      {
        icon: 'tabler:layout-columns',
        type: 'SpanLayout',
        nameKey: 'form.catalog.items.SpanLayout',
        valueType: 'none',
        props: {
          isContainer: true,
          span: 24,
          number: 2,
          gutter: 5,
          columns: [],
        },
      },
      {
        icon: 'lets-icons:table',
        type: 'TableLayout',
        nameKey: 'form.catalog.items.TableLayout',
        valueType: 'none',
        props: {
          isContainer: true,
          fonts: [],
          heights: [40, 40],
          widths: [50, 50],
          borderColor: '#3C3F41',
          borderWidth: 1,
          cellSpans: [
            [{ row: 1, col: 1 }, { row: 1, col: 1 }],
            [{ row: 1, col: 1 }, { row: 1, col: 1 }],
          ],
          columns: [[[], []], [[], []]],
        },
      },
    ],
  },
  {
    labelKey: 'form.catalog.groups.base',
    components: [
      {
        icon: 'iconamoon:edit',
        type: 'TextInput',
        nameKey: 'form.catalog.items.TextInput',
        valueType: 'string',
        props: {
          required: false,
          length: [0, null],
          regex: {
            exp: null,
            error: null,
          },
        },
      },
      {
        nameKey: 'form.catalog.items.TextareaInput',
        type: 'TextareaInput',
        icon: 'solar:list-down-line-duotone',
        valueType: 'string',
        props: {
          required: false,
          max: 255,
        },
      },
      {
        nameKey: 'form.catalog.items.NumberInput',
        type: 'NumberInput',
        icon: 'tabler:123',
        valueType: 'number',
        props: {
          required: false,
          precision: 0,
        },
      },
      {
        nameKey: 'form.catalog.items.Score',
        type: 'Score',
        icon: 'fluent:star-12-regular',
        valueType: 'number',
        props: {
          required: false,
          color: '#f0a732',
          max: 5,
          showScore: true,
          enableHalf: false,
          icon: 'StarFilled',
        },
      },
      {
        nameKey: 'form.catalog.items.SinglePicker',
        type: 'SinglePicker',
        icon: 'mdi:radiobox-marked',
        valueType: 'option',
        props: {
          required: false,
          expanding: false,
          optionType: 'static',
          static: [{ label: i18n('form.catalog.defaults.option'), value: i18n('form.catalog.defaults.option') }],
          dictKey: null,
          http: {},
        },
      },
      {
        nameKey: 'form.catalog.items.MultiplePicker',
        type: 'MultiplePicker',
        icon: 'mingcute:multiselect-line',
        valueType: 'options',
        props: {
          required: false,
          expanding: false,
          optionType: 'static',
          static: [{ label: i18n('form.catalog.defaults.option'), value: i18n('form.catalog.defaults.option') }],
          dictKey: null,
          http: {},
        },
      },
      {
        nameKey: 'form.catalog.items.DateTimePicker',
        type: 'DateTimePicker',
        icon: 'material-symbols:calendar-month-outline',
        valueType: 'dateTime',
        props: {
          required: false,
          format: 'YYYY-MM-DD HH:mm',
        },
      },
      {
        nameKey: 'form.catalog.items.DateTimeRangePicker',
        type: 'DateTimeRangePicker',
        icon: 'material-symbols:calendar-clock-outline',
        valueType: 'dateTimeRange',
        props: {
          required: false,
          placeholder: [i18n('form.common.startTime'), i18n('form.common.endTime')],
          format: 'YYYY-MM-DD HH:mm',
          showLength: false,
        },
      },
      {
        nameKey: 'form.catalog.items.TimePicker',
        type: 'TimePicker',
        icon: 'gridicons:time',
        valueType: 'time',
        props: {
          required: false,
        },
      },
      {
        nameKey: 'form.catalog.items.TimeRangePicker',
        type: 'TimeRangePicker',
        icon: 'zmdi:time-interval',
        valueType: 'timeRange',
        props: {
          required: false,
          placeholder: [i18n('form.common.startTime'), i18n('form.common.endTime')],
          showLength: false,
        },
      },
      {
        nameKey: 'form.catalog.items.UserPicker',
        type: 'UserPicker',
        icon: 'gravity-ui:persons',
        valueType: 'orgArray',
        props: {
          required: false,
          multiple: false,
        },
      },
      {
        nameKey: 'form.catalog.items.DeptPicker',
        type: 'DeptPicker',
        icon: 'fluent:organization-24-regular',
        valueType: 'orgArray',
        props: {
          required: false,
          multiple: false,
        },
      },
      {
        nameKey: 'form.catalog.items.ImageUpload',
        type: 'ImageUpload',
        icon: 'mingcute:pic-2-line',
        valueType: 'imageArray',
        props: {
          required: false,
          enablePrint: true,
          maxSize: 5,
          maxNumber: 10,
          enableZip: true,
          abstract: false,
        },
      },
      {
        nameKey: 'form.catalog.items.FileUpload',
        type: 'FileUpload',
        icon: 'material-symbols:folder-open-outline',
        valueType: 'fileArray',
        props: {
          required: false,
          enablePrint: true,
          onlyRead: false,
          maxSize: 100,
          maxNumber: 10,
          fileTypes: [],
          abstract: false,
        },
      },
      {
        nameKey: 'form.catalog.items.PhoneNumber',
        type: 'PhoneNumber',
        icon: 'bi:phone',
        valueType: 'object',
        props: {
          required: false,
          enablePrint: true,
          abstract: false,
        },
      },
      {
        nameKey: 'form.catalog.items.IdCard',
        type: 'IdCard',
        icon: 'mage:id-card',
        valueType: 'string',
        props: {
          required: false,
          enablePrint: true,
          abstract: false,
          regex: {
            exp: '^(^[1-9]\\d{7}((0\\d)|(1[0-2]))(([0|1|2]\\d)|3[0-1])\\d{3}$)|(^[1-9]\\d{5}[1-9]\\d{3}((0\\d)|(1[0-2]))(([0|1|2]\\d)|3[0-1])((\\d{4})|\\d{3}[Xx])$)$',
            error: i18n('form.catalog.defaults.idCardError'),
          },
        },
      },
      {
        nameKey: 'form.catalog.items.Html',
        type: 'Html',
        icon: 'mingcute:code-line',
        valueType: 'none',
        props: {
          code: i18n('form.catalog.defaults.htmlCode'),
          height: 200,
          render: 'vue',
        },
      },
      {
        nameKey: 'form.catalog.items.LabelText',
        type: 'LabelText',
        icon: 'mynaui:label',
        valueType: 'none',
        props: {
          required: false,
          color: '#1989FA',
          hideLabel: true,
          showBgc: false,
          placeholder: i18n('form.catalog.defaults.labelPlaceholder'),
        },
      },
      {
        nameKey: 'form.catalog.items.AlertBlock',
        type: 'AlertBlock',
        icon: 'line-md:alert',
        valueType: 'none',
        props: {
          type: 'primary',
          closable: false,
          hideLabel: true,
          hideIcon: false,
          content: i18n('form.catalog.defaults.alertContent'),
        },
      },
      {
        nameKey: 'form.catalog.items.Text',
        type: 'Text',
        icon: 'mingcute:text-line',
        valueType: 'none',
        props: {
          type: 'text',
          tag: 'div',
          align: 'left',
          fonts: [],
          hideLabel: true,
          content: i18n('form.catalog.defaults.textContent'),
        },
      },
    ],
  },
  {
    labelKey: 'form.catalog.groups.advanced',
    components: [
      {
        nameKey: 'form.catalog.items.TableList',
        type: 'TableList',
        icon: 'mdi:table',
        valueType: 'objArray',
        props: {
          showSort: false,
          required: false,
          showBorder: true,
          showSummary: false,
          summaryColumns: [],
          maxSize: 0,
          columns: [],
          colWidths: {},
          summaryCols: [],
        },
      },
      {
        nameKey: 'form.catalog.items.FormList',
        type: 'FormList',
        icon: 'fluent:form-new-20-regular',
        valueType: 'objArray',
        props: {
          allowPut: true,
          required: false,
          maxSize: 0,
          columns: [],
          labelPosition: 'right',
          labelWidth: 100,
          size: 'default',
        },
      },
      {
        nameKey: 'form.catalog.items.RichText',
        type: 'RichText',
        icon: 'mdi:text-box-edit',
        valueType: 'string',
        props: {
          required: false,
        },
      },
      {
        nameKey: 'form.catalog.items.InstQuote',
        type: 'InstQuote',
        icon: 'typcn:flow-children',
        valueType: 'options',
        props: {
          required: false,
          addText: i18n('form.catalog.defaults.instQuoteAdd'),
          code: null,
        },
      },
      {
        nameKey: 'form.catalog.items.CalcFormula',
        type: 'CalcFormula',
        icon: 'pajamas:formula',
        valueType: 'number',
        props: {
          explain: [],
          jsCode: '',
          precision: 2,
          prefix: '',
          suffix: '',
          isCustom: false,
        },
      },
      {
        nameKey: 'form.catalog.items.Signature',
        type: 'Signature',
        icon: 'majesticons:edit-pen-4',
        valueType: 'image',
        props: {
          required: false,
          thickness: 2,
          btnText: i18n('form.catalog.defaults.signatureBtn'),
          color: '#000000',
        },
      },
      {
        nameKey: 'form.catalog.items.Location',
        type: 'Location',
        icon: 'carbon:location',
        valueType: 'option',
        props: {},
      },
      {
        nameKey: 'form.catalog.items.Provinces',
        type: 'Provinces',
        icon: 'icon-park-solid:local-pin',
        valueType: 'string',
        props: {
          level: 3,
        },
      },
      {
        nameKey: 'form.catalog.items.WebIframe',
        type: 'WebIframe',
        icon: 'mingcute:chrome-line',
        valueType: 'none',
        props: {
          path: null,
        },
      },
      {
        nameKey: 'form.catalog.items.VueSfc',
        type: 'VueSfc',
        icon: 'la:vuejs',
        valueType: 'all',
        props: {
          sfc: null,
          mbSfc: null,
        },
      },
    ],
  },
];

export const KitCatalogGroups: CatalogGroup[] = [
  {
    labelKey: 'form.catalog.groups.hr',
    components: [
      {
        icon: 'icon-park-twotone:vacation',
        type: 'Leave',
        nameKey: 'form.catalog.items.Leave',
        valueType: 'object',
        props: {
          hideLabel: true,
          typeOptions: [
            { label: i18n('form.catalog.defaults.leavePersonal'), value: 0, rule: 'HALF_DAY' },
            { label: i18n('form.catalog.defaults.leaveMaternity'), value: 1, rule: 'DAY' },
            { label: i18n('form.catalog.defaults.leaveCompensatory'), value: 2, rule: 'HOUR' },
            { label: i18n('form.catalog.defaults.leaveAnnual'), value: 3, rule: 'DAY' },
          ],
        },
      },
    ],
  },
];

export const CatalogGroups: CatalogGroup[] = [...BaseCatalogGroups, ...KitCatalogGroups];

export function getCatalogItem(type: string): CatalogItem | undefined {
  for (const group of CatalogGroups) {
    const hit = group.components.find((item) => item.type === type);
    if (hit) return hit;
  }
  return undefined;
}

let keyIndex = 0;

export function randomFieldKey(prefix = 'field'): string {
  keyIndex += 1;
  return `${prefix}_${Date.now().toString(36)}${keyIndex.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function deepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

/** 根据组件库元数据创建一个表单字段配置 */
export function createFieldFromCatalog(type: string): FormItemConfig {
  const meta = getCatalogItem(type);
  const name = meta?.nameKey ? t(meta.nameKey) : type;
  const key = randomFieldKey('field');
  const props = resolveI18n(deepCopy(meta?.props || {}));

  if (props.placeholder === undefined) {
    props.placeholder = t('form.catalog.inputPlaceholder').replace('{name}', name);
  }
  props.required = false;

  if (type === 'SpanLayout') {
    const number = Number(props.number) || 2;
    props.columns = Array.from({ length: number }, () => []);
  } else if (type === 'TableLayout') {
    if (!Array.isArray(props.columns) || props.columns.length === 0) {
      props.columns = [[[], []], [[], []]];
    }
  } else if (type === 'TableList' || type === 'FormList') {
    props.columns = Array.isArray(props.columns) ? props.columns : [];
  }

  return {
    id: key,
    key,
    name,
    title: name,
    type,
    valueType: meta?.valueType || 'all',
    icon: meta?.icon,
    props,
  };
}

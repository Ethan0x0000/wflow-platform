import dayjs from 'dayjs';
import { t } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

export interface CompareOption {
  name: string;
  symbol: string;
}

const option = (labelKey: string, symbol: string): CompareOption => ({
  get name() {
    return t(labelKey);
  },
  symbol,
});

export const CompareOptions: Record<string, CompareOption[]> = {
  number: [
    option('workspace.condition.compare.gt', 'GT'),
    option('workspace.condition.compare.lt', 'LT'),
    option('workspace.condition.compare.eq', 'EQ'),
    option('workspace.condition.compare.gtEq', 'GT_EQ'),
    option('workspace.condition.compare.ltEq', 'LT_EQ'),
    option('workspace.condition.compare.neq', 'NEQ'),
    option('workspace.condition.compare.in', 'IN'),
    option('workspace.condition.compare.bt', 'BT'),
  ],
  string: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.nem', 'NEM'),
    option('workspace.condition.compare.strHas', 'HAS'),
    option('workspace.condition.compare.in', 'IN'),
    option('workspace.condition.compare.eq', 'EQ'),
    option('workspace.condition.compare.neq', 'NEQ'),
  ],
  array: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.nem', 'NEM'),
    option('workspace.condition.compare.has', 'HAS'),
    option('workspace.condition.compare.nhas', 'NHAS'),
  ],
  time: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.before', 'BF'),
    option('workspace.condition.compare.after', 'AF'),
    option('workspace.condition.compare.between', 'CT'),
    option('workspace.condition.compare.notBetween', 'NCT'),
  ],
  timeRange: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.durationGt', 'GT'),
    option('workspace.condition.compare.durationGtEq', 'GT_EQ'),
    option('workspace.condition.compare.durationLt', 'LT'),
    option('workspace.condition.compare.durationLtEq', 'LT_EQ'),
    option('workspace.condition.compare.durationEq', 'EQ'),
  ],
  dateTime: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.before', 'BF'),
    option('workspace.condition.compare.after', 'AF'),
    option('workspace.condition.compare.between', 'CT'),
    option('workspace.condition.compare.notBetween', 'NCT'),
  ],
  dateTimeRange: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.durationGt', 'GT'),
    option('workspace.condition.compare.durationGtEq', 'GT_EQ'),
    option('workspace.condition.compare.durationLt', 'LT'),
    option('workspace.condition.compare.durationLtEq', 'LT_EQ'),
    option('workspace.condition.compare.durationEq', 'EQ'),
  ],
  user: [
    option('workspace.condition.compare.userIn', 'IN'),
    option('workspace.condition.compare.userNin', 'NIN'),
  ],
  dept: [
    option('workspace.condition.compare.deptIn', 'IN'),
    option('workspace.condition.compare.deptNin', 'NIN'),
  ],
  org: [
    option('workspace.condition.compare.orgIn', 'IN'),
    option('workspace.condition.compare.orgNin', 'NIN'),
  ],
  orgArray: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.has', 'HAS'),
    option('workspace.condition.compare.nhas', 'NHAS'),
    option('workspace.condition.compare.objEq', 'EQ'),
  ],
  role: [
    option('workspace.condition.compare.roleHas', 'HAS'),
    option('workspace.condition.compare.roleNhas', 'NHAS'),
  ],
  result: [option('workspace.condition.compare.eq', 'EQ')],
  all: [
    option('workspace.condition.compare.gt', 'GT'),
    option('workspace.condition.compare.lt', 'LT'),
    option('workspace.condition.compare.eq', 'EQ'),
    option('workspace.condition.compare.neq', 'NEQ'),
    option('workspace.condition.compare.gtEq', 'GT_EQ'),
    option('workspace.condition.compare.ltEq', 'LT_EQ'),
    option('workspace.condition.compare.in', 'IN'),
    option('workspace.condition.compare.bt', 'BT'),
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.nem', 'NEM'),
    option('workspace.condition.compare.nhas', 'NHAS'),
    option('workspace.condition.compare.strHas', 'HAS'),
  ],
  option: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.nem', 'NEM'),
    option('workspace.condition.compare.eq', 'EQ'),
    option('workspace.condition.compare.neq', 'NEQ'),
    option('workspace.condition.compare.in', 'IN'),
    option('workspace.condition.compare.nin', 'NIN'),
  ],
  options: [
    option('workspace.condition.compare.em', 'EM'),
    option('workspace.condition.compare.nem', 'NEM'),
    option('workspace.condition.compare.has', 'HAS'),
    option('workspace.condition.compare.nhas', 'NHAS'),
  ],
  bool: [
    option('workspace.condition.compare.eq', 'EQ'),
    option('workspace.condition.compare.neq', 'NEQ'),
  ],
};

export const ValueTypes = {
  none: 'none',
  all: 'all',
  option: 'option',
  options: 'options',
  string: 'string',
  number: 'number',
  bool: 'bool',
  time: 'time',
  dateTime: 'dateTime',
  timeRange: 'timeRange',
  dateTimeRange: 'dateTimeRange',
  object: 'object',
  array: 'array',
  org: 'org',
  objArray: 'objArray',
  orgArray: 'orgArray',
  image: 'image',
  imageArray: 'imageArray',
  fileArray: 'fileArray',
};

const VALUE_TYPE_ALIASES: Record<string, string> = {
  String: 'string',
  Number: 'number',
  Bool: 'bool',
  Boolean: 'bool',
  DateTime: 'dateTime',
  Date: 'dateTime',
  Time: 'time',
  Array: 'array',
  Option: 'option',
  Options: 'options',
  Object: 'object',
  Org: 'org',
  OrgArray: 'orgArray',
  User: 'user',
  Dept: 'dept',
  Role: 'role',
  Result: 'result',
};

export function normalizeValueType(valueType?: string): string {
  if (!valueType) return 'all';
  return VALUE_TYPE_ALIASES[valueType] || valueType;
}

export function getCompareOptions(valueType?: string): CompareOption[] {
  const type = normalizeValueType(valueType);
  return CompareOptions[type] || CompareOptions.string;
}

export function getCompareSymbolName(type: string, symbol: string): string {
  const options = getCompareOptions(type);
  const match = options.find((item) => item.symbol === symbol);
  return match ? match.name : symbol;
}

export interface ConditionLike {
  group?: string;
  type?: string;
  symbol?: string;
  name?: string[];
  valueType?: string;
  compare?: string;
  compareVal?: any[];
}

export function getCompareName(cd: ConditionLike): string {
  const options = getCompareOptions(cd.valueType || cd.type);
  const match = options.find((item) => item.symbol === cd.compare);
  return match ? match.name : '?';
}

const stringifyValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.label || value.name || value.value || JSON.stringify(value);
  return String(value);
};

export function getConditionDesc(cd: ConditionLike): string {
  const values = (cd.compareVal || []).map(stringifyValue).join(t('workspace.listSeparator'));
  switch (cd.group) {
    case 'INITIATOR':
      return `${t('workspace.condition.initiator')} ${getCompareName(cd)} ${values}`;
    case 'CONTEXT':
      return `${(cd.name || [])[1] || ''}${cd.type === 'variable' ? `[${cd.symbol || '?'}]` : ''} ${getCompareName(cd)} ${values}`;
    case 'DEV': {
      const val = (cd.compareVal || [])[0];
      if (cd.type === 'EL') return formatMessage(t('workspace.condition.elResult'), { value: val || '?' });
      if (cd.type === 'JS') return t('workspace.condition.jsResult');
      if (cd.type === 'HTTP') return formatMessage(t('workspace.condition.httpResult'), { url: val?.url || '?' });
      return t('workspace.condition.unconfigured');
    }
    case 'FORM':
    default:
      return `${(cd.name || [])[1] || cd.symbol || ''} ${getCompareName(cd)} ${values}`;
  }
}

export function describeConditionGroups(props: any): string {
  const groups = props?.groups || [];
  if (!groups.length || !(groups[0]?.conditions || []).length) return t('workspace.condition.setCondition');
  return groups
    .map((group: any) => {
      if (!(group.conditions || []).length) return t('workspace.condition.addCondition');
      const hasMore = groups.length > 1 && group.conditions.length;
      const inner = (group.conditions || [])
        .map((cd: ConditionLike) => getConditionDesc(cd))
        .join(` ${group.logic ? t('workspace.condition.and') : t('workspace.condition.or')} `);
      return (hasMore ? '[' : '') + inner + (hasMore ? ']' : '');
    })
    .join(` ${props?.logic ? t('workspace.condition.and') : t('workspace.condition.or')} `);
}

export function isConditionComplete(cd: ConditionLike): boolean {
  if (!cd.compare) return false;
  if (cd.compare === 'EM' || cd.compare === 'NEM') return true;
  const values = cd.compareVal || [];
  if (cd.group === 'DEV') {
    const val = values[0];
    if (cd.type === 'HTTP') return Boolean(val?.url);
    return val !== null && val !== undefined && String(val).trim() !== '';
  }
  if (cd.group === 'INITIATOR') return values.length > 0;
  if (cd.group === 'CONTEXT' && cd.type === 'variable') return Boolean(cd.symbol) && values.length > 0;
  if (cd.group === 'FORM') return Boolean(cd.symbol) && values.length > 0;
  return values.length > 0;
}

/* ------------------------------------------------------------------ *
 * 条件求值（对齐 Vue @/utils/ConditionCompare compareRule / compareRuleGroup）
 * ------------------------------------------------------------------ */

const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

const hasAllBy = (source: any[], target: any[], isEqual: (a: any, b: any) => boolean): boolean =>
  target.every((item) => source.some((other) => isEqual(other, item)));

const datetimeFmt = (value: any) => dayjs(String(value ?? '').length > 9 ? value : `2025-01-01 ${value ?? ''}`);

const isBetween = (a: any, b: any[]) => {
  const value = datetimeFmt(a);
  return value.isAfter(datetimeFmt(b?.[0])) && value.isBefore(datetimeFmt(b?.[1]));
};

const diffHour = (a: any, b: any) => Math.abs(datetimeFmt(a).diff(datetimeFmt(b), 'hour', true));
const diffDay = (a: any, b: any) => Math.abs(datetimeFmt(a).diff(datetimeFmt(b), 'day', true));

const getNumber = (a: any, type?: string) => {
  if (type === 'timeRange') return diffHour(a?.[0], a?.[1]);
  if (type === 'dateTimeRange') return diffDay(a?.[0], a?.[1]);
  return parseFloat(a);
};

const equals = (a: any, b: any, type?: string): boolean => {
  try {
    if (type === 'option') return a?.value === b?.value;
    if (type === 'dateTimeRange') return diffDay(a?.[0], a?.[1]) === parseFloat(b);
    if (type === 'timeRange') return diffHour(a?.[0], a?.[1]) === parseFloat(b);
    if (type === 'orgArray') {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      return hasAllBy(a, b, (x, y) => x?.id === y?.id);
    }
    // eslint-disable-next-line eqeqeq
    return a == b;
  } catch {
    return false;
  }
};

const compareIn = (a: any, b: any[], type?: string): boolean => {
  try {
    if (type === 'option') return b.map((v) => v?.value).indexOf(a?.value) > -1;
    if (type === 'orgArray') return b.map((v) => v?.value).indexOf(a) > -1;
    return b.indexOf(a) > -1;
  } catch {
    return false;
  }
};

const compareHas = (a: any, b: any[], type?: string): boolean => {
  try {
    if (type === 'options') return Array.isArray(a) && a.map((v) => v?.value).indexOf(b?.[0]?.value) > -1;
    if (type === 'orgArray') {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      return hasAllBy(a, b, (x, y) => x?.id === y?.id);
    }
    return Array.isArray(a) && a.indexOf(b?.[0]) > -1;
  } catch {
    return false;
  }
};

type CompareFn = (a: any, b: any[], type?: string) => boolean;

const CompareFns: Record<string, CompareFn> = {
  EM: (a) => isEmptyValue(a),
  NEM: (a) => !isEmptyValue(a),
  GT: (a, b, type) => getNumber(a, type) > parseFloat(b?.[0]),
  LT: (a, b, type) => getNumber(a, type) < parseFloat(b?.[0]),
  GT_EQ: (a, b, type) => getNumber(a, type) >= parseFloat(b?.[0]),
  LT_EQ: (a, b, type) => getNumber(a, type) <= parseFloat(b?.[0]),
  EQ: (a, b, type) => equals(a, b?.[0], type),
  NEQ: (a, b, type) => !equals(a, b?.[0], type),
  IN: (a, b = [], type) => compareIn(a, b, type),
  NIN: (a, b = [], type) => !compareIn(a, b, type),
  BT: (a, b = []) => parseFloat(a) >= parseFloat(b?.[0]) && parseFloat(a) <= parseFloat(b?.[1]),
  HAS: (a, b, type) => compareHas(a, b, type),
  NHAS: (a, b, type) => !compareHas(a, b, type),
  CT: (a, b) => isBetween(a, b),
  NCT: (a, b) => !isBetween(a, b),
  BF: (a, b) => datetimeFmt(a).isBefore(datetimeFmt(b?.[0])),
  AF: (a, b) => datetimeFmt(a).isAfter(datetimeFmt(b?.[0])),
};

function conditionValues(cd: ConditionLike & { values?: any[] }): any[] {
  if (Array.isArray(cd.compareVal)) return cd.compareVal;
  if (Array.isArray(cd.values)) return cd.values;
  return [];
}

export function compareRule(cd: ConditionLike & { values?: any[]; isDynamic?: boolean }, context: Record<string, any>): boolean {
  const fn = cd.compare ? CompareFns[cd.compare] : undefined;
  if (!fn || !cd.symbol) return false;
  let values = conditionValues(cd);
  if (cd.isDynamic && values.length > 0) {
    values = [context[String(values[0])]];
  }
  try {
    return fn(context[cd.symbol], values, cd.valueType || cd.type);
  } catch {
    return false;
  }
}

export function compareRuleGroup(
  group: { logic?: boolean; conditions?: Array<ConditionLike & { values?: any[]; isDynamic?: boolean }> } | null | undefined,
  context: Record<string, any>
): boolean {
  const conditions = group?.conditions || [];
  if (conditions.length === 0) return true;
  let trueNum = 0;
  for (const cd of conditions) {
    if (compareRule(cd, context)) {
      trueNum++;
      if (!group?.logic) return true;
    }
  }
  return trueNum > 0 && trueNum === conditions.length;
}

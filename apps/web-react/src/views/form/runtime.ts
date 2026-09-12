import { useEffect, useRef } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';
import request from '@/api/request';
import { t } from '@/i18n';
import type { FormItemConfig } from '@/types/workflow';
import type { FieldMode, FormOption } from './types';

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

export function deepCopy<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export function isRequired(required: unknown, perm?: string): boolean {
  return required === true && (perm === 'E' || perm === 'D');
}

export function getValueByPath(obj: any, path: string): any {
  if (!path) return obj;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    const match = key.match(/(\w+)|\[(\d+)\]/g);
    return match ? match.reduce((inner, k) => (inner == null ? undefined : inner[k.replace(/\[|\]/g, '')]), acc) : acc;
  }, obj);
}

export function resolveByTemplate(template: string, ctx: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/{(.*?)}/g, (_match, path) => String(getValueByPath(ctx, path.trim()) ?? ''));
}

export function getSimpleVal(obj: any): any {
  if (isEmpty(obj)) return null;
  if (typeof obj === 'object') return JSON.stringify(obj);
  return obj;
}

function getParamObj(params: any[], vars: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  (params || []).forEach((p) => {
    try {
      result[p.name] = p.isDynamic ? getSimpleVal(getValueByPath(vars, String(p.value))) : p.value;
    } catch {
      /* ignore */
    }
  });
  return result;
}

function getJsonBody(script: unknown): any {
  if (isEmpty(script) || typeof script !== 'string') return undefined;
  try {
    return JSON.parse(script);
  } catch {
    return undefined;
  }
}

export function jsonPathExtract(data: any, expression?: string): any {
  if (isEmpty(expression)) return data;
  try {
    let current = data;
    const segments = String(expression).split(/\.|:/);
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const arrayMatch = segment.match(/([a-zA-Z_]\w*)\[(\d+)\]/);
      if (arrayMatch) {
        current = current[arrayMatch[1]][parseInt(arrayMatch[2], 10)];
      } else if (String(expression).includes(':') && i === segments.length - 1) {
        current = (current || []).map((item: any) => item?.[segment]);
      } else {
        current = current?.[segment];
      }
    }
    return current;
  } catch {
    return undefined;
  }
}

function normalizeOptions(raw: unknown): FormOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item === null || item === undefined) return { label: '', value: item };
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      return { label: String(item), value: item };
    }
    const label = item.label ?? item.name ?? item.text ?? item.value;
    return { ...item, label: String(label ?? ''), value: item.value ?? item.key ?? item.id ?? label };
  });
}

async function getDictData(dictKey: string): Promise<FormOption[]> {
  try {
    const res = await request<any[]>({ url: `/sys/dict/${encodeURIComponent(dictKey)}`, method: 'get' });
    return normalizeOptions(res.data);
  } catch {
    return [];
  }
}

/** 加载选项组件的选项，对齐 Vue loadOptions(vars, props) */
export async function loadOptions(vars: Record<string, any>, props: Record<string, any>): Promise<FormOption[]> {
  const optionType = props.optionType ?? (props.options ? 'static' : undefined);
  switch (optionType) {
    case 'static':
      return normalizeOptions(props.static ?? props.options);
    case 'datasource':
      return normalizeOptions(vars?.[props.datasource]);
    case 'dict':
      return props.dictKey ? getDictData(String(props.dictKey)) : [];
    case 'http': {
      const http = props.http || {};
      if (!http.url) return [];
      const method = String(http.method || 'GET').toLowerCase();
      const conf: AxiosRequestConfig = {
        url: resolveByTemplate(String(http.url), vars),
        method: method as any,
        headers: {
          ...getParamObj(http.headers || [], vars),
          'Content-Type': http.isJson ? 'application/json;charset=UTF-8' : 'application/x-www-form-urlencoded',
        },
        params: getParamObj(http.params || [], vars),
        data: getJsonBody(typeof http.data === 'string' ? resolveByTemplate(http.data, vars) : http.data),
      };
      if (method !== 'get') {
        conf.params = getParamObj(http.bodyForms || [], vars);
      }
      try {
        const res = await axios.request(conf);
        const records = jsonPathExtract(res.data, http.dataPath);
        if (!Array.isArray(records)) return [];
        return records.map((item: any) => ({
          label: String(jsonPathExtract(item, http.label) ?? ''),
          value: jsonPathExtract(item, http.value),
        }));
      } catch {
        return [];
      }
    }
    default:
      return normalizeOptions(props.static ?? props.options);
  }
}

/** 选项显示文本 */
export function optionText(option: any): string {
  if (isEmpty(option)) return '';
  if (typeof option === 'object') return String(option.label ?? option.name ?? option.value ?? '');
  return String(option);
}

export function optionsText(options: any): string {
  if (!Array.isArray(options)) return optionText(options);
  return options.map(optionText).filter(Boolean).join('、');
}

/** 取选项 value（用于 antd Select 绑定） */
export function optionValue(option: any): any {
  if (option === null || option === undefined) return option;
  if (typeof option === 'object') return option.value ?? option.key ?? option.id;
  return option;
}

/** 按 value 在选项中回查完整选项对象（保持对象值形态） */
export function findOptionByValue(options: FormOption[], value: any): FormOption | undefined {
  if (isEmpty(value)) return undefined;
  return options.find((op) => op.value === value);
}

/**
 * 组件默认值初始化：mode=E 且值为空时写入 props.defaultValue。
 * 对齐 useFormCpDefaultValue + 部分组件自定义默认（日期取当前时间）。
 */
export function useDefaultValue(
  config: FormItemConfig,
  mode: FieldMode,
  value: any,
  onChange: (value: any) => void,
  custom?: () => any
): void {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    if (mode !== 'E' && mode !== 'D') return;
    const props = config.props || {};
    if (!isEmpty(value)) {
      done.current = true;
      return;
    }
    if (props.defaultValue !== undefined && !isEmpty(props.defaultValue)) {
      done.current = true;
      onChange(deepCopy(props.defaultValue));
    } else if (custom) {
      done.current = true;
      const next = custom();
      if (next !== undefined) onChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, value]);
}

/** 对象型组件的结构初始化（如 PhoneNumber {prefix, number}） */
export function useInitObject(
  config: FormItemConfig,
  mode: FieldMode,
  value: any,
  onChange: (value: any) => void,
  initial: Record<string, any>
): void {
  useEffect(() => {
    if (mode !== 'E' && mode !== 'D') return;
    if (!value || typeof value !== 'object') {
      onChange({ ...initial });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, value]);
}

/** 字段校验（required / regex / length / number 范围），返回错误信息或 null */
export function fieldError(item: FormItemConfig, value: any, mode?: string): string | null {
  const props = item.props || {};
  const required = isRequired(props.required ?? item.required, mode);
  // 手机号：值为对象且可能只含前缀，需先判断号码本身
  if (item.type === 'PhoneNumber') {
    const number = value?.number;
    if (isEmpty(number)) {
      return required ? props.requiredMsg || t('form.validation.required').replace('{name}', String(item.name)) : null;
    }
    if (!/^1[3-9]\d{9}$/.test(String(number))) return t('form.validation.phone');
    return null;
  }
  if (required && isEmpty(value)) {
    return props.requiredMsg || t('form.validation.required').replace('{name}', String(item.name));
  }
  if (isEmpty(value)) return null;

  const valueType = String(item.valueType || '').toLowerCase();
  const text = typeof value === 'string' ? value : optionText(value);
  const regex = props.regex;
  if (regex?.exp && (valueType === 'string' || typeof value === 'string')) {
    try {
      if (!new RegExp(regex.exp).test(text)) {
        return regex.error || t('form.validation.regex').replace('{name}', String(item.name));
      }
    } catch {
      /* invalid regex ignored */
    }
  }
  if (Array.isArray(props.length)) {
    const [min, max] = props.length;
    if (valueType === 'string' && typeof value === 'string') {
      const length = value.length;
      if (min !== null && min !== undefined && min !== '' && length < Number(min)) {
        return t('form.validation.minLength').replace('{min}', String(min));
      }
      if (max !== null && max !== undefined && max !== '' && length > Number(max)) {
        return t('form.validation.maxLength').replace('{max}', String(max));
      }
    }
  }
  if (valueType === 'number' && typeof value === 'number') {
    if (props.min !== undefined && props.min !== null && value < Number(props.min)) {
      return t('form.validation.min').replace('{min}', String(props.min));
    }
    if (props.max !== undefined && props.max !== null && value > Number(props.max)) {
      return t('form.validation.max').replace('{max}', String(props.max));
    }
  }
  return null;
}

/** 由 props 构造 antd 组件通用禁用态 */
export function inputDisabled(mode: FieldMode, props: Record<string, any> = {}): boolean {
  return mode === 'R' || props.disable === true;
}

function appendParamsToUrl(url: string, params: Record<string, any>): string {
  const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return url;
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value == null ? '' : String(value))}`)
    .join('&');
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

/**
 * 加载全局数据源配置（对齐 Vue loadDsVars/doRequest）：
 * 返回数据源变量 patch，由调用方合并进 dsVars。
 */
export async function loadDatasource(
  list: any[],
  formData: Record<string, any>,
  dsVars: Record<string, any>
): Promise<Record<string, any>> {
  const patch: Record<string, any> = {};
  const variables = { ...formData, ...dsVars };
  const tasks = (list || []).map(async (dsConfig: any) => {
    const requestConf = dsConfig?.request || {};
    try {
      const method = String(requestConf.method || 'GET').toLowerCase();
      const conf: AxiosRequestConfig = {
        url: resolveByTemplate(String(requestConf.url || ''), variables),
        method: method as any,
        headers: {
          ...getParamObj(requestConf.headers || [], variables),
          'Content-Type': requestConf.isJson ? 'application/json;charset=UTF-8' : 'application/x-www-form-urlencoded',
        },
        params: getParamObj(requestConf.params || [], variables),
        data: getJsonBody(
          typeof requestConf.data === 'string' ? resolveByTemplate(requestConf.data, variables) : requestConf.data
        ),
      };
      if (method !== 'get') {
        conf.url = appendParamsToUrl(String(conf.url), getParamObj(requestConf.params || [], variables));
        conf.params = getParamObj(requestConf.bodyForms || [], variables);
      }
      const res = await axios.request(conf);
      (dsConfig.handler || []).forEach((handler: any) => {
        if (!handler?.value) return;
        if (handler.valueType === 'options') {
          const labels = jsonPathExtract(res.data, handler.labelPath) || [];
          const values = jsonPathExtract(res.data, handler.valuePath) || [];
          const options: FormOption[] = [];
          for (let i = 0; i < (labels || []).length; i++) options.push({ label: labels[i], value: values[i] });
          patch[handler.value] = options;
        } else {
          patch[handler.value] = jsonPathExtract(res.data, handler.jsonPath);
        }
      });
    } catch {
      /* 数据源失败不影响表单渲染 */
    }
  });
  await Promise.all(tasks);
  return patch;
}

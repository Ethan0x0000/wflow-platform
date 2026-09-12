import { useEffect, useRef, useState } from 'react';
import type { FormItemConfig } from '@/types/workflow';
import { compareRuleGroup } from '@/utils/ConditionCompare';
import { deepCopy, isEmpty, optionText, optionsText } from '../runtime';

export interface RowLinkageCondition {
  symbol?: string;
  compare?: string;
  compareVal?: any[];
  values?: any[];
  value?: any;
  isDynamic?: boolean;
  valueType?: string;
}

export interface RowLinkageAction {
  type?: string;
  field?: string;
  value?: any;
  option?: any;
  isDynamic?: boolean;
}

export interface RowLinkageRule {
  logic?: boolean;
  conditions?: RowLinkageCondition[];
  actions?: RowLinkageAction[];
}

function sameValue(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== 'object' && typeof b !== 'object') return String(a) === String(b);
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export interface RowLinkageState {
  /** rowIndex -> { colKey: true }：由 REQUIRED 动作计算出的行级必填标记（仅用于单元格高亮） */
  requiredCells: Record<number, Record<string, boolean>>;
}

/**
 * 行级联动（best effort）。
 *
 * 已实现：SET_VAL（通过 onChange 写回整行数组）以及 REQUIRED / UN_REQUIRED 的必填标记。
 * 局限：renderField 内部使用全局 permConf / optionConf，注册表不支持按行注入，
 * 因此 SHOW / HIDE / SET_EDIT / SET_READ / SET_OPTIONS / RF_OPTIONS 暂不生效。
 */
export function useRowLinkage(options: {
  rules?: RowLinkageRule[];
  rows: Record<string, any>[];
  values: Record<string, any>;
  enabled?: boolean;
  onChange: (rows: Record<string, any>[]) => void;
}): RowLinkageState {
  const { rules, rows, values, enabled = true, onChange } = options;
  const [requiredCells, setRequiredCells] = useState<Record<number, Record<string, boolean>>>({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !Array.isArray(rules) || rules.length === 0) {
      setRequiredCells((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const nextRows: Record<string, any>[] = [];
    const nextRequired: Record<number, Record<string, boolean>> = {};
    let changed = false;

    rows.forEach((row, rowIndex) => {
      const target: Record<string, any> = { ...row };
      const requiredForRow: Record<string, boolean> = {};
      const context = { ...values, ...row };

      rules.forEach((rule) => {
        if (!compareRuleGroup(rule, context)) return;
        (rule.actions || []).forEach((action) => {
          const field = action?.field;
          if (!action?.type || !field) return;
          switch (action.type) {
            case 'SET_VAL': {
              const next = deepCopy(action.value);
              if (!sameValue(target[field], next)) {
                target[field] = next;
                changed = true;
              }
              break;
            }
            case 'REQUIRED':
              requiredForRow[field] = true;
              break;
            case 'UN_REQUIRED':
              delete requiredForRow[field];
              break;
            default:
              break;
          }
        });
      });

      nextRows.push(target);
      if (Object.keys(requiredForRow).length > 0) nextRequired[rowIndex] = requiredForRow;
    });

    if (changed) onChangeRef.current(nextRows);
    setRequiredCells((prev) => (JSON.stringify(prev) === JSON.stringify(nextRequired) ? prev : nextRequired));
  }, [rules, rows, values, enabled]);

  return { requiredCells };
}

function objectText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return optionText(value);
  const obj = value as Record<string, any>;
  return String(obj.name ?? obj.label ?? obj.value ?? obj.url ?? '');
}

/** 只读/纯值展示：选项类使用 optionText/optionsText，对象取 name/label/value/url */
export function formatFieldValue(item: FormItemConfig, value: any): string {
  if (isEmpty(value)) return '';
  const valueType = String(item?.valueType || '').toLowerCase();
  if (Array.isArray(value)) {
    if (valueType === 'options' || valueType === 'orgarray' || valueType === 'array') return optionsText(value);
    return value.map(objectText).filter(Boolean).join('、');
  }
  if (typeof value === 'object') return objectText(value);
  return String(value);
}

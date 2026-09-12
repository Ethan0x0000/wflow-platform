import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FormItemConfig } from '@/types/workflow';
import { useTranslation } from '@/i18n';
import { FormRuntimeContext } from './context';
import { FormNode } from './FormNode';
import { deepCopy, fieldError, isEmpty, loadDatasource } from './runtime';
import { compareRuleGroup } from '@/utils/ConditionCompare';
import { resolveFormJson } from '@/utils/ProcessUtil';
import type { FieldMode, FormRuntimeContextValue, RenderScope } from './types';
import './form-render.css';

export interface FormRenderRef {
  validate: () => Promise<void>;
  getValues: () => Record<string, any>;
  setValues: (patch: Record<string, any>) => void;
  getFields: (deep?: boolean) => FormItemConfig[];
  getPermConf: () => Record<string, string>;
}

interface FormRenderProps {
  config: { components?: FormItemConfig[]; conf?: Record<string, any>; datasource?: any[] } | FormItemConfig[];
  value?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  permConf?: Record<string, string>;
  readOnly?: boolean;
  mode?: FieldMode;
  initiator?: { id?: string; name?: string };
  startDept?: { id?: string; name?: string };
  isStart?: boolean;
}

const EMPTY_OBJECT: Record<string, any> = {};
const EMPTY_LIST: any[] = [];

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

function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export const FormRender = forwardRef<FormRenderRef, FormRenderProps>((props, ref) => {
  const { t } = useTranslation();
  const {
    config,
    value,
    onChange,
    permConf = EMPTY_OBJECT,
    readOnly = false,
    mode: modeProp,
    initiator = EMPTY_OBJECT,
    startDept = EMPTY_OBJECT,
    isStart = true,
  } = props;

  const components = useMemo<FormItemConfig[]>(
    () => (Array.isArray(config) ? config : config?.components || []),
    [config]
  );
  const formConf = useMemo<Record<string, any>>(
    () => (Array.isArray(config) ? EMPTY_OBJECT : config?.conf || EMPTY_OBJECT),
    [config]
  );
  const datasource = useMemo<any[]>(
    () => (Array.isArray(config) ? EMPTY_LIST : config?.datasource || EMPTY_LIST),
    [config]
  );

  const controlled = typeof onChange === 'function';
  const baseMode: FieldMode = modeProp || (readOnly ? 'R' : 'E');

  const [inner, setInner] = useState<Record<string, any>>(value || {});
  const [localPerm, setLocalPerm] = useState<Record<string, FieldMode | 'H'>>({});
  const [requiredConf, setRequiredConf] = useState<Record<string, boolean>>({});
  const [optionConf, setOptionConf] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [dsVars, setDsVars] = useState<Record<string, any>>({});
  const [loadingMap] = useState<Record<string, boolean>>({});
  const optionLoads = useRef<Record<string, () => void>>({});
  const validatorsRef = useRef<Record<string, () => string | null>>({});
  const registerValidator = useCallback((key: string, fn: () => string | null) => {
    validatorsRef.current[key] = fn;
    return () => {
      delete validatorsRef.current[key];
    };
  }, []);

  const values = useMemo(
    () => (controlled ? value || {} : { ...(value || {}), ...inner }),
    [controlled, value, inner]
  );
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const dsVarsRef = useRef(dsVars);
  dsVarsRef.current = dsVars;

  const setValues = useCallback(
    (patch: Record<string, any>) => {
      const next = { ...valuesRef.current, ...patch };
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange]
  );

  // 非受控模式下，外部传入的 value 变化时合并进内部值
  useEffect(() => {
    if (controlled) return;
    if (!value || Object.keys(value).length === 0) return;
    setInner((prev) => {
      const merged = { ...prev, ...value };
      return shallowEqual(prev, merged) ? prev : merged;
    });
  }, [value, controlled]);

  const effectivePerm = useMemo(
    () => ({ ...permConf, ...localPerm }) as Record<string, string>,
    [permConf, localPerm]
  );
  const effectivePermRef = useRef(effectivePerm);
  effectivePermRef.current = effectivePerm;

  const scope: RenderScope = useMemo(() => ({ values, setValues }), [values, setValues]);

  const renderField = useCallback(
    (item: FormItemConfig, scopeOverride?: RenderScope) => (
      <FormNode key={item.id || item.key} item={item} scopeOverride={scopeOverride} />
    ),
    []
  );

  /* ---------------- 系统全局变量 ---------------- */
  useEffect(() => {
    setDsVars((prev) => ({
      ...prev,
      startUserId: initiator.id,
      startUsername: initiator.name,
      startUser: initiator.id ? [initiator] : [],
      startDeptId: startDept.id,
      startDeptName: startDept.name,
      startDept: startDept.id ? [{ id: startDept.id, name: startDept.name, type: 'dept' }] : [],
      isStart,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiator.id, initiator.name, startDept.id, startDept.name, isStart]);

  /* ---------------- 数据源加载 ---------------- */
  useEffect(() => {
    if (!datasource.length) return;
    let cancelled = false;
    (async () => {
      const patch = await loadDatasource(datasource, valuesRef.current, dsVarsRef.current);
      if (!cancelled && Object.keys(patch).length > 0) {
        setDsVars((prev) => ({ ...prev, ...patch }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [datasource]);

  /* ---------------- 表单加载动作 onLoad（SIMPLE） ---------------- */
  const onLoadApplied = useRef<any>(null);
  useLayoutEffect(() => {
    if (onLoadApplied.current === components) return;
    onLoadApplied.current = components;
    const onLoad = formConf.onLoad;
    if (onLoad?.type !== 'SIMPLE' || !Array.isArray(onLoad.actions)) return;
    const context = { ...valuesRef.current, ...dsVarsRef.current };
    const patch: Record<string, any> = {};
    onLoad.actions.forEach((action: any) => {
      const cdType = action.cdType || 'NONE';
      if (!(cdType === 'NONE' || (cdType === 'FILL' && isStart) || (cdType === 'VIEWER' && !isStart))) return;
      if (action.type !== 'SET_VALUE' || !action.symbol) return;
      const perm = effectivePermRef.current[action.field] || baseMode;
      if (perm === 'E') {
        patch[action.symbol] = action.isDynamic ? context[action.value] : action.value;
      }
    });
    if (Object.keys(patch).length > 0) setValues(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components, formConf, isStart]);

  /* ---------------- 显隐规则 showHide（SIMPLE） ---------------- */
  useEffect(() => {
    const conf = formConf.showHide;
    if (conf?.type !== 'SIMPLE' || !Array.isArray(conf.rules)) return;
    const context = { ...values, ...dsVars };
    const next: Record<string, FieldMode | 'H'> = {};
    conf.rules.forEach((rule: any) => {
      const hit = compareRuleGroup(rule, context);
      const fields = Array.isArray(rule.fields) ? rule.fields : [rule.fields];
      fields.filter(Boolean).forEach((field: string) => {
        const isShow = hit ? rule.isShow !== false : rule.isShow === false;
        const defaultPerm = (permConf[field] || baseMode) as FieldMode;
        next[field] = isShow ? defaultPerm || 'E' : 'H';
      });
    });
    setLocalPerm((prev) => (shallowEqual(prev, next) ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, dsVars, formConf, permConf, baseMode]);

  /* ---------------- 数据联动 actionRule（SIMPLE） ---------------- */
  const prevValuesRef = useRef<Record<string, any> | null>(null);
  useEffect(() => {
    const conf = formConf.actionRule;
    const prev = prevValuesRef.current;
    prevValuesRef.current = values;
    if (conf?.type !== 'SIMPLE' || !Array.isArray(conf.rules)) return;

    const changedKeys = new Set<string>();
    if (prev) {
      Object.keys({ ...prev, ...values }).forEach((key) => {
        if (!sameValue(prev[key], values[key])) changedKeys.add(key);
      });
    }
    if (!prev) return;

    const context = { ...values, ...dsVars };
    const patches: Record<string, any> = {};
    const requiredPatches: Record<string, boolean> = {};
    let requiredDirty = false;

    conf.rules.forEach((rule: any) => {
      const hasChangeCondition = (rule.conditions || []).some((cd: any) => cd?.compare === 'CHANGE');
      const triggered = hasChangeCondition || compareRuleGroup(rule, context);
      if (!triggered) return;
      // 仅当规则关注的字段发生变化时才触发（避免无关字段修改触发动作）
      if (!hasChangeCondition && changedKeys.size > 0) {
        const relevant = (rule.conditions || []).some((cd: any) => cd?.symbol && changedKeys.has(cd.symbol));
        if (!relevant) return;
      }
      (rule.actions || []).forEach((action: any) => {
        if (!action?.type || !action.field) return;
        const perm = effectivePermRef.current[action.field] || baseMode;
        switch (action.type) {
          case 'SET_VAL':
            if (perm === 'E') patches[action.field] = Array.isArray(action.value) ? deepCopy(action.value) : action.value;
            break;
          case 'RF_OPTIONS':
            optionLoads.current[action.field]?.();
            break;
          case 'SET_OPTIONS':
            if (action.option) setOptionConf((state) => ({ ...state, [action.field]: action.option }));
            break;
          case 'REQUIRED':
            requiredPatches[action.field] = true;
            requiredDirty = true;
            break;
          case 'UN_REQUIRED':
            requiredPatches[action.field] = false;
            requiredDirty = true;
            break;
          default:
            break;
        }
      });
    });

    if (Object.keys(patches).length > 0) setValues(patches);
    if (requiredDirty) setRequiredConf((state) => ({ ...state, ...requiredPatches }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, dsVars, formConf]);

  /* ---------------- 值变化时清理对应错误 ---------------- */
  const prevForError = useRef<Record<string, any>>(values);
  useEffect(() => {
    const prev = prevForError.current;
    prevForError.current = values;
    setErrors((state) => {
      if (Object.keys(state).length === 0) return state;
      const next = { ...state };
      let changed = false;
      Object.keys(state).forEach((key) => {
        if (state[key] && !sameValue(prev[key], values[key])) {
          next[key] = null;
          changed = true;
        }
      });
      return changed ? next : state;
    });
  }, [values]);

  /* ---------------- 暴露方法 ---------------- */
  const getFields = useCallback((deep = true) => resolveFormJson(components, deep), [components]);

  const getPermConf = useCallback(() => ({ ...effectivePermRef.current }), []);

  useImperativeHandle(
    ref,
    () => ({
      validate: () =>
        new Promise<void>((resolve, reject) => {
          const currentValues = valuesRef.current;
          const valid = formConf.valid;
          if (valid?.type === 'SIMPLE' && Array.isArray(valid.rules)) {
            const context = { ...currentValues, ...dsVarsRef.current };
            const messages = valid.rules
              .filter((rule: any) => compareRuleGroup(rule, context))
              .map((rule: any) => rule.errMsg)
              .filter(Boolean);
            if (messages.length > 0) {
              reject(String(messages));
              return;
            }
          }
          const fields = resolveFormJson(components);
          const nextErrors: Record<string, string | null> = {};
          fields.forEach((item) => {
            const key = item.key || item.id || '';
            // TableList / FormList 列字段是行级作用域，由容器自身校验，这里跳过
            if (item.parent && (item.parent.type === 'TableList' || item.parent.type === 'FormList')) return;
            const perm = effectivePermRef.current[key] || baseMode;
            if (perm === 'H' || perm === 'R') return;
            const err = fieldError(item, currentValues[key], perm);
            if (err) nextErrors[key] = err;
          });
          // 容器类组件（TableList / FormList）注册的行级校验
          Object.entries(validatorsRef.current).forEach(([key, fn]) => {
            try {
              const err = fn();
              if (err && !nextErrors[key]) nextErrors[key] = err;
            } catch {
              /* 容器校验异常忽略 */
            }
          });
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length > 0) {
            reject(t('form.runtime.validateFailed'));
          } else {
            resolve();
          }
        }),
      getValues: () => valuesRef.current,
      setValues,
      getFields,
      getPermConf,
    }),
    [components, formConf, baseMode, setValues, getFields, getPermConf, t]
  );

  /* ---------------- Context ---------------- */
  const contextValue = useMemo<FormRuntimeContextValue>(
    () => ({
      baseMode,
      permConf: effectivePerm,
      requiredConf,
      errors,
      dsVars,
      scope,
      renderField,
      optionLoads: optionLoads.current,
      optionConf,
      loadingMap,
      registerValidator,
      initiator,
      startDept,
      isStart,
    }),
    [
      baseMode,
      effectivePerm,
      requiredConf,
      errors,
      dsVars,
      scope,
      renderField,
      optionConf,
      loadingMap,
      registerValidator,
      initiator,
      startDept,
      isStart,
    ]
  );

  return (
    <FormRuntimeContext.Provider value={contextValue}>
      <div
        className={`w-form-render${baseMode === 'D' ? ' w-form-render-design' : ''}`}
        data-label-position={formConf.labelPosition || 'top'}
        style={
          {
            '--w-form-label-width': `${Number(formConf.labelWidth) || 100}px`,
          } as React.CSSProperties
        }
      >
        {components.length === 0 ? (
          <div className="w-form-empty">{t('form.runtime.emptyForm')}</div>
        ) : (
          components.map((item, index) => (
            <div className="w-form-block" key={item.id || item.key || index}>
              <FormNode item={item} />
            </div>
          ))
        )}
      </div>
    </FormRuntimeContext.Provider>
  );
});

FormRender.displayName = 'FormRender';

export default FormRender;

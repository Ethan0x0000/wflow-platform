import { createContext, useContext } from 'react';
import type { FieldMode, FormRuntimeContextValue, RenderScope } from './types';
import { isEmpty } from './runtime';

export const emptyScope: RenderScope = {
  values: {},
  setValues: () => {},
};

export const FormRuntimeContext = createContext<FormRuntimeContextValue>({
  baseMode: 'E',
  permConf: {},
  requiredConf: {},
  errors: {},
  dsVars: {},
  scope: emptyScope,
  renderField: () => null,
  optionLoads: {},
  optionConf: {},
  loadingMap: {},
  registerValidator: () => () => {},
  initiator: {},
  startDept: {},
  isStart: true,
});

export function useFormRuntime(): FormRuntimeContextValue {
  return useContext(FormRuntimeContext);
}

/** 归一化权限：返回 H(隐藏) / R(只读) / E(编辑) / D(禁用) / V(纯值) */
export function resolvePerm(
  ctx: FormRuntimeContextValue,
  item: { key?: string; id?: string }
): FieldMode | 'H' {
  const key = item.key || item.id || '';
  const perm = ctx.permConf[key];
  if (perm) return perm as FieldMode | 'H';
  return ctx.baseMode || 'E';
}

export { isEmpty };

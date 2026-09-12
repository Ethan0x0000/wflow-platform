import type { ComponentType } from 'react';
import type { FormComponentProps } from './types';

/**
 * 宿主注册表单组件类型，契约与 FormRender 组件一致
 * （config / mode / value / onChange / scope / renderField / dsVars / index）。
 */
export type HostFormComponent = ComponentType<FormComponentProps>;

/**
 * 可用于解析宿主组件的配置形状。
 * FormItemConfig 没有 code/formCode 字段，因此按结构化类型读取，
 * 兼容设计器（ModelDesigner）与历史 JSON 数据里的 formCode/code 形态。
 */
export interface HostComponentConfigLike {
  code?: unknown;
  formCode?: unknown;
  props?: Record<string, unknown> | null;
}

const hostComponents = new Map<string, HostFormComponent>();

/**
 * 注册宿主表单组件（对齐 Java「formType=1/2 代码表单由宿主注册组件渲染」语义）。
 * 同一 code 重复注册会覆盖，便于宿主热更新 / HMR。
 */
export function registerFormComponent(code: string, component: HostFormComponent): void {
  const key = typeof code === 'string' ? code.trim() : '';
  if (!key) throw new Error('registerFormComponent: code 不能为空');
  if (!component) throw new Error(`registerFormComponent: component 不能为空（${key}）`);
  hostComponents.set(key, component);
}

/** 取消注册，返回是否移除了已注册组件 */
export function unregisterFormComponent(code: string): boolean {
  const key = typeof code === 'string' ? code.trim() : '';
  if (!key) return false;
  return hostComponents.delete(key);
}

/** 按 code 精确查找已注册组件 */
export function getHostFormComponent(code?: string | null): HostFormComponent | undefined {
  const key = typeof code === 'string' ? code.trim() : '';
  if (!key) return undefined;
  return hostComponents.get(key);
}

/**
 * 收集配置中可作为注册 code 的候选值（按优先级去重）：
 * config.code > config.formCode > props.code > props.formCode >
 * props.cpType > props.cpId > props.sfc。
 * props.sfc 用于对齐 Vue `ComponentRender` 以 sfc 字符串为 key 的查找行为。
 */
export function hostComponentCodes(config?: HostComponentConfigLike | null): string[] {
  if (!config) return [];
  const props: Record<string, unknown> = config.props && typeof config.props === 'object' ? config.props : {};
  const raw = [config.code, config.formCode, props.code, props.formCode, props.cpType, props.cpId, props.sfc];
  const codes: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const code = value.trim();
    if (!code || codes.includes(code)) continue;
    codes.push(code);
  }
  return codes;
}

/** 解析配置对应的宿主组件；无命中返回 undefined（由调用方回退 Alert 提示） */
export function resolveHostFormComponent(config?: HostComponentConfigLike | null): HostFormComponent | undefined {
  for (const code of hostComponentCodes(config)) {
    const component = hostComponents.get(code);
    if (component) return component;
  }
  return undefined;
}

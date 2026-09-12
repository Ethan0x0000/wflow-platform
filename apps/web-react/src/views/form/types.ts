import type { ReactNode } from 'react';
import type { FormItemConfig } from '@/types/workflow';

/** 组件模式：E 编辑, R 只读, V 纯值展示, D 设计态 */
export type FieldMode = 'E' | 'R' | 'V' | 'D';

/** 渲染作用域：值对象 + 局部 patch 更新（用于 TableList 行 / 容器） */
export interface RenderScope {
  values: Record<string, any>;
  setValues: (patch: Record<string, any>) => void;
}

/**
 * 渲染一个子字段（含 label / 权限 / 校验展示）。
 * 传入 scope 覆盖默认作用域（例如表格行内绑定行对象）。
 */
export type RenderField = (item: FormItemConfig, scope?: RenderScope) => ReactNode;

/** 所有表单组件统一 props（与 Vue FormComponentMixin 对齐） */
export interface FormComponentProps {
  config: FormItemConfig;
  mode: FieldMode;
  value: any;
  onChange: (value: any) => void;
  /** 当前作用域（顶层为整个表单值；表格/容器内为局部对象） */
  scope: RenderScope;
  /** 渲染嵌套子字段（仅容器/数组类组件使用） */
  renderField: RenderField;
  /** 全局数据源变量 */
  dsVars: Record<string, any>;
  /** 在父级列表中的索引 */
  index?: number;
}

export type FormComponent = React.FC<FormComponentProps>;

/** 选项统一形态：{label, value, ...} */
export interface FormOption {
  label: string;
  value: any;
  [key: string]: any;
}

export interface FormRuntimeContextValue {
  /** 表单全局模式（字段级 permConf 可覆盖） */
  baseMode: FieldMode;
  permConf: Record<string, string>;
  /** REQUIRED / UN_REQUIRED 动作覆盖的必填状态 */
  requiredConf: Record<string, boolean>;
  errors: Record<string, string | null>;
  dsVars: Record<string, any>;
  scope: RenderScope;
  renderField: RenderField;
  /** 重载选项函数注册表（RF_OPTIONS 动作调用） */
  optionLoads: Record<string, () => void>;
  /** SET_OPTIONS 行/字段级选项覆盖：key -> {optionType, static, http} */
  optionConf: Record<string, any>;
  /** 注册字段加载状态（cpLoadings） */
  loadingMap: Record<string, boolean>;
  /** 容器类组件注册校验函数，返回值为错误信息或 null；返回解绑函数 */
  registerValidator: (key: string, fn: () => string | null) => () => void;
  initiator: { id?: string; name?: string };
  startDept: { id?: string; name?: string };
  isStart: boolean;
}

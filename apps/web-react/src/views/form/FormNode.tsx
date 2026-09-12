import React from 'react';
import type { FormItemConfig } from '@/types/workflow';
import { resolvePerm, useFormRuntime } from './context';
import { getFormComponent } from './registry';
import type { FieldMode, RenderScope } from './types';

interface FormNodeProps {
  item: FormItemConfig;
  /** 覆盖默认作用域（表格行 / 容器局部） */
  scopeOverride?: RenderScope;
}

/** 字段级渲染：权限(隐藏/只读/禁用)、标签、描述、错误、容器透传 */
export const FormNode: React.FC<FormNodeProps> = ({ item, scopeOverride }) => {
  const ctx = useFormRuntime();
  const key = item.key || item.id || '';
  const perm = resolvePerm(ctx, item);
  const activeScope = scopeOverride || ctx.scope;

  if (perm === 'H') return null;

  // 字段权限 D(禁止) 对组件表现为只读；设计态 D 会通过 baseMode 传入
  const mode: FieldMode = perm === 'D' && ctx.baseMode !== 'D' ? 'R' : perm;
  const props = item.props || {};
  const isContainer = props.isContainer === true;
  const mergeOverride = ctx.optionConf[key];
  const config: FormItemConfig = mergeOverride ? { ...item, props: { ...props, ...mergeOverride } } : item;
  const Component = getFormComponent(item.type);

  const value = isContainer ? undefined : activeScope.values?.[key];
  const onChange = (next: any) => activeScope.setValues({ [key]: next });

  const required = ctx.requiredConf[key] ?? (props.required === true || item.required === true);
  const error = ctx.errors[key];
  const hideLabel = props.hideLabel === true || isContainer;
  const baseMode = ctx.baseMode;
  const showRequiredStar = required && (perm === 'E' || perm === 'D' || baseMode === 'D');

  return (
    <div
      className={`w-form-node${isContainer ? ' w-form-node-container' : ''}`}
      data-field={key}
      data-type={item.type}
      style={{ width: '100%' }}
    >
      {!hideLabel && item.name ? (
        <div className="w-form-node-label">
          {showRequiredStar ? <span className="w-form-node-required">*</span> : null}
          {item.name}
        </div>
      ) : null}
      <div className="w-form-node-body">
        <Component
          config={config}
          mode={mode}
          value={value}
          onChange={onChange}
          scope={activeScope}
          renderField={ctx.renderField}
          dsVars={ctx.dsVars}
        />
      </div>
      {error ? <div className="w-form-node-error">{error}</div> : null}
      {props.desc ? <div className="w-form-node-desc">{props.desc}</div> : null}
    </div>
  );
};

export default FormNode;

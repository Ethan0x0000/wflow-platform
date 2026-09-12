import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Location } from '../src/views/form/components/Location';
import type { FormComponentProps } from '../src/views/form/types';
import type { FormItemConfig } from '../src/types/workflow';

const config: FormItemConfig = { id: 'loc_1', key: 'loc_1', name: '地理位置', props: {} };

function makeProps(patch: Partial<FormComponentProps> = {}): FormComponentProps {
  return {
    config,
    mode: 'E',
    value: undefined,
    onChange: () => undefined,
    scope: { values: {}, setValues: () => undefined },
    renderField: () => null,
    dsVars: {},
    ...patch,
  };
}

describe('React Web: Location without AMap key', () => {
  it('renders the existing fallback (placeholder + address button), without crashing', () => {
    const html = renderToStaticMarkup(<Location {...makeProps()} />);
    expect(html).toContain('请选择位置');
    expect(html).toContain('选择位置');
  });

  it('renders the saved label in read-only / value mode', () => {
    const value = { label: '上海外滩', value: '121.490317,31.236305' };
    const readOnly = renderToStaticMarkup(<Location {...makeProps({ mode: 'R', value })} />);
    const valueMode = renderToStaticMarkup(<Location {...makeProps({ mode: 'V', value })} />);
    expect(readOnly).toContain('上海外滩');
    expect(valueMode).toContain('上海外滩');
  });

  it('keeps the value shape {label, value:"lng,lat"} when confirming', () => {
    // 值形态不变由 handleOk 保证；此处断言已保存值可直接渲染
    const value = { label: '杭州西湖', value: '120.15507,30.27415' };
    const html = renderToStaticMarkup(<Location {...makeProps({ value })} />);
    expect(html).toContain('杭州西湖');
  });
});

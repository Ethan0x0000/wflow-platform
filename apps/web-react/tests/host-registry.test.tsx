import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { VueSfc } from '../src/views/form/components/VueSfc';
import {
  getHostFormComponent,
  hostComponentCodes,
  registerFormComponent,
  resolveHostFormComponent,
  unregisterFormComponent,
} from '../src/views/form/hostRegistry';
import type { FormComponentProps } from '../src/views/form/types';
import type { FormItemConfig } from '../src/types/workflow';

const Host = (props: FormComponentProps) => <div data-testid="host-component">{String(props.value ?? 'empty')}</div>;

function makeConfig(patch: Partial<FormItemConfig> = {}): FormItemConfig {
  return { id: 'field_1', key: 'field_1', name: '自定义组件', props: {}, ...patch };
}

function makeProps(config: FormItemConfig, value: unknown = undefined): FormComponentProps {
  return {
    config,
    mode: 'E',
    value,
    onChange: () => undefined,
    scope: { values: {}, setValues: () => undefined },
    renderField: () => null,
    dsVars: {},
  };
}

describe('React Web: host form component registry', () => {
  afterEach(() => {
    unregisterFormComponent('host.demo');
    unregisterFormComponent('cp.tax');
  });

  it('resolves a registered component from config.code / config.formCode', () => {
    registerFormComponent('host.demo', Host);
    expect(getHostFormComponent('host.demo')).toBe(Host);
    expect(resolveHostFormComponent(makeConfig({ code: 'host.demo' } as Partial<FormItemConfig>))).toBe(Host);
    expect(resolveHostFormComponent(makeConfig({ formCode: 'host.demo' } as Partial<FormItemConfig>))).toBe(Host);
    expect(hostComponentCodes(makeConfig({ code: 'host.demo', props: { cpType: 'other' } }))).toEqual([
      'host.demo',
      'other',
    ]);
  });

  it('resolves CustomComponent props (cpType) and VueSfc sfc keys', () => {
    registerFormComponent('cp.tax', Host);
    expect(resolveHostFormComponent(makeConfig({ props: { cpType: 'cp.tax' } }))).toBe(Host);
    expect(resolveHostFormComponent(makeConfig({ props: { sfc: 'cp.tax' } }))).toBe(Host);
  });

  it('renders the registered React component for a matching config', () => {
    registerFormComponent('host.demo', Host);
    const html = renderToStaticMarkup(<VueSfc {...makeProps(makeConfig({ props: { code: 'host.demo' } }), 'hello')} />);
    expect(html).toContain('data-testid="host-component"');
    expect(html).toContain('hello');
  });

  it('falls back to an Alert that mentions registerFormComponent when no code is registered', () => {
    const html = renderToStaticMarkup(
      <VueSfc {...makeProps(makeConfig({ props: { sfc: '<template><div /></template>' } }))} />
    );
    expect(html).not.toContain('data-testid="host-component"');
    expect(html).toContain('registerFormComponent');
    expect(html).toContain('尚未在 React 宿主端注册');
  });

  it('stops resolving after unregister', () => {
    registerFormComponent('host.demo', Host);
    expect(unregisterFormComponent('host.demo')).toBe(true);
    expect(resolveHostFormComponent(makeConfig({ code: 'host.demo' } as Partial<FormItemConfig>))).toBeUndefined();
    expect(unregisterFormComponent('host.demo')).toBe(false);
  });

  it('rejects empty registration codes', () => {
    expect(() => registerFormComponent('   ', Host)).toThrow();
  });
});

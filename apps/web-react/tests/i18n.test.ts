import { describe, expect, it } from 'vitest';
import { langOptions, messages, translate } from '../src/i18n';

describe('i18n', () => {
  it('exposes the same key tree for every language', () => {
    const collect = (node: unknown, prefix: string, out: string[]) => {
      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) collect(value, prefix ? `${prefix}.${key}` : key, out);
      } else {
        out.push(prefix);
      }
    };
    const zh: string[] = [];
    const en: string[] = [];
    collect(messages.zhCn, '', zh);
    collect(messages.en, '', en);
    expect(en.sort()).toEqual(zh.sort());
  });

  it('translates dotted keys per language', () => {
    expect(translate('zhCn', 'menu.workspace')).toBe('工作空间');
    expect(translate('en', 'menu.workspace')).toBe('Workspace');
    expect(translate('en', 'design.nav.publish')).toBe('Publish');
  });

  it('falls back to zhCn then the provided fallback', () => {
    expect(translate('en', 'design.base.rule.group')).toBe('Please set process form grouping');
    expect(translate('zhCn', 'missing.key', '兜底')).toBe('兜底');
    expect(translate('zhCn', 'missing.key')).toBe('missing.key');
  });

  it('offers zhCn and en language options', () => {
    expect(langOptions.map((option) => option.value)).toEqual(['zhCn', 'en']);
  });
});

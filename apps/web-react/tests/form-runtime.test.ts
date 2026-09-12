import { describe, it, expect } from 'vitest';
import { evaluateFormula, compileHook, registerFormHook } from '../src/utils/form-runtime';

describe('React Web: form runtime', () => {
  it('evaluates numeric formulas with operator precedence', () => {
    expect(evaluateFormula('formData.days * 8 + bonus / 2', { days: 3, bonus: 4 })).toBe(26);
  });

  it('rejects executable code, property access and non-finite results', () => {
    for (const expression of [
      'alert(1)',
      'formData.constructor',
      '1 / 0',
      'formData["days"]',
      'globalThis.location',
    ]) {
      expect(() => evaluateFormula(expression, { days: 1 })).toThrow();
    }
    expect(() => compileHook([], 'return document.cookie')).toThrow();
  });

  it('invokes only registered host functions', () => {
    registerFormHook('double', (value) => Number(value) * 2);
    expect(compileHook(['value'], 'double')(3)).toBe(6);
  });
});

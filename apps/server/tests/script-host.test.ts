import { describe, expect, it } from 'vitest';
import { runScript } from '../src/runtime';

describe('host-side script execution', () => {
  it('runs handler bodies with only the provided values in scope', () => {
    expect(runScript('return ctx.value + 1;', { ctx: { value: 1 } }, ['ctx'])).toBe(2);
    expect(runScript('request.data.answer = 42; return request.data.answer;', { request: { data: {} } }, ['request'])).toBe(42);
    expect(runScript('return typeof process;', { ctx: {} }, ['ctx'])).toBe('undefined');
    expect(() => runScript('return process.env;', { ctx: {} }, ['ctx'])).toThrow(/process is not defined/);
  });

  it('cuts off runaway scripts with a timeout', () => {
    expect(() => runScript('while (true) {}', { ctx: {} }, ['ctx'])).toThrow(/timed out/i);
  }, 5_000);
});

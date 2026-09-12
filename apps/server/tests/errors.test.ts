import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { INTERNAL_ERROR, INTERNAL_MESSAGE, classifyError } from '../src/errors';
import { ApiError } from '../src/models';
import { createHandler } from '../src/index';
import type { Runtime } from '../src/runtime';

const context = { method: 'GET', path: '/x', tenant: 't1' };

describe('error taxonomy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps ApiError status/message and attaches the taxonomy code', () => {
    expect(classifyError(new ApiError(409, '冲突'), context)).toEqual({ status: 409, message: '冲突', code: 'CONFLICT' });
    expect(classifyError(new ApiError(422, '校验'), context)).toEqual({ status: 422, message: '校验', code: 'UNPROCESSABLE_ENTITY' });
    expect(classifyError(new ApiError(418, '茶壶', 'TEAPOT'), context)).toEqual({ status: 418, message: '茶壶', code: 'TEAPOT' });
    let zodError: unknown;
    try { z.string().parse(1); } catch (error) { zodError = error; }
    expect(classifyError(zodError, context)).toEqual({ status: 422, message: '请求数据或流程配置不合法', code: 'INVALID_REQUEST' });
    expect(classifyError(new SyntaxError('bad json'), context).status).toBe(422);
  });

  it('logs unexpected errors with request context and hides internals behind a generic 500', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');
    expect(classifyError(error, { method: 'POST', path: '/task/handler', tenant: 'acme' })).toEqual({ status: 500, message: INTERNAL_MESSAGE, code: INTERNAL_ERROR });
    expect(log).toHaveBeenCalledWith('[workflow] unhandled request error', expect.objectContaining({ method: 'POST', path: '/task/handler', tenant: 'acme', message: 'boom', stack: expect.any(String) }));
  });

  it('returns the 500 contract over http and logs the tenant', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const runtime = { tenant: 'acme', workerError: undefined, authenticate: () => { throw new Error('boom'); } } as unknown as Runtime;
    const handler = createHandler({ forTenant: async () => runtime } as unknown as Runtime);
    const server = createServer((request, response) => { void handler(request, response); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const response = await fetch(`${base}/notify/list`, { headers: { tenantId: 'acme' } });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ code: 500, data: null, msg: INTERNAL_MESSAGE });
      expect(log).toHaveBeenCalledWith('[workflow] unhandled request error', expect.objectContaining({ method: 'GET', path: '/notify/list', tenant: 'acme', message: 'boom' }));
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
});

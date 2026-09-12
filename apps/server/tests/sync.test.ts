import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { SyncRule } from 'wflow-core';
import { applySyncRule } from '../src/runtime';
import { WorkflowStore } from '../src/store';

const context = { tenantId: '1', instanceId: 'inst-1', businessKey: 'inst-1', initiatorId: 'u-employee', definition: { id: 'leave-request', version: 1 } };
const rule = (overrides: Partial<SyncRule>): SyncRule => ({ enable: true, events: ['create', 'update', 'pass', 'delete'], type: 'DB', ...overrides });
const businessSchema = z.record(z.string(), z.unknown());

describe('business data synchronisation', () => {
  it('maps and ranges fields into the host store and deletes on the delete event', async () => {
    const store = new WorkflowStore(':memory:');
    try {
      await applySyncRule(store, { context, event: 'create', rule: rule({ tbName: 'orders', range: false, fieldMapping: [{ source: 'reason', target: 'leave_reason' }, { source: 'amount', type: 'number' }] }), data: { reason: 'sick', amount: 3, ignored: true } });
      expect(store.get('business', 'orders:inst-1', businessSchema)).toEqual({ id: 'inst-1', leave_reason: 'sick', amount: 3 });
      await applySyncRule(store, { context, event: 'update', rule: rule({ tbName: 'orders', range: true, fieldMapping: [{ source: 'reason', target: 'leave_reason' }] }), data: { reason: 'sick', amount: 4 } });
      expect(store.get('business', 'orders:inst-1', businessSchema)).toEqual({ id: 'inst-1', leave_reason: 'sick', amount: 4 });
      await applySyncRule(store, { context, event: 'delete', rule: rule({ tbName: 'orders' }), data: { reason: 'sick' } });
      expect(store.get('business', 'orders:inst-1', businessSchema)).toBeUndefined();
    } finally { store.close(); }
  });
  it('skips disabled rules and events outside the configured list', async () => {
    const store = new WorkflowStore(':memory:');
    try {
      await applySyncRule(store, { context, event: 'pass', rule: rule({ enable: false, tbName: 'orders' }), data: { reason: 'sick' } });
      await applySyncRule(store, { context, event: 'revoke', rule: rule({ tbName: 'orders', events: ['create'] }), data: { reason: 'sick' } });
      expect(store.list('business', businessSchema)).toEqual([]);
    } finally { store.close(); }
  });
  it('runs preCover then applies API rules against the event url', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => { calls.push({ url: request.url ?? '', body: JSON.parse(Buffer.concat(chunks).toString()) }); response.writeHead(200).end('{}'); });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const store = new WorkflowStore(':memory:');
    try {
      await applySyncRule(store, { context, event: 'pass', rule: rule({ type: 'API', apiUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/sync`, preCover: true, preJs: 'return { reason: reason + "!" };', fieldMapping: [{ source: 'reason' }] }), data: { reason: 'done' } });
      expect(calls).toEqual([{ url: '/sync/pass', body: { reason: 'done!' } }]);
    } finally { store.close(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
});

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { InProcessBroadcaster, type BroadcastEvent } from '../src/broadcaster';
import { WorkflowStore } from '../src/store';
import { Runtime } from '../src/runtime';
import { createHandler } from '../src/index';

async function take(stream: AsyncIterable<BroadcastEvent>, count: number): Promise<BroadcastEvent[]> {
  const iterator = stream[Symbol.asyncIterator]();
  const events: BroadcastEvent[] = [];
  for (let index = 0; index < count; index++) {
    const { value, done } = await iterator.next();
    if (done) break;
    events.push(value);
  }
  await iterator.return?.();
  return events;
}

function eventClient(response: Response) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const notes: Record<string, unknown>[] = [];
  const waiters: Array<(note: Record<string, unknown> | undefined) => void> = [];
  let markReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => { markReady = resolve; });
  const settle = (note?: Record<string, unknown>) => {
    if (!note) { markReady(); return; }
    const waiter = waiters.shift();
    if (waiter) waiter(note); else notes.push(note);
  };
  let buffer = '';
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index: number;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
          const line = frame.split('\n').find((entry) => entry.startsWith('data: '));
          if (!line) continue;
          const text = line.slice(6);
          settle(!text || text === '{}' ? undefined : JSON.parse(text) as Record<string, unknown>);
        }
      }
    } catch { /* client aborted */ } finally { markReady(); for (const waiter of waiters.splice(0)) waiter(undefined); }
  })();
  return {
    ready,
    next: (timeout = 5_000) => new Promise<Record<string, unknown> | undefined>((resolve) => {
      if (notes.length) return resolve(notes.shift());
      const timer = setTimeout(() => resolve(undefined), timeout);
      waiters.push((note) => { clearTimeout(timer); resolve(note); });
    }),
  };
}

describe('InProcessBroadcaster', () => {
  it('delivers each event to every subscriber of a target and never crosses targets', async () => {
    const broadcaster = new InProcessBroadcaster();
    const first = take(broadcaster.subscribe('u-1'), 2);
    const second = take(broadcaster.subscribe('u-1'), 2);
    const other = take(broadcaster.subscribe('u-2'), 1);
    broadcaster.publish('u-1', { id: 'n1', target: 'u-1', data: { id: 'n1' } });
    broadcaster.publish('u-2', { id: 'n3', target: 'u-2', data: { id: 'n3' } });
    broadcaster.publish('u-1', { id: 'n2', target: 'u-1', data: { id: 'n2' } });
    expect((await first).map((event) => event.id)).toEqual(['n1', 'n2']);
    expect((await second).map((event) => event.id)).toEqual(['n1', 'n2']);
    expect((await other).map((event) => event.id)).toEqual(['n3']);
    broadcaster.close();
  });

  it('ends subscribed iterators on close and releases returned subscriptions', async () => {
    const broadcaster = new InProcessBroadcaster();
    const iterator = broadcaster.subscribe('u-1')[Symbol.asyncIterator]();
    broadcaster.close();
    expect(await iterator.next()).toEqual({ value: undefined, done: true });

    const stream = broadcaster.subscribe('u-1')[Symbol.asyncIterator]();
    await stream.return?.();
    expect(await stream.next()).toEqual({ value: undefined, done: true });
    broadcaster.close();
  });

  it('pushes notifications through the SSE endpoint with target isolation', async () => {
    const store = new WorkflowStore(':memory:');
    const runtime = new Runtime(store);
    const server = createServer((request, response) => { void createHandler(runtime)(request, response); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const abort = new AbortController();
    try {
      const employeeSse = eventClient(await fetch(`${base}/notify/subscribe`, { headers: { wflowToken: runtime.session('u-employee').token }, signal: abort.signal }));
      const managerSse = eventClient(await fetch(`${base}/notify/subscribe`, { headers: { wflowToken: runtime.session('u-manager').token }, signal: abort.signal }));
      await Promise.all([employeeSse.ready, managerSse.ready]);
      runtime.notify({ id: 'n-emp', level: 'INFO', title: '给员工', content: 'hello', target: 'u-employee', instId: 'i', unread: true, createTime: new Date().toISOString() });
      runtime.notify({ id: 'n-manager', level: 'INFO', title: '给经理', content: 'hello', target: 'u-manager', instId: 'i', unread: true, createTime: new Date().toISOString() });
      expect(await employeeSse.next()).toMatchObject({ id: 'n-emp', target: 'u-employee' });
      expect(await managerSse.next()).toMatchObject({ id: 'n-manager', target: 'u-manager' });
      expect(await managerSse.next(200)).toBeUndefined();
    } finally {
      abort.abort();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      store.close();
    }
  });
});

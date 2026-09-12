/**
 * Notification fan-out for `/notify/subscribe`. The default implementation is
 * in-process (single node). A distributed deployment can swap in a
 * Redis pub/sub Broadcaster implementing the same interface; notification
 * creation and the SSE endpoint only depend on this contract.
 */
export interface BroadcastEvent {
  id: string;
  target: string;
  data: unknown;
}

export interface Broadcaster {
  subscribe(target: string): AsyncIterable<BroadcastEvent>;
  publish(target: string, event: BroadcastEvent): void;
  close(): void;
}

class Channel<T> implements AsyncIterableIterator<T> {
  private queue: T[] = [];
  private waiters: Array<(result: IteratorResult<T>) => void> = [];
  private closed = false;
  push(value: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value, done: false });
    else this.queue.push(value);
  }
  next(): Promise<IteratorResult<T>> {
    if (this.queue.length) return Promise.resolve({ value: this.queue.shift()!, done: false });
    if (this.closed) return Promise.resolve({ value: undefined as never, done: true });
    return new Promise((resolve) => this.waiters.push(resolve));
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.queue = [];
    for (const waiter of this.waiters.splice(0)) waiter({ value: undefined as never, done: true });
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<T> { return this; }
}

export class InProcessBroadcaster implements Broadcaster {
  private readonly channels = new Map<string, Set<Channel<BroadcastEvent>>>();
  subscribe(target: string): AsyncIterable<BroadcastEvent> {
    const channel = new Channel<BroadcastEvent>();
    const set = this.channels.get(target) ?? new Set<Channel<BroadcastEvent>>();
    set.add(channel);
    this.channels.set(target, set);
    const release = () => { set.delete(channel); if (!set.size) this.channels.delete(target); channel.close(); };
    return {
      [Symbol.asyncIterator](): AsyncIterator<BroadcastEvent> {
        return {
          next: () => channel.next(),
          return: () => { release(); return Promise.resolve({ value: undefined as never, done: true }); },
          throw: (error?: unknown) => { release(); return Promise.reject(error); },
        };
      },
    };
  }
  publish(target: string, event: BroadcastEvent): void {
    for (const channel of this.channels.get(target) ?? []) channel.push(event);
  }
  close(): void {
    for (const set of this.channels.values()) for (const channel of set) channel.close();
    this.channels.clear();
  }
}

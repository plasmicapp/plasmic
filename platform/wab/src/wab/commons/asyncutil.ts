import { AsyncQueue } from "async";

export async function sequentially<T>(promises: Promise<T>[]) {
  const result: T[] = [];
  for (const promise of promises) {
    result.push(await promise);
  }
  return result;
}

export async function drainQueue(queue: AsyncQueue<any>) {
  while (!queue.idle()) {
    await queue.drain();
  }
}

/**
 * This is a simple queue. Unlike asynclib.queue, there is no single processor
 * of the tasks - anyone can "pull" from the queue. Unbounded.
 */
export class PushPullQueue<T> {
  private itemsReceived: T[] = [];
  private waitingResolvers: ((item: T | undefined) => void)[] = [];
  private closed = false;

  /** Pushes an item to the queue for the next puller. */
  push(item: T): void {
    if (this.closed) {
      return;
    }

    const resolver = this.waitingResolvers.shift();
    if (resolver) {
      resolver(item);
    } else {
      this.itemsReceived.push(item);
    }
  }

  /**
   * Pulls the next item from the queue.
   * Returns undefined if closed and the queue is drained.
   */
  async pull(): Promise<T | undefined> {
    const item = this.itemsReceived.shift();
    if (item) {
      return Promise.resolve(item);
    } else if (this.closed) {
      return undefined;
    } else {
      return new Promise((resolve) => {
        this.waitingResolvers.push(resolve);
      });
    }
  }

  /** Closes this queue, causing future pulls to return undefined. */
  close() {
    this.closed = true;
    this.waitingResolvers.forEach((resolve) => resolve(undefined));
    this.waitingResolvers.length = 0;
  }
}

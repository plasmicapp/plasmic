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
  private waitingResolvers: ((item: T) => void)[] = [];

  push(item: T) {
    const resolver = this.waitingResolvers.shift();
    if (resolver) {
      resolver(item);
    } else {
      this.itemsReceived.push(item);
    }
  }

  async pull(): Promise<T> {
    const item = this.itemsReceived.shift();
    if (item) {
      return Promise.resolve(item);
    } else {
      return new Promise((resolve) => {
        this.waitingResolvers.push(resolve);
      });
    }
  }
}

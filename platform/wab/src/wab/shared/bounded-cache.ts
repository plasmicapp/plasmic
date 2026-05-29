/**
 * A size-capped cache that evicts by least-recently-written.
 *
 * Backed by a `Map`, which preserves insertion order. On `set` we refresh the
 * key's position (delete + re-insert) and evict the oldest entries once
 * `maxSize` is exceeded. Note that `get` does NOT refresh position, so this is
 * not a true read-LRU. That's intentional: the goal is only to keep transient
 * keys (e.g. server-query cache keys whose id embeds a full code body that
 * changes on every edit) from growing without bound, while comfortably holding
 * the live entries of a normal multi-query project. An entry evicted while
 * still in use simply causes a re-fetch on the next read.
 */
export class BoundedCache<V> {
  private readonly map = new Map<string, V>();

  constructor(private readonly maxSize: number) {
    if (maxSize < 1) {
      throw new Error(`BoundedCache maxSize must be >= 1, got ${maxSize}`);
    }
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): V | undefined {
    return this.map.get(key);
  }

  set(key: string, value: V): this {
    // Refresh recency so the most-recently-used keys are evicted last.
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value as string | undefined;
      if (oldest === undefined) {
        break;
      }
      this.map.delete(oldest);
    }
    return this;
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  keys(): string[] {
    return Array.from(this.map.keys());
  }

  get size(): number {
    return this.map.size;
  }
}

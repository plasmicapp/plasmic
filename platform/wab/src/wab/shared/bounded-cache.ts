/**
 * A size-capped cache that evicts by least-recently-written.
 *
 * Backed by a `Map`, which preserves insertion order. Refresh key position on `set`
 * (delete + re-insert). Evicts oldest entries once `maxSize` is exceeded.
 * `get` does not refresh position, we only care about keeping transient keys from
 * growing without bound, while holding live entries of a normal multi-query project.
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
    // Evict oldest entries (Map preserves insertion order) if over maxSize
    for (const oldestKey of this.map.keys()) {
      if (this.map.size <= this.maxSize) {
        break;
      }
      this.map.delete(oldestKey);
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

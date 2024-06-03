class DeepMapEntry<T> {
  private root: Map<any, any>;
  private closest: Map<any, any>;
  private closestIdx: number = 0;
  isDisposed = false;

  constructor(private base: Map<any, any>, private args: any[]) {
    let current: undefined | Map<any, any> = (this.closest = this.root = base);
    let i = 0;
    for (; i < this.args.length - 1; i++) {
      current = current!.get(args[i]);
      if (current) {
        this.closest = current;
      } else {
        break;
      }
    }
    this.closestIdx = i;
  }

  exists(): boolean {
    this.assertNotDisposed();
    const l = this.args.length;
    return this.closestIdx >= l - 1 && this.closest.has(this.args[l - 1]);
  }

  get(): T {
    this.assertNotDisposed();
    if (!this.exists()) {
      throw new Error("Entry doesn't exist");
    }
    return this.closest.get(this.args[this.args.length - 1]);
  }

  set(value: T) {
    this.assertNotDisposed();
    const l = this.args.length;
    let current: Map<any, any> = this.closest;
    // create remaining maps
    for (let i = this.closestIdx; i < l - 1; i++) {
      const m = new Map();
      current.set(this.args[i], m);
      current = m;
    }
    this.closestIdx = l - 1;
    this.closest = current;
    current.set(this.args[l - 1], value);
  }

  delete() {
    this.assertNotDisposed();
    if (!this.exists()) {
      throw new Error("Entry doesn't exist");
    }
    const l = this.args.length;
    this.closest.delete(this.args[l - 1]);
    // clean up remaining maps if needed (reconstruct stack first)
    let c = this.root;
    const maps: Map<any, any>[] = [c];
    for (let i = 0; i < l - 1; i++) {
      c = c.get(this.args[i])!;
      maps.push(c);
    }
    for (let i = maps.length - 1; i > 0; i--) {
      if (maps[i].size === 0) {
        maps[i - 1].delete(this.args[i - 1]);
      }
    }
    this.isDisposed = true;
  }

  private assertNotDisposed() {
    // TODO: once this becomes annoying, we should introduce a reset method to re-run the constructor logic
    if (this.isDisposed) {
      throw new Error("Concurrent modification exception");
    }
  }
}

export class DeepMap<T> {
  private store = new Map<any, any>();
  private argsLength = -1;
  private last: DeepMapEntry<T> | undefined;

  entry(args: any[]): DeepMapEntry<T> {
    if (this.argsLength === -1) {
      this.argsLength = args.length;
    } else if (this.argsLength !== args.length) {
      throw new Error(
        `DeepMap should be used with functions with a consistent length, expected: ${this.argsLength}, got: ${args.length}`
      );
    }
    if (this.last) {
      this.last.isDisposed = true;
    }

    return (this.last = new DeepMapEntry(this.store, args));
  }
}

/**
 * A memoizing wrapper that takes in the cache to use for memoization.
 * This allows you to memoize a set of functions for a while, and when
 * no longer needed, throw the cache away and reclaim the memory.
 *
 * class MemoizedStuff {
 *   private cache = new Map();
 *   memozied1 = deepMapMemoized(this.cache, func1);
 *   memozied2 = deepMapMemoized(this.cache, func2);
 * }
 *
 * const stuff = new MemoizedStuff();
 * stuff.memoized1();
 *
 * When youre done with `stuff`, let garbage collector take it away
 */
export function deepMapMemoized<T extends (...args: any[]) => any>(
  cache: Map<string, DeepMap<any>>,
  func: T,
  opts: {
    funcKey: string;
    argKeys?: (args: Parameters<T>) => any[];
  }
) {
  const funcKey = opts.funcKey;
  if (!funcKey || funcKey.length === 0) {
    throw new Error(`Cannot memoize function without proper funcKey: ${func}`);
  }

  if (cache.has(funcKey)) {
    throw new Error(`Duplicate funcKey ${funcKey}`);
  }

  const map = new DeepMap();
  cache.set(funcKey, map);

  const wrapped = ((...args: Parameters<T>) => {
    const argKeys = opts?.argKeys?.(args) ?? args;
    let entry = map!.entry(argKeys);
    if (entry.exists()) {
      return entry.get();
    }
    const result = func(...args);
    // Look up the entry again, as the func() above may have altered the entries
    entry = map!.entry(argKeys);
    entry.set(result);
    return result;
  }) as T;
  return wrapped;
}

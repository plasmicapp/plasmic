import { BoundedCache } from "@/wab/shared/bounded-cache";

describe("BoundedCache", () => {
  it("stores and retrieves entries", () => {
    const cache = new BoundedCache<number>(3);
    cache.set("a", 1).set("b", 2);
    expect(cache.has("a")).toBe(true);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.size).toBe(2);
    expect(cache.keys()).toEqual(["a", "b"]);
  });

  it("evicts the oldest entry once maxSize is exceeded", () => {
    const cache = new BoundedCache<number>(2);
    cache.set("a", 1).set("b", 2).set("c", 3);
    expect(cache.size).toBe(2);
    expect(cache.has("a")).toBe(false);
    expect(cache.keys()).toEqual(["b", "c"]);
  });

  it("refreshes recency on set so reused keys are evicted last", () => {
    const cache = new BoundedCache<number>(2);
    cache.set("a", 1).set("b", 2);
    // Touch "a" so it becomes the most-recent; "b" is now oldest.
    cache.set("a", 11);
    cache.set("c", 3);
    expect(cache.has("a")).toBe(true);
    expect(cache.get("a")).toBe(11);
    expect(cache.has("b")).toBe(false);
    expect(cache.keys()).toEqual(["a", "c"]);
  });

  it("does not refresh recency on get (eviction is by write, not read)", () => {
    const cache = new BoundedCache<number>(2);
    cache.set("a", 1).set("b", 2);
    // Reading "a" must not save it from eviction; only writes refresh position.
    expect(cache.get("a")).toBe(1);
    cache.set("c", 3);
    expect(cache.has("a")).toBe(false);
    expect(cache.keys()).toEqual(["b", "c"]);
  });

  it("supports delete and clear", () => {
    const cache = new BoundedCache<number>(3);
    cache.set("a", 1).set("b", 2);
    expect(cache.delete("a")).toBe(true);
    expect(cache.delete("a")).toBe(false);
    expect(cache.size).toBe(1);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.keys()).toEqual([]);
  });

  it("rejects an invalid maxSize", () => {
    expect(() => new BoundedCache<number>(0)).toThrow();
  });
});

// Module augmentation (not ambient declaration) — the export {} makes this a
// module file so that declare module "mobx" augments rather than replaces it.
export {};

// TypeScript 6 added getOrInsert/getOrInsertComputed to Map (ES2025).
// MobX ObservableMap does not implement them yet; augment here to restore
// assignability between ObservableMap and Map.
declare module "mobx" {
  interface ObservableMap<K = unknown, V = unknown> {
    getOrInsert(key: K, defaultValue: V): V;
    getOrInsertComputed(key: K, callback: (key: K) => V): V;
  }
}

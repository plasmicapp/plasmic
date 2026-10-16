// CommonJS module runtime for live preview. Studio transpiles each module and
// sends it here; a changed module evicts itself and its transitive importers.

import type { AssetModule, CodeModule } from "./runtime-types";

type Module = CodeModule | AssetModule;

const textOf = (mod: Module) => (mod.type === "code" ? mod.code : mod.source);

const EXTS = ["", ".tsx", ".ts", ".jsx", ".js"];

export function createLiveRuntime(builtins: Record<string, unknown>) {
  const modules = new Map<string, Module>();
  const instances = new Map<string, { exports: any }>();
  const importers = new Map<string, Set<string>>();
  const styles = new Map<string, HTMLStyleElement>();

  const keyOf = (name: string) => name.replace(/^\.\//, "");

  const resolve = (spec: string) => {
    if (!spec.startsWith(".")) {
      if (spec in builtins) {
        return spec;
      }
      throw new Error(`Live preview cannot import unknown module "${spec}"`);
    }
    const key = keyOf(spec);
    const found = EXTS.map((ext) => key + ext).find((k) => modules.has(k));
    if (!found) {
      throw new Error(`Live preview module "${spec}" was not sent`);
    }
    return found;
  };

  const load = (key: string): any => {
    if (key in builtins) {
      return builtins[key];
    }
    const existing = instances.get(key);
    if (existing) {
      return existing.exports;
    }
    const mod = modules.get(key)!;
    const instance = { exports: {} as any };
    instances.set(key, instance);
    if (mod.type === "asset") {
      // First evaluation order is ES import order, so CSS cascades as it would
      // in a bundle. Later edits replace the text in place.
      const style = document.createElement("style");
      style.dataset.liveModule = key;
      style.textContent = mod.source;
      document.head.append(style);
      styles.set(key, style);
      return instance.exports;
    }
    const require = (spec: string) => {
      const dep = resolve(spec);
      if (!importers.has(dep)) {
        importers.set(dep, new Set());
      }
      importers.get(dep)!.add(key);
      return load(dep);
    };
    try {
      new Function(
        "require",
        "module",
        "exports",
        `${mod.code}\n//# sourceURL=plasmic-live/${key}`,
      )(require, instance, instance.exports);
    } catch (err) {
      instances.delete(key);
      throw err;
    }
    return instance.exports;
  };

  const evict = (key: string) => {
    if (instances.delete(key)) {
      importers.get(key)?.forEach(evict);
    }
  };

  return {
    require: (spec: string) => load(resolve(spec)),
    update(mods: Module[]) {
      for (const mod of mods) {
        const key = keyOf(mod.fileName);
        const prev = modules.get(key);
        modules.set(key, mod);
        if (prev && textOf(prev) === textOf(mod)) {
          continue;
        }
        const style = styles.get(key);
        if (style) {
          style.textContent = textOf(mod);
        } else {
          evict(key);
        }
      }
    },
  };
}

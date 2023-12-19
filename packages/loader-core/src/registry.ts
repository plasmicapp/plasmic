import { LoaderBundleOutput } from "@plasmicapp/loader-fetcher";

const isBrowser =
  typeof window !== "undefined" &&
  window != null &&
  typeof window.document !== "undefined";

export class Registry {
  private loadedModules: Record<string, any> = {};
  private registeredModules: Record<string, any> = {};
  private modules: Record<string, string> = {};

  constructor() {}

  register(name: string, module: any) {
    this.registeredModules[name] = module;
  }

  isEmpty() {
    return Object.keys(this.loadedModules).length === 0;
  }

  clear() {
    this.loadedModules = {};
  }

  getRegisteredModule(name: string) {
    return this.registeredModules[name];
  }

  hasModule(name: string, opts: { forceOriginal?: boolean } = {}) {
    if (name in this.registeredModules && !opts.forceOriginal) {
      return true;
    }

    return name in this.modules;
  }

  load(name: string, opts: { forceOriginal?: boolean } = {}) {
    if (name in this.registeredModules && !opts.forceOriginal) {
      return this.registeredModules[name];
    }

    if (name in this.loadedModules) {
      return this.loadedModules[name];
    }

    if (
      !this.modules[name] &&
      (globalThis as any).__PLASMIC_CHUNKS &&
      !!(globalThis as any).__PLASMIC_CHUNKS[name]
    ) {
      this.modules[name] = (globalThis as any).__PLASMIC_CHUNKS[name];
    }

    if (
      !this.modules[name] &&
      (globalThis as any).__PlasmicBundlePromises &&
      !!typeof (globalThis as any).__PlasmicBundlePromises[name] &&
      !!(globalThis as any).__PlasmicBundlePromises[name].then
    ) {
      throw (globalThis as any).__PlasmicBundlePromises[name];
    }

    if (!(name in this.modules)) {
      throw new Error(`Unknown module ${name}`);
    }

    const code = this.modules[name];

    const requireFn = isBrowser
      ? (dep: string) => {
          const normalizedDep = resolvePath(dep, name);
          return this.load(normalizedDep);
        }
      : (dep: string) => {
          try {
            const normalizedDep = resolvePath(dep, name);
            return this.load(normalizedDep);
          } catch (err) {
            try {
              // Might be a nodeJs module such as tty
              return eval("require")(dep);
            } catch {
              throw err;
            }
          }
        };

    let func;
    try {
      func = new Function("require", "exports", code);
    } catch (err) {
      throw new Error(`PLASMIC: Failed to create function for ${name}: ${err}`);
    }
    const exports = {};
    this.loadedModules[name] = exports;
    try {
      func(requireFn, exports);
    } catch (err: any) {
      // Delete exports from loadedModules, so subsequent uses don't incorrectly
      // believe that this module has been loaded.
      delete this.loadedModules[name];
      if (!(err instanceof Error) && !!err && !!err.then) {
        // Re-throw the Promise
        throw err;
      }
      throw new Error(`PLASMIC: Failed to load ${name}: ${err}`);
    }
    return exports;
  }

  updateModules(bundle: LoaderBundleOutput) {
    let updated = false;
    for (const mod of isBrowser
      ? bundle.modules.browser
      : bundle.modules.server) {
      if (
        mod.type === "code" &&
        !!mod.code &&
        mod.code !== this.modules[mod.fileName]
      ) {
        this.modules[mod.fileName] = mod.code;
        if (!(globalThis as any).__PLASMIC_CHUNKS) {
          (globalThis as any).__PLASMIC_CHUNKS = {};
        }
        (globalThis as any).__PLASMIC_CHUNKS[mod.fileName] = mod.code;
        updated = true;
      }
    }

    if (updated) {
      // TODO: do something more efficient than tearing everything down?
      this.clear();
    }
  }
}

function resolvePath(path: string, from: string) {
  const fromParts = from.split("/");
  const pathParts = path.split("/");
  if (pathParts.length === 0) {
    return path;
  }

  if (pathParts[0] === ".") {
    return [
      ...fromParts.slice(0, fromParts.length - 1),
      ...pathParts.slice(1),
    ].join("/");
  } else if (pathParts[0] === "..") {
    let count = 0;
    for (const part of pathParts) {
      if (part === "..") {
        count += 1;
      } else {
        break;
      }
    }
    return [
      ...fromParts.slice(0, fromParts.length - count - 1),
      ...pathParts.slice(count),
    ].join("/");
  } else {
    return path;
  }
}

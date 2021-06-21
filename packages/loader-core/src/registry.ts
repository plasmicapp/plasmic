import { LoaderBundleOutput } from './api';

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

    if (!(name in this.modules)) {
      throw new Error(`Unknown module ${name}`);
    }

    const code = this.modules[name];

    const require = (dep: string) => {
      const normalizedDep = resolvePath(dep, name);
      return this.load(normalizedDep);
    };

    const func = new Function('require', 'exports', code);
    const exports = {};
    this.loadedModules[name] = exports;
    func(require, exports);
    return exports;
  }

  updateModules(bundle: LoaderBundleOutput) {
    let updated = false;
    for (const mod of bundle.modules) {
      if (mod.type === 'code' && mod.code !== this.modules[mod.fileName]) {
        this.modules[mod.fileName] = mod.code;
        updated = true;
        console.log('UPDATED module', mod.fileName);
      }
    }

    if (updated) {
      // TODO: do something more efficient than tearing everything down?
      this.clear();
    }
  }
}

function resolvePath(path: string, from: string) {
  const fromParts = from.split('/');
  const pathParts = path.split('/');
  if (pathParts.length === 0) {
    return path;
  }

  if (pathParts[0] === '.') {
    return [
      ...fromParts.slice(0, fromParts.length - 1),
      ...pathParts.slice(1),
    ].join('/');
  } else if (pathParts[0] === '..') {
    let count = 0;
    for (const part of pathParts) {
      if (part === '..') {
        count += 1;
      } else {
        break;
      }
    }
    return [
      ...fromParts.slice(0, fromParts.length - count - 1),
      ...pathParts.slice(count),
    ].join('/');
  } else {
    return path;
  }
}

import type * as FS from "fs";

let secretRequire: ((module: string) => any) | undefined;
let secretSyncRequire: ((module: string) => any) | undefined;
try {
  // Secretly use require/import without webpack knowing
  // eslint-disable-next-line
  secretRequire = secretSyncRequire = eval("require");
} catch (err) {
  try {
    // eslint-disable-next-line
    secretRequire = eval("(module) => import(module)");
  } catch (e) {
    secretRequire = undefined;
  }
}

export async function serverRequire<T>(module: string): Promise<T> {
  if (!secretRequire) {
    throw new Error(
      `Unexpected serverRequire() -- can only do this from a Node server!`
    );
  }
  return secretRequire(module) as Promise<T>;
}

export async function tryServerRequire<T>(
  module: string
): Promise<T | undefined> {
  try {
    const require = await serverRequire<T>(module);
    return require;
  } catch {
    return undefined;
  }
}

export async function tryServerRequires<T>(
  modules: string[]
): Promise<T | undefined> {
  for (const module of modules) {
    const require = await tryServerRequire<T>(module);
    if (require != null) {
      return require;
    }
  }
  return undefined;
}

export async function serverRequireFs() {
  return serverRequire<typeof FS>("fs");
}

// Stands in for `import * as X from name`, resolved on first property access.
// Turbopack vendors no app-router-context in its app-route layer, so statically
// importing next/navigation or next/router breaks sitemap.ts/robots.ts/route.ts.
export function lazyServerModule<T extends object>(name: string): T {
  let module: any;
  const get = () => {
    if (!module) {
      if (!secretSyncRequire) {
        throw new Error(`Unexpected require(${name}) outside a Node server!`);
      }
      module = secretSyncRequire(name);
    }
    return module;
  };
  return new Proxy({} as T, {
    get: (_target, prop) => get()[prop],
    has: (_target, prop) => prop in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_target, prop) => {
      const desc = Reflect.getOwnPropertyDescriptor(get(), prop);
      return desc && { ...desc, configurable: true };
    },
  });
}

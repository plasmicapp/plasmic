const root = globalThis as any;

export interface CodeLibraryMeta {
  /**
   * Any unique name
   */
  name: string;
  /**
   * The symbol to be imported and used in expressions: `$$.jsIdentifier`
   */
  jsIdentifier: string;
  /**
   * The NPM package to import from
   */
  importPath: string;
  /**
   * default: `import Foo from "foo";`
   * namespace: `import * as Foo from "foo";`
   * named: `import { Foo } from "foo"`
   */
  importType: "default" | "namespace" | "named";
  /**
   * Required if `importType` is `named`.
   */
  namedImport?: string;
  /**
   * Only relevant if `importType` is `default`. It means there's no `default`
   * export, even though the lib is imported as `import Foo from "foo";`
   */
  isSyntheticDefaultImport?: boolean;
  /**
   * Documentation files
   */
  files: { fileName: string; contents: string }[];
}

export interface CodeLibraryRegistration {
  lib: any;
  meta: CodeLibraryMeta;
}

declare global {
  interface Window {
    __PlasmicLibraryRegistry: CodeLibraryRegistration[];
  }
}

if (root.__PlasmicLibraryRegistry == null) {
  root.__PlasmicLibraryRegistry = [];
}

export function registerLibrary(lib: any, meta: CodeLibraryMeta) {
  // Check for duplicates
  if (
    root.__PlasmicLibraryRegistry.some(
      (r: CodeLibraryRegistration) => r.lib === lib && r.meta.name === meta.name
    )
  ) {
    return;
  }
  root.__PlasmicLibraryRegistry.push({ lib, meta });
}

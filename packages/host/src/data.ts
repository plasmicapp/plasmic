import { PrimitiveType } from "./index";
const root = require("window-or-global");

export type Fetcher = (...args: any[]) => Promise<any>;

export interface FetcherMeta {
  /**
   * Any unique identifying string for this fetcher.
   */
  name: string;
  /**
   * The Studio-user-friendly display name.
   */
  displayName?: string;
  /**
   * The symbol to import from the importPath.
   */
  importName?: string;
  args: { name: string; type: PrimitiveType }[];
  returns: PrimitiveType;
  /**
   * Either the path to the fetcher relative to `rootDir` or the npm
   * package name
   */
  importPath: string;
  /**
   * Whether it's a default export or named export
   */
  isDefaultExport?: boolean;
}

export interface FetcherRegistration {
  fetcher: Fetcher;
  meta: FetcherMeta;
}

declare global {
  interface Window {
    __PlasmicFetcherRegistry: FetcherRegistration[];
  }
}

root.__PlasmicFetcherRegistry = [];

export function registerFetcher(fetcher: Fetcher, meta: FetcherMeta) {
  root.__PlasmicFetcherRegistry.push({ fetcher, meta });
}

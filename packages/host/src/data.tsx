import React, {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
} from "react";
import { tuple } from "./common";

export type DataDict = Record<string, any>;

export const DataContext = createContext<DataDict | undefined>(undefined);

export type DataMeta = {
  advanced?: boolean;
  hidden?: boolean;
  label?: string;
};

export function mkMetaName(name: string) {
  return `__plasmic_meta_${name}`;
}

export function mkMetaValue(meta: Partial<DataMeta>): DataMeta {
  return meta;
}

export function applySelector(
  rawData: DataDict | undefined,
  selector: string | undefined
): any {
  if (!selector) {
    return undefined;
  }
  let curData = rawData;
  for (const key of selector.split(".")) {
    curData = curData?.[key];
  }
  return curData;
}

export type SelectorDict = Record<string, string | undefined>;

export function useSelector(selector: string | undefined): any {
  const rawData = useDataEnv();
  return applySelector(rawData, selector);
}

export function useSelectors(selectors: SelectorDict = {}): any {
  const rawData = useDataEnv();
  return Object.fromEntries(
    Object.entries(selectors)
      .filter(([key, selector]) => !!key && !!selector)
      .map(([key, selector]) => tuple(key, applySelector(rawData, selector)))
  );
}

export function useDataEnv() {
  return useContext(DataContext);
}

export interface DataProviderProps {
  /**
   * Key to set in data context.
   */
  name?: string;
  /**
   * Value to set for `name` in data context.
   */
  data?: any;
  /**
   * If true, hide this item in studio data picker.
   */
  hidden?: boolean;
  /**
   * If true, mark this item as advanced in studio.
   */
  advanced?: boolean;
  /**
   * Label to be shown in the studio data picker for easier navigation (data binding).
   */
  label?: string;
  children?: ReactNode;
}

export function DataProvider({
  name,
  data,
  hidden,
  advanced,
  label,
  children,
}: DataProviderProps) {
  const existingEnv = useDataEnv() ?? {};
  if (!name) {
    return <>{children}</>;
  } else {
    return (
      <DataContext.Provider
        value={{
          ...existingEnv,
          [name]: data,
          [mkMetaName(name)]: mkMetaValue({ hidden, advanced, label }),
        }}
      >
        {children}
      </DataContext.Provider>
    );
  }
}

/**
 * This transforms `{ "...slug": "a/b/c" }` into `{ "slug": ["a", "b", "c"] }.
 */
function fixCatchallParams(
  params: Record<string, string | string[] | undefined>
) {
  const newParams: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }
    if (key.startsWith("...")) {
      newParams[key.slice(3)] =
        typeof value === "string" ? value.split("/") : value;
    } else {
      newParams[key] = value;
    }
  }
  return newParams;
}

function mkPathFromRouteAndParams(
  route: string,
  params: Record<string, string | string[] | undefined>
) {
  if (!params) {
    return route;
  }
  let path = route;
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      path = path.replace(`[${key}]`, value);
    } else if (Array.isArray(value)) {
      if (path.includes(`[[...${key}]]`)) {
        path = path.replace(`[[...${key}]]`, value.join("/"));
      } else if (path.includes(`[...${key}]`)) {
        path = path.replace(`[...${key}]`, value.join("/"));
      }
    }
  }
  return path;
}

export interface PageParamsProviderProps {
  children?: ReactNode;

  /**
   * Page route without params substituted (e.g. /products/[slug]).
   */
  route?: string;

  /**
   * Page params (e.g. { slug: "jacket" })
   */
  params?: Record<string, string | string[] | undefined>;

  /**
   * Page query params (e.g. { q: "search term" })
   */
  query?: Record<string, string | string[] | undefined>;

  /**
   * @deprecated Use `route` instead.
   */
  path?: string;
}

export function PageParamsProvider({
  children,
  route,
  path: deprecatedRoute,
  params = {},
  query = {},
}: PageParamsProviderProps) {
  route = route ?? deprecatedRoute;
  params = fixCatchallParams(params);
  const $ctx = useDataEnv() || {};
  const path = route ? mkPathFromRouteAndParams(route, params) : undefined;
  return (
    <DataProvider
      name={"pageRoute"}
      data={route}
      label={"Page route"}
      advanced={true}
    >
      <DataProvider name={"pagePath"} data={path} label={"Page path"}>
        <DataProvider
          name={"params"}
          data={{ ...$ctx.params, ...params }}
          label={"Page URL path params"}
        >
          <DataProvider
            name={"query"}
            data={{ ...$ctx.query, ...query }}
            label={"Page URL query params"}
          >
            {children}
          </DataProvider>
        </DataProvider>
      </DataProvider>
    </DataProvider>
  );
}

export function DataCtxReader({
  children,
}: {
  children: ($ctx: DataDict | undefined) => ReactNode;
}) {
  const $ctx = useDataEnv();
  return children($ctx) as ReactElement | null;
}

import React, { createContext, ReactNode, useContext } from "react";
import { tuple } from "./common";

export type DataDict = Record<string, any>;

export const DataContext = createContext<DataDict | undefined>(undefined);

export type DataMeta = {
  hidden?: boolean;
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
   * If true, hide this entry in studio (data binding).
   */
  hidden?: boolean;
  children?: ReactNode;
}

export function DataProvider({
  name,
  data,
  hidden,
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
          [mkMetaName(name)]: mkMetaValue({ hidden }),
        }}
      >
        {children}
      </DataContext.Provider>
    );
  }
}

export interface PageParamsProviderProps {
  params?: Record<string, string>;
  query?: Record<string, string>;
  children?: ReactNode;
}

export function PageParamsProvider({
  children,
  params = {},
  query = {},
}: PageParamsProviderProps) {
  return (
    <DataProvider name={"params"} data={params}>
      <DataProvider name={"query"} data={query}>
        {children}
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
  return children($ctx);
}

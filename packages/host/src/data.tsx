import React, { createContext, ReactNode, useContext } from "react";
import { tuple } from "./common";

export type DataDict = Record<string, any>;

export const DataContext = createContext<DataDict | undefined>(undefined);

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
  name?: string;
  data?: any;
  children?: ReactNode;
}

export function DataProvider({ name, data, children }: DataProviderProps) {
  const existingEnv = useDataEnv() ?? {};
  if (!name) {
    return <>{children}</>;
  } else {
    return (
      <DataContext.Provider value={{ ...existingEnv, [name]: data }}>
        {children}
      </DataContext.Provider>
    );
  }
}

import * as React from "react";
import useSWR from "swr";
import { ensure } from "../../common";
import { withProvider } from "../../commons/components/ContextUtil";
import { AppCtx } from "../app-ctx";
import { TopFrameApi } from "../frame-ctx/top-frame-api";

export const AppCtxContext = React.createContext<AppCtx | undefined>(undefined);
export const providesAppCtx = withProvider(AppCtxContext.Provider);
export const useAppCtx = () =>
  ensure(React.useContext(AppCtxContext), "No AppCtx available");
export const useApi = () => useAppCtx().api;

export function useDataSource(sourceId: string | undefined) {
  const api = useApi();
  return useSWR(
    () => (sourceId ? `/data-sources/${sourceId}` : null),
    async () => {
      return await api.getDataSourceById(sourceId!);
    }
  );
}

export function useTopFrameApi(): TopFrameApi {
  const appCtx = useAppCtx();
  return ensure(appCtx.topFrameApi, "topFrameApi is null");
}

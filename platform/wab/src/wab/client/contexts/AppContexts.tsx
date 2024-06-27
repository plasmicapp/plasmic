import { AppCtx } from "@/wab/client/app-ctx";
import { TopFrameApi } from "@/wab/client/frame-ctx/top-frame-api";
import { mkIdMap } from "@/wab/shared/collections";
import { ensure, filterMapTruthy } from "@/wab/shared/common";
import { withProvider } from "@/wab/commons/components/ContextUtil";
import { ApiPermission, ApiProject, ApiUser } from "@/wab/shared/ApiSchema";
import * as React from "react";
import useSWR from "swr";

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

export function useAllProjectsData() {
  const api = useApi();
  return useSWR<{
    usersById: Map<string, ApiUser>;
    projects: ApiProject[];
    perms: ApiPermission[];
  }>(
    "/projects",
    async () => {
      const { projects, perms } = await api.getProjects();
      const users = filterMapTruthy(perms, (p) => p.user);
      return { usersById: mkIdMap(users), projects, perms };
    },
    {
      revalidateOnMount: true,
    }
  );
}

export function useTopFrameApi(): TopFrameApi {
  const appCtx = useAppCtx();
  return ensure(appCtx.topFrameApi, "topFrameApi is null");
}

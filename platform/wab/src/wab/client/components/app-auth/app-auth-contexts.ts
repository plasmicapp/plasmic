import { AppCtx } from "@/wab/client/app-ctx";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import useSWR from "swr/immutable";

export const useTeamDirectories = (appCtx: AppCtx, teamId?: string) => {
  const key = `/app-auth/team/${teamId}/directories`;
  const { data, error, mutate } = useSWR(key, async () => {
    if (!teamId) {
      return [];
    }
    const directories = await appCtx.api.listTeamDirectories(teamId);
    return directories;
  });
  return {
    directories: data ?? [],
    loading: !error && !data,
    mutate,
    error,
  };
};

export const useDirectoryUsers = (appCtx: AppCtx, directoryId?: string) => {
  const key = `/app-auth/directory/${directoryId}/users`;
  const { data, error, mutate } = useSWR(key, async () => {
    if (!directoryId) {
      return [];
    }
    const users = await appCtx.api.listDirectoryUsers(directoryId);
    return users;
  });
  return {
    users: data ?? [],
    loading: !error && !data,
    error,
    mutate,
  };
};

export const useDirectory = (appCtx: AppCtx, directoryId?: string) => {
  const key = `/app-auth/directory/${directoryId}`;
  const { data, error, mutate } = useSWR(key, async () => {
    if (!directoryId) {
      return undefined;
    }
    const directory = await appCtx.api.getEndUserDirectory(directoryId);
    return directory;
  });
  return {
    directory: data ?? undefined,
    loading: !error && !data,
    error,
    mutate,
  };
};

export const useDirectoryGroups = (appCtx: AppCtx, directoryId?: string) => {
  const key = `/app-auth/directory/${directoryId}/groups`;
  const { data, error, mutate } = useSWR(key, async () => {
    if (!directoryId) {
      return [];
    }
    const groups = await appCtx.api.listDirectoryGroups(directoryId);
    return groups;
  });
  return {
    groups: data ?? [],
    loading: !error && !data,
    error,
    mutate,
  };
};

export const useAppAuthConfig = (appCtx: AppCtx, appId: string) => {
  const key = `/app-auth/${appId}/config`;
  const { data, error, mutate } = useSWR(
    key,
    async () => {
      const config = await appCtx.api.getAppAuthConfig(appId);
      return config;
    },
    {
      // Revalidate on mount to handle the workspace switching case
      revalidateOnMount: true,
    }
  );
  return {
    config: data ?? undefined,
    loading: !error && !data,
    mutate,
    error,
  };
};

export const useAppCurrentUserOpConfig = (appCtx: AppCtx, appId: string) => {
  const key = `/app-auth/${appId}/user-props-config`;
  const { data, error, mutate } = useSWR(key, async () => {
    const config = await appCtx.api.getAppCurrentUserOpConfig(appId);
    return config;
  });
  return {
    config: data ?? undefined,
    loading: !error && !data,
    mutate,
    error,
  };
};

export const useAppAuthPubConfig = (
  appCtx: AppCtx,
  appId: string,
  email?: string
) => {
  const key = `/app-auth/${appId}/pub-config/${email}`;
  const { data, error } = useSWR(key, async () => {
    const config = await appCtx.api.getAppAuthPubConfig(appId);
    return config;
  });
  return {
    config: data ?? undefined,
    loading: !error && !data,
    error,
  };
};

export const APP_ROLES_KEY = (appId: string) => `/app-auth/${appId}/roles`;

export const useAppRoles = (
  appCtx: AppCtx,
  appId: string,
  hideAnonymous: boolean = true
) => {
  const key = APP_ROLES_KEY(appId);
  const { data, error, mutate } = useSWR(key, async () => {
    const roles = await appCtx.api.listAppRoles(appId);
    return roles;
  });
  return {
    // anonymous always has order == 0
    roles: (data ?? []).filter((r) => !hideAnonymous || r.order > 0),
    loading: !error && !data,
    mutate,
    error,
  };
};

export const useAppAccessRules = (appCtx: AppCtx, appId?: string) => {
  const key = `/app-auth/${appId}/access-rules`;
  const { data, error, mutate } = useSWR(key, async () => {
    if (!appId) {
      return [];
    }
    const users = await appCtx.api.listAppAccessRules(appId);
    return users;
  });
  return {
    accesses: data ?? [],
    loading: !error && !data,
    mutate,
    error,
  };
};

export const useAppAccessRegistries = (
  appCtx: AppCtx,
  appId: string | undefined,
  params: {
    pageSize: number;
    pageIndex: number;
    search: string;
  }
) => {
  const key = `/app-auth/${appId}/access-registries?${JSON.stringify(params)}`;
  const { data, error, mutate } = useSWR(key, async () => {
    if (!appId) {
      return {
        accesses: [],
        total: 0,
      };
    }
    return await appCtx.api.listAppAccessRegistries(appId, params);
  });
  return {
    accesses: data?.accesses ?? [],
    total: data?.total ?? 0,
    loading: !error && !data,
    key,
    mutate,
    error,
  };
};

export const APP_USERS_KEY = (appId: string) => `/app-auth/${appId}/users`;

export const useAppUsers = (appCtx: AppCtx, appId: string) => {
  const key = APP_USERS_KEY(appId);
  const { data, error, mutate } = useSWR(key, async () => {
    return await appCtx.api.listAppUsers(appId);
  });
  return {
    appUsers: data ?? undefined,
    loading: !error && !data,
    mutate,
    error,
  };
};

export function useMutateHostAppAuthData(appId: string) {
  const { hostFrameApi } = useTopFrameCtx();
  // Mutate internal host keys so that the "view as" and "login needed" appears
  return async () => {
    await hostFrameApi.mutateSWRKeys([
      APP_USERS_KEY(appId),
      APP_ROLES_KEY(appId),
    ]);
  };
}

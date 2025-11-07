import { apiKey, invalidationKey } from "@/wab/client/api";
import { AppCtx } from "@/wab/client/app-ctx";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { BranchId, ProjectId } from "@/wab/shared/ApiSchema";
import { withoutNils } from "@/wab/shared/common";
import { keyBy } from "lodash";
import useSWR from "swr";

export function useGetDomainsForProject(projectId: ProjectId) {
  const appCtx = useAppCtx();
  const response = useSWR(
    apiKey(`getDomainsForProject`, projectId),
    () =>
      appCtx.appConfig.enablePlasmicHosting
        ? appCtx.api.getDomainsForProject(projectId)
        : undefined,
    { revalidateOnMount: true }
  );
  return response;
}

export function usePlasmicHostingSettings(projectId: ProjectId) {
  const appCtx = useAppCtx();
  const response = useSWR(
    apiKey(`getPlasmicHostingSettings`, projectId),
    () =>
      appCtx.appConfig.enablePlasmicHosting
        ? appCtx.api.getPlasmicHostingSettings(projectId)
        : undefined,
    { revalidateOnMount: true }
  );
  return response;
}

export function useGetProjectReleases(projectId: ProjectId) {
  const appCtx = useAppCtx();

  const response = useSWR(
    invalidationKey(`getProjectReleases`, projectId),
    () => getProjectReleases(appCtx, projectId, undefined),
    { revalidateOnMount: true }
  );

  return response;
}

export async function getProjectReleases(
  appCtx: AppCtx,
  projectId: ProjectId,
  branchId: BranchId | undefined
) {
  const { pkg } = await appCtx.api.getPkgByProjectId(projectId);
  // If we haven't created a Pkg yet, we've never published before
  if (pkg) {
    const pkgVersionResp = await appCtx.api.listPkgVersionsWithoutData(pkg.id, {
      branchId: branchId ?? null,
    });
    return [...pkgVersionResp.pkgVersions];
  } else {
    return [];
  }
}

export async function listUnpublishedProjectRevisions(
  appCtx: AppCtx,
  projectId: ProjectId,
  branchId: BranchId | undefined,
  revisionNumGt?: number
) {
  const res = await appCtx.api.listUnpublishedProjectRevisions(
    projectId,
    branchId ?? undefined,
    revisionNumGt
  );
  return res?.revisions || [];
}

export function useUsersMap(
  userIds: (string | undefined | null)[] | undefined | null
) {
  const appCtx = useAppCtx();
  const actualUserIds = userIds
    ? Array.from(new Set(withoutNils(userIds))).sort()
    : undefined;

  return useSWR(
    !actualUserIds ? null : `/users-list/${actualUserIds.join(",")}`,
    async () => {
      if (!actualUserIds) {
        return null;
      }
      if (actualUserIds.length === 0) {
        return {};
      }
      const users = (await appCtx.api.getUsersById(actualUserIds)).users;
      return keyBy(users, (u) => u.id);
    }
  );
}

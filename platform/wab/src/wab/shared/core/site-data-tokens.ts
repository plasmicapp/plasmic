import { DataTokenType, getDataTokenType } from "@/wab/commons/DataToken";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { makeShortProjectId, toVarName } from "@/wab/shared/codegen/util";
import {
  DependencyWalkScope,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import { FinalToken, toFinalToken } from "@/wab/shared/core/tokens";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { DataToken, Site } from "@/wab/shared/model/classes";
import keyBy from "lodash/keyBy";

/**
 * Data tokens for the given site, optionally including dependencies
 */
function dataTokens(
  site: Site,
  opts: { includeDeps?: DependencyWalkScope } = {}
) {
  const allTokens = [...site.dataTokens];

  if (opts.includeDeps) {
    allTokens.push(
      ...walkDependencyTree(site, opts.includeDeps).flatMap(
        (d) => d.site.dataTokens
      )
    );
  }

  return allTokens;
}

export const siteDataTokens = maybeComputedFn(
  (site: Site): ReadonlyArray<DataToken> => dataTokens(site)
);

export const siteDataTokensDirectDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<DataToken> =>
    dataTokens(site, { includeDeps: "direct" })
);

export const siteDataTokensAllDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<DataToken> =>
    dataTokens(site, { includeDeps: "all" })
);

export const siteDataTokensAllDepsDict = maybeComputedFn(
  (site: Site): Readonly<{ [uuid: string]: DataToken }> =>
    keyBy(siteDataTokensAllDeps(site), (t) => t.uuid)
);

export const siteFinalDataTokens = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<DataToken>> =>
    siteDataTokens(site).map((token) => toFinalToken(token, site))
);

export const siteFinalDataTokensDirectDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<DataToken>> =>
    siteDataTokensDirectDeps(site).map((token) => toFinalToken(token, site))
);

export const siteFinalDataTokensAllDeps = maybeComputedFn(
  (site: Site): ReadonlyArray<FinalToken<DataToken>> =>
    siteDataTokensAllDeps(site).map((token) => toFinalToken(token, site))
);

export const siteFinalDataTokensOfType = maybeComputedFn(
  (
    site: Site,
    category: DataTokenType,
    opts: { includeDeps?: DependencyWalkScope } = {}
  ): ReadonlyArray<FinalToken<DataToken>> => {
    const tokens =
      opts.includeDeps === "all"
        ? siteFinalDataTokensAllDeps(site)
        : opts.includeDeps === "direct"
        ? siteFinalDataTokensDirectDeps(site)
        : siteFinalDataTokens(site);

    return tokens.filter((t) => getDataTokenType(t.value) === category);
  }
);

export function finalDataTokensForDep(
  site: Site,
  depSite: Site
): ReadonlyArray<FinalToken<DataToken>> {
  return depSite.dataTokens.map((token) => toFinalToken(token, site));
}

/**
 * Maps a short project ID (first 5 chars) to the dependency name.
 */
export function findDepNameByShortProjectId(
  site: Site,
  shortProjectId: string
): string | undefined {
  return walkDependencyTree(site, "all").find((dep) =>
    dep.projectId.startsWith(shortProjectId)
  )?.name;
}

/**
 * Maps a dependency variable name to its short project ID (first 5 chars).
 * Returns null if not found.
 */
export function findShortProjectIdByDepName(
  site: Site,
  depVarName: string
): string | undefined {
  const foundDep = walkDependencyTree(site, "all").find(
    (dep) => toVarName(dep.name) === depVarName
  );
  return foundDep
    ? makeShortProjectId(foundDep.projectId as ProjectId)
    : undefined;
}

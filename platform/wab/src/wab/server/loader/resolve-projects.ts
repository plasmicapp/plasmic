import * as semver from "@/wab/commons/semver";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { withSpan } from "@/wab/server/observability";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { UnsafeBundle } from "@/wab/shared/bundles";
import { sortBy } from "lodash";

export interface PkgVersionToSync {
  version: string;
  indirect: boolean;
  revisionId?: undefined;
}

/** Root projects can use revision IDs. Dependencies always use package versions. */
export interface RevisionToSync {
  revisionId: string;
  indirect: false;
  version?: undefined;
}

export type VersionToSync = PkgVersionToSync | RevisionToSync;

export function mkVersionToSync(
  version: string,
  indirect?: boolean,
): PkgVersionToSync {
  return {
    version,
    indirect: !!indirect,
  };
}

export function mkRevisionToSync(revisionId: string): RevisionToSync {
  return { revisionId, indirect: false };
}

export function isRevisionToSync(v: VersionToSync): v is RevisionToSync {
  return v.revisionId !== undefined;
}

export function isPinnedVersionToSync(
  v: VersionToSync,
  branches: { name: string }[],
) {
  return (
    isRevisionToSync(v) ||
    (v.version !== "latest" && !branches.some((b) => b.name === v.version))
  );
}

const REVISION_SPEC_SEPARATOR = "@rev:";
const REVISION_SPEC_PART_RE = /^[A-Za-z0-9_-]+$/;

export function makeRevisionSpec(projectId: string, revisionId: string) {
  return `${projectId}${REVISION_SPEC_SEPARATOR}${revisionId}`;
}

export function parseRevisionSpec(spec: string): {
  projectId: ProjectId;
  revisionId: string;
} {
  const sepIndex = spec.indexOf(REVISION_SPEC_SEPARATOR);
  const projectId = spec.slice(0, sepIndex);
  const revisionId = spec.slice(sepIndex + REVISION_SPEC_SEPARATOR.length);
  if (
    sepIndex < 0 ||
    !REVISION_SPEC_PART_RE.test(projectId) ||
    !REVISION_SPEC_PART_RE.test(revisionId)
  ) {
    throw new BadRequestError(
      `Invalid revision spec "${spec}"; expected <projectId>@rev:<projectRevisionId>`,
    );
  }
  return { projectId: projectId as ProjectId, revisionId };
}

async function getPkgByProjectOrThrow(dbMgr: DbMgr, projectId: string) {
  const pkg = await dbMgr.getPkgByProjectId(projectId);
  if (!pkg) {
    throw new BadRequestError(
      `Project ${projectId} has not been published yet.`,
    );
  }
  return pkg;
}

async function getPkgVersionByProject(
  dbMgr: DbMgr,
  projectId: string,
  versionRange?: string,
  tag?: string,
  opts: { prefilledOnly: boolean } = { prefilledOnly: false },
) {
  const pkg = await getPkgByProjectOrThrow(dbMgr, projectId);
  const pkgVersion = await dbMgr.getPkgVersion(pkg.id, versionRange, tag, opts);
  return { pkg, pkgVersion };
}

export async function resolveProjectDeps(
  dbMgr: DbMgr,
  projectVersions: Record<string, VersionToSync>,
): Promise<Record<string, VersionToSync>> {
  const seeds = await Promise.all(
    Object.entries(projectVersions).map(async ([projectId, v]) => {
      if (isRevisionToSync(v)) {
        return await dbMgr.getProjectRevByIdForProject(projectId, v.revisionId);
      }
      const branches = await dbMgr.listBranchesForProject(
        projectId as ProjectId,
      );
      const maybeBranch = branches.find((branch) => branch.name === v.version);

      // If version is a branch name, we want to get the latest of that branch
      if (v.version !== "latest" && !maybeBranch) {
        return (await getPkgVersionByProject(dbMgr, projectId, v.version))
          .pkgVersion;
      } else {
        return await dbMgr.getLatestProjectRev(projectId, {
          branchId: maybeBranch?.id,
        });
      }
    }),
  );
  const deps = await resolveDeps(dbMgr, seeds);
  return Object.fromEntries(
    Object.entries(deps).map(([id, version]) => [
      id,
      mkVersionToSync(version, true),
    ]),
  );
}

export async function resolveLatestProjectVersions(
  dbMgr: DbMgr,
  projectIdsAndTags: { projectId: string; tag: string | undefined }[],
  opts: { prefilledOnly: boolean } = { prefilledOnly: false },
) {
  return withSpan(
    `resolveLatestProjectVersions-${projectIdsAndTags.length}`,
    async () => {
      const pkgVersions = await Promise.all(
        projectIdsAndTags.map(async ({ projectId, tag }) => {
          const pkg = await getPkgByProjectOrThrow(dbMgr, projectId);
          return {
            projectId,
            version: await dbMgr.getLatestPkgVersionNumber(pkg.id, tag, opts),
          };
        }),
      );
      return Object.fromEntries(
        pkgVersions.map(({ projectId, version }) => [projectId, version]),
      );
    },
  );
}

export async function resolveLatestProjectRevisions(
  dbMgr: DbMgr,
  projectIdsAndBranches: { id: string; branchName: string | undefined }[],
) {
  const revisions = await Promise.all(
    projectIdsAndBranches.map(async (p) => {
      const branches = await dbMgr.listBranchesForProject(p.id as ProjectId);
      const matchingBranch = branches.find(
        (branch) => branch.name === p.branchName,
      );
      const branchId = matchingBranch?.id;
      return [
        p.id,
        await dbMgr.getLatestProjectRevNumber(p.id, { branchId: branchId }),
      ];
    }),
  );
  return Object.fromEntries(revisions) as Record<string, number>;
}

export function parseProjectIdSpec(id: string): {
  projectId: ProjectId;
  version: string | undefined;
  tag: string | undefined;
} {
  if (!id.includes("@")) {
    return {
      projectId: id as ProjectId,
      version: undefined,
      tag: undefined,
    };
  } else {
    const [projectId, versionRangeOrTag] = id.split("@");
    if (
      semver.isLatest(versionRangeOrTag) ||
      !semver.valid(versionRangeOrTag)
    ) {
      return {
        // versionRangeOrTag might be a valid tag
        projectId: projectId as ProjectId,
        version: undefined,
        tag: versionRangeOrTag,
      };
    }
    return {
      // We know versionRangeOrTag is an exact version string
      projectId: projectId as ProjectId,
      version: versionRangeOrTag,
      tag: undefined,
    };
  }
}

export function extractProjectId(id: string): ProjectId {
  return parseProjectIdSpec(id).projectId;
}

async function resolveDeps(
  dbMgr: DbMgr,
  seeds: (ProjectRevision | PkgVersion)[],
) {
  const pkgIdToMaxVersion: Record<string, string> = {};

  const addMaxPkgVersion = (pkgId: string, version: string) => {
    const curVersion = pkgIdToMaxVersion[pkgId];
    if (!curVersion) {
      pkgIdToMaxVersion[pkgId] = version;
    } else if (curVersion !== version) {
      const gt = semver.gt(curVersion, version) ? curVersion : version;
      if (gt !== curVersion) {
        pkgIdToMaxVersion[pkgId] = gt;
      }
    }
  };

  for (const seed of seeds) {
    const bundle = JSON.parse(
      seed instanceof ProjectRevision ? seed.data : seed.model,
    ) as UnsafeBundle;
    const deps = await loadDepPackages(dbMgr, bundle, { extendTokens: true });
    for (const dep of deps) {
      addMaxPkgVersion(dep.pkgId, dep.version);
    }
  }

  const projectIdToMaxVersion: Record<string, string> = {};
  for (const [pkgId, version] of Object.entries(pkgIdToMaxVersion)) {
    const projectId = (await dbMgr.getPkgById(pkgId)).projectId;
    projectIdToMaxVersion[projectId] = version;
  }

  return projectIdToMaxVersion;
}

export async function getResolvedProjectVersions(
  mgr: DbMgr,
  projectIdSpecs: string[],
  opts: { prefilledOnly: boolean } = { prefilledOnly: false },
) {
  const projectVersionsOrTags = projectIdSpecs.map(parseProjectIdSpec);
  const projectIdsAndTagsToResolve = projectVersionsOrTags
    .filter(({ version }) => !version)
    .map(({ projectId, tag }) => {
      return { projectId: projectId, tag: tag };
    });
  if (projectIdsAndTagsToResolve.length > 0) {
    const resolved = await resolveLatestProjectVersions(
      mgr,
      projectIdsAndTagsToResolve,
      opts,
    );
    const newProjectIdSpecsMap = {
      ...Object.fromEntries(
        projectVersionsOrTags.map(({ projectId, version }) => [
          projectId,
          version,
        ]),
      ),
      ...resolved,
    };
    const newProjectIdSpecs = sortBy(
      Object.entries(newProjectIdSpecsMap),
      ([projectId]) => projectId,
    ).map(([projectId, version]) => `${projectId}@${version}`);
    return newProjectIdSpecs;
  }

  // Else everything is already resolved
  return projectIdSpecs;
}

/**
 * Returns maybeBranchName if it's a valid branch name and otherwise
 * returns "latest".
 */
async function resolvePreviewVersion(
  mgr: DbMgr,
  projectId: string,
  maybeBranchName: string | undefined,
) {
  const branches = await mgr.listBranchesForProject(projectId as ProjectId);
  const maybeBranch = branches.find(
    (branch) => branch.name === maybeBranchName,
  );
  return maybeBranch?.name ?? "latest";
}

export async function getPreviewResolvedVersions(
  mgr: DbMgr,
  projectIdSpecs: string[],
) {
  const projectAndBranches = projectIdSpecs.map(parseProjectIdSpec);
  const projectIdsAndBranchesToResolve = projectAndBranches
    .filter(({ version }) => !version)
    .map(({ projectId, tag }) => {
      return { projectId: projectId, maybeBranchName: tag };
    });

  const newProjectIdSpecs = projectIdsAndBranchesToResolve.map((pb) => {
    const resolvedVersion = resolvePreviewVersion(
      mgr,
      pb.projectId,
      pb.maybeBranchName,
    );
    return `${pb.projectId}@${resolvedVersion}`;
  });

  return newProjectIdSpecs;
}

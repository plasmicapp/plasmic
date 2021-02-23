import L from "lodash";
import { SyncArgs } from "../actions/sync";
import { ProjectVersionMeta, VersionResolution } from "../api";
import { logger } from "../deps";
import { CONFIG_FILE_NAME, PlasmicContext } from "./config-utils";
import { HandledError } from "./error";
import { ensure } from "./lang-utils";
import * as semver from "./semver";
import { confirmWithUser } from "./user-utils";

/**
 * Starting at the root, do a BFS of the full dependency tree
 * Because ProjectVersionMeta only stores the (projectId, version),
 * we need to search for the full ProjectVersionMeta of dependencies from `available`
 * @param root
 * @param versionResolution
 */
function walkDependencyTree(
  root: ProjectVersionMeta,
  available: ProjectVersionMeta[]
): ProjectVersionMeta[] {
  const queue: ProjectVersionMeta[] = [root];
  const result: ProjectVersionMeta[] = [];

  const getMeta = (projectId: string, version: string): ProjectVersionMeta => {
    const meta = available.find(
      (m) => m.projectId === projectId && m.version === version
    );
    if (!meta) {
      throw new Error(
        `Cannot find projectId=${projectId}, version=${version} in the sync resolution results.`
      );
    }
    return meta;
  };

  while (queue.length > 0) {
    const curr = ensure(queue.shift());
    result.push(curr);
    queue.push(
      ...L.toPairs(curr.dependencies).map(([projectId, version]) =>
        getMeta(projectId, version)
      )
    );
  }

  return result;
}

/**
 * For a given project, check if its compatible with plasmic.json, plasmic.lock, and user
 * @param meta
 * @param context
 */
async function checkProjectMeta(
  meta: ProjectVersionMeta,
  root: ProjectVersionMeta,
  context: PlasmicContext,
  opts: SyncArgs
): Promise<boolean> {
  const projectId = meta.projectId;
  const projectName = meta.projectName;
  const newVersion = meta.version;

  // Checks newVersion against plasmic.lock
  const checkVersionLock = async (): Promise<boolean> => {
    const projectLock = context.lock.projects.find(
      (p) => p.projectId === projectId
    );
    const versionOnDisk = projectLock?.version;

    if (semver.isLatest(newVersion)) {
      // Always sync when version set to "latest"
      return true;
    }

    if (!versionOnDisk) {
      // Always sync if we haven't seen sync'ed before
      return true;
    }

    if (semver.isLatest(versionOnDisk)) {
      // Explicitly allow downgrades from "latest" to published version
      return true;
    }

    // At this point, we can assume newVersion is always X.Y.Z (not latest)
    if (semver.eq(newVersion, versionOnDisk)) {
      if (opts.force) {
        logger.info(
          `Project '${projectName}'@${newVersion} is already up to date, but syncing anyway because --force is used`
        );
        return true;
      } else {
        logger.info(
          `Project '${projectName}'@${newVersion} is already up to date; skipping. (To force an update, run again with "--force")`
        );
        return false;
      }
    }

    if (semver.lt(newVersion, versionOnDisk)) {
      meta === root
        ? logger.warn(
            `The local version of '${projectName}' (${versionOnDisk}) is higher than requested version @${newVersion}. Plasmic does not support downgrading a project. You should consider updating the version range in ${CONFIG_FILE_NAME}.`
          )
        : logger.warn(
            `'${root.projectName}' uses '${projectName}'@${newVersion}, but your code has '${projectName}'@${versionOnDisk}. You should consider upgrading this dependency in Plasmic Studio.`
          );
      return false;
    }

    if (semver.gt(newVersion, versionOnDisk)) {
      if (meta === root) {
        return true;
      } else {
        logger.info(
          `'${root.projectName}' uses '${projectName}'@${newVersion}, but your code has version ${versionOnDisk}`
        );
        return await confirmWithUser(
          `Do you want to upgrade '${projectName}' to ${newVersion}?`,
          opts.yes
        );
      }
    }

    throw new Error(
      `Error comparing version=${newVersion} with the version found in plasmic.lock (${versionOnDisk}) for '${projectName}'`
    );
  };

  // Checks newVersion against plasmic.json
  const checkVersionRange = async (): Promise<boolean> => {
    const projectConfig = context.config.projects.find(
      (p) => p.projectId === projectId
    );
    const versionRange = projectConfig?.version;
    // If haven't seen this before
    if (!versionRange) {
      // Always sync down dependencies if it's the first time to avoid compile/fix-imports error
      projectId !== root.projectId
        ? logger.info(
            `'${root.projectName}' uses '${projectName}', which has never been synced before. We will also sync '${projectName}'@${newVersion}.`
          )
        : logger.info(
            `'${projectName} has never been synced before. Syncing...'`
          );
      return true;
    }

    // If satisfies range in plasmic.json
    if (semver.satisfies(newVersion, versionRange)) {
      logger.info(`Updating project '${projectName}' to ${newVersion}`);
      return true;
    }

    logger.warn(
      `${projectName}@${newVersion} falls outside the range specified in ${CONFIG_FILE_NAME} (${versionRange})\nTip: To avoid this warning in the future, update your ${CONFIG_FILE_NAME}.`
    );
    return await confirmWithUser(
      "Do you want to force it?",
      opts.force || opts.yes,
      "n"
    );
  };

  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : context.config.projects.map((p) => p.projectId);

  if (projectIds.includes(projectId) && opts.force) {
    // if --force is used, and this is in the list of projects to sync, then
    // we should always sync it, even if nothing has changed
    return true;
  }

  return (await checkVersionLock()) && (await checkVersionRange());
}

/**
 * Checks the versionResolution with plasmic.json, plasmic.lock, and user prompts
 * to compute which projects should be synced
 * @param versionResolution
 * @param context
 */
export async function checkVersionResolution(
  versionResolution: VersionResolution,
  context: PlasmicContext,
  opts: SyncArgs
): Promise<ProjectVersionMeta[]> {
  // Fail if there's nothing to sync
  if (versionResolution.projects.length <= 0) {
    throw new HandledError(
      `Found nothing to sync. Make sure the projectId and version values are valid in ${CONFIG_FILE_NAME}.`
    );
  }

  const seen: ProjectVersionMeta[] = [];
  const result: ProjectVersionMeta[] = [];
  for (const root of versionResolution.projects) {
    const queue = opts.nonRecursive
      ? [root]
      : walkDependencyTree(root, versionResolution.dependencies).reverse();
    for (const m of queue) {
      // If we haven't seen this yet
      if (!seen.find((p) => p.projectId === m.projectId)) {
        if (await checkProjectMeta(m, root, context, opts)) {
          result.push(m);
        }
        seen.push(m);
      }
    }
  }

  // Ignore repeats
  return result;
}

export function getDependencies(
  projectId: string,
  version: string,
  versionResolution: VersionResolution
) {
  const filterFn = (m: ProjectVersionMeta) =>
    m.projectId === projectId && m.version === version;
  const meta =
    versionResolution.projects.find(filterFn) ??
    versionResolution.dependencies.find(filterFn);

  return meta?.dependencies;
}

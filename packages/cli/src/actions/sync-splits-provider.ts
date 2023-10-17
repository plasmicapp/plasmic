import L from "lodash";
import { ChecksumBundle, ProjectMetaBundle } from "../api";
import { logger } from "../deps";
import { formatScript, tsxToJsx } from "../utils/code-utils";
import {
  PlasmicContext,
  ProjectConfig,
  ProjectLock,
} from "../utils/config-utils";
import {
  defaultResourcePath,
  deleteFile,
  fileExists,
  writeFileContent,
} from "../utils/file-utils";

const COMPONENT_NAME = "PlasmicSplitsProvider";
export const DEFAULT_SPLITS_PROVIDER_NAME = COMPONENT_NAME;

export async function syncSplitsProvider(
  context: PlasmicContext,
  projectMeta: ProjectMetaBundle,
  projectConfig: ProjectConfig,
  projectLock: ProjectLock,
  checksums: ChecksumBundle,
  baseDir: string
) {
  const resourcePath = getSplitsProviderResourcePath(context, projectConfig);
  if (checksums.splitsProviderChecksum && projectMeta.splitsProviderBundle) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing component: ${COMPONENT_NAME}@${projectLock.version}\t['${projectConfig.projectName}' ${projectConfig.projectId} ${projectConfig.version}]`
      );
    }
    if (context.config.code.lang === "js") {
      projectMeta.splitsProviderBundle.module = formatScript(
        tsxToJsx(projectMeta.splitsProviderBundle.module),
        baseDir
      );
    }
    writeFileContent(
      context,
      resourcePath,
      projectMeta.splitsProviderBundle.module,
      { force: true }
    );
    projectConfig.splitsProviderFilePath = resourcePath;
    const fl = projectLock.fileLocks.find(
      (fl) =>
        fl.assetId === projectConfig.projectId && fl.type === "splitsProvider"
    );
    if (fl) {
      fl.checksum = checksums.splitsProviderChecksum;
    } else {
      projectLock.fileLocks.push({
        assetId: projectConfig.projectId,
        checksum: checksums.splitsProviderChecksum,
        type: "splitsProvider",
      });
    }
  } else if (
    !checksums.splitsProviderChecksum &&
    !projectMeta.splitsProviderBundle
  ) {
    if (fileExists(context, resourcePath)) {
      deleteFile(context, resourcePath);
    }
    projectConfig.splitsProviderFilePath = "";
    L.remove(
      projectLock.fileLocks,
      (fl) =>
        fl.assetId === projectConfig.projectId && fl.type === "splitsProvider"
    );
  }
}

export function getSplitsProviderResourcePath(
  context: PlasmicContext,
  projectConfig: ProjectConfig
) {
  return projectConfig.splitsProviderFilePath !== ""
    ? projectConfig.splitsProviderFilePath
    : defaultResourcePath(
        context,
        projectConfig,
        `${COMPONENT_NAME}.${context.config.code.lang === "ts" ? "tsx" : "jsx"}`
      );
}

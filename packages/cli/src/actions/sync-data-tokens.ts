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

const MODULE_NAME = "plasmic-data-tokens";
export const DEFAULT_DATA_TOKENS_NAME = MODULE_NAME;

export async function syncDataTokens(
  context: PlasmicContext,
  projectMeta: ProjectMetaBundle,
  projectConfig: ProjectConfig,
  projectLock: ProjectLock,
  checksums: ChecksumBundle,
  baseDir: string
) {
  const resourcePath = getDataTokensResourcePath(context, projectConfig);
  if (checksums.dataTokensChecksum && projectMeta.dataTokensBundle) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing module: ${MODULE_NAME}@${projectLock.version}\t['${projectConfig.projectName}' ${projectConfig.projectId} ${projectConfig.version}]`
      );
    }
    if (context.config.code.lang === "js") {
      projectMeta.dataTokensBundle.module = await formatScript(
        tsxToJsx(projectMeta.dataTokensBundle.module),
        baseDir
      );
    }
    writeFileContent(
      context,
      resourcePath,
      projectMeta.dataTokensBundle.module,
      { force: true }
    );
    projectConfig.dataTokensFilePath = resourcePath;
    const fl = projectLock.fileLocks.find(
      (lock) =>
        lock.assetId === projectConfig.projectId && lock.type === "dataTokens"
    );
    if (fl) {
      fl.checksum = checksums.dataTokensChecksum || "";
    } else {
      projectLock.fileLocks.push({
        assetId: projectConfig.projectId,
        checksum: checksums.dataTokensChecksum || "",
        type: "dataTokens",
      });
    }
  } else if (!checksums.dataTokensChecksum && !projectMeta.dataTokensBundle) {
    // Only try to delete if there was a previously configured path
    if (projectConfig.dataTokensFilePath) {
      if (fileExists(context, projectConfig.dataTokensFilePath)) {
        deleteFile(context, projectConfig.dataTokensFilePath);
      }
      projectConfig.dataTokensFilePath = "";
    }
    L.remove(
      projectLock.fileLocks,
      (fl) => fl.assetId === projectConfig.projectId && fl.type === "dataTokens"
    );
  }
}

export function getDataTokensResourcePath(
  context: PlasmicContext,
  projectConfig: ProjectConfig
) {
  if (projectConfig.dataTokensFilePath) {
    return projectConfig.dataTokensFilePath;
  }
  return defaultResourcePath(
    context,
    projectConfig.projectName,
    `${MODULE_NAME}.${context.config.code.lang}`
  );
}

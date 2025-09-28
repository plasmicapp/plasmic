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

const MODULE_NAME = "PlasmicStyleTokensProvider";
export const DEFAULT_STYLE_TOKENS_PROVIDER_NAME = MODULE_NAME;

export async function syncStyleTokensProvider(
  context: PlasmicContext,
  projectMeta: ProjectMetaBundle,
  projectConfig: ProjectConfig,
  projectLock: ProjectLock,
  checksums: ChecksumBundle,
  baseDir: string
) {
  const resourcePath = getStyleTokensProviderResourcePath(
    context,
    projectConfig
  );
  if (
    checksums.styleTokensProviderChecksum &&
    projectMeta.styleTokensProviderBundle
  ) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing module: ${MODULE_NAME}@${projectLock.version}\t['${projectConfig.projectName}' ${projectConfig.projectId} ${projectConfig.version}]`
      );
    }
    if (context.config.code.lang === "js") {
      projectMeta.styleTokensProviderBundle.module = await formatScript(
        tsxToJsx(projectMeta.styleTokensProviderBundle.module),
        baseDir
      );
    }
    writeFileContent(
      context,
      resourcePath,
      projectMeta.styleTokensProviderBundle.module,
      { force: true }
    );
    projectConfig.styleTokensProviderFilePath = resourcePath;
    const fl = projectLock.fileLocks.find(
      (fl) =>
        fl.assetId === projectConfig.projectId &&
        fl.type === "styleTokensProvider"
    );
    if (fl) {
      fl.checksum = checksums.styleTokensProviderChecksum || "";
    } else {
      projectLock.fileLocks.push({
        assetId: projectConfig.projectId,
        checksum: checksums.styleTokensProviderChecksum || "",
        type: "styleTokensProvider",
      });
    }
  } else if (
    !checksums.styleTokensProviderChecksum &&
    !projectMeta.styleTokensProviderBundle
  ) {
    if (fileExists(context, resourcePath)) {
      deleteFile(context, resourcePath);
    }
    projectConfig.styleTokensProviderFilePath = "";
    L.remove(
      projectLock.fileLocks,
      (fl) =>
        fl.assetId === projectConfig.projectId &&
        fl.type === "styleTokensProvider"
    );
  }
}

export function getStyleTokensProviderResourcePath(
  context: PlasmicContext,
  projectConfig: ProjectConfig
) {
  return projectConfig.styleTokensProviderFilePath !== ""
    ? projectConfig.styleTokensProviderFilePath
    : defaultResourcePath(
        context,
        projectConfig.projectName,
        `${MODULE_NAME}.${context.config.code.lang === "ts" ? "tsx" : "jsx"}`
      );
}

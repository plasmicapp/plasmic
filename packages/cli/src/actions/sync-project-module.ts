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

const MODULE_NAME = "plasmic";
export const DEFAULT_PROJECT_MODULE_NAME = MODULE_NAME;

export async function syncProjectModule(
  context: PlasmicContext,
  projectMeta: ProjectMetaBundle,
  projectConfig: ProjectConfig,
  projectLock: ProjectLock,
  checksums: ChecksumBundle
) {
  const resourcePath = getProjectModuleResourcePath(context, projectConfig);
  if (checksums.projectModuleChecksum && projectMeta.projectModuleBundle) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing module: ${MODULE_NAME}@${projectLock.version}\t['${projectConfig.projectName}' ${projectConfig.projectId} ${projectConfig.version}]`
      );
    }
    if (context.config.code.lang === "js") {
      projectMeta.projectModuleBundle.module = await formatScript(
        tsxToJsx(projectMeta.projectModuleBundle.module)
      );
    }
    await writeFileContent(
      context,
      resourcePath,
      projectMeta.projectModuleBundle.module,
      { force: true }
    );
    projectConfig.projectModuleFilePath = resourcePath;
    const fl = projectLock.fileLocks.find(
      (fileLock) =>
        fileLock.assetId === projectConfig.projectId &&
        fileLock.type === "projectModule"
    );
    if (fl) {
      fl.checksum = checksums.projectModuleChecksum || "";
    } else {
      projectLock.fileLocks.push({
        assetId: projectConfig.projectId,
        checksum: checksums.projectModuleChecksum || "",
        type: "projectModule",
      });
    }
  } else if (
    !checksums.projectModuleChecksum &&
    !projectMeta.projectModuleBundle
  ) {
    if (fileExists(context, resourcePath)) {
      deleteFile(context, resourcePath);
    }
    projectConfig.projectModuleFilePath = "";
    L.remove(
      projectLock.fileLocks,
      (fl) =>
        fl.assetId === projectConfig.projectId && fl.type === "projectModule"
    );
  }
}

export function getProjectModuleResourcePath(
  context: PlasmicContext,
  projectConfig: ProjectConfig
) {
  return projectConfig.projectModuleFilePath !== ""
    ? projectConfig.projectModuleFilePath
    : defaultResourcePath(
        context,
        projectConfig.projectName,
        `${MODULE_NAME}.${context.config.code.lang === "ts" ? "tsx" : "jsx"}`
      );
}

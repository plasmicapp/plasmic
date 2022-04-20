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

const COMPONENT_NAME = "PlasmicGlobalContextsProvider";

export async function syncGlobalContexts(
  context: PlasmicContext,
  projectMeta: ProjectMetaBundle,
  projectConfig: ProjectConfig,
  projectLock: ProjectLock,
  checksums: ChecksumBundle,
  baseDir: string
) {
  const resourcePath = getGlobalContextsResourcePath(context, projectConfig);
  if (checksums.globalContextsChecksum && projectMeta.globalContextBundle) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing component: ${COMPONENT_NAME}@${projectLock.version}\t['${projectConfig.projectName}' ${projectConfig.projectId} ${projectConfig.version}]`
      );
    }
    if (context.config.code.lang === "js") {
      projectMeta.globalContextBundle.contextModule = formatScript(
        tsxToJsx(projectMeta.globalContextBundle.contextModule),
        baseDir
      );
    }
    writeFileContent(
      context,
      resourcePath,
      projectMeta.globalContextBundle.contextModule,
      { force: true }
    );
    projectConfig.globalContextsFilePath = resourcePath;
    const fl = projectLock.fileLocks.find(
      (fl) =>
        fl.assetId === projectConfig.projectId && fl.type === "globalContexts"
    );
    if (fl) {
      fl.checksum = checksums.globalContextsChecksum;
    } else {
      projectLock.fileLocks.push({
        assetId: projectConfig.projectId,
        checksum: checksums.globalContextsChecksum,
        type: "globalContexts",
      });
    }
  } else if (
    !checksums.globalContextsChecksum &&
    !projectMeta.globalContextBundle
  ) {
    if (fileExists(context, resourcePath)) {
      deleteFile(context, resourcePath);
    }
    projectConfig.globalContextsFilePath = "";
    L.remove(
      projectLock.fileLocks,
      (fl) =>
        fl.assetId === projectConfig.projectId && fl.type === "globalContexts"
    );
  }
}

export function getGlobalContextsResourcePath(
  context: PlasmicContext,
  projectConfig: ProjectConfig
) {
  return projectConfig.globalContextsFilePath !== ""
    ? projectConfig.globalContextsFilePath
    : defaultResourcePath(
        context,
        projectConfig,
        `${COMPONENT_NAME}.${context.config.code.lang === "ts" ? "tsx" : "jsx"}`
      );
}

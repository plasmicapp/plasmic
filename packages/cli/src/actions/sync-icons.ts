import L from "lodash";
import path from "upath";
import { CommonArgs } from "..";
import { ChecksumBundle, IconBundle } from "../api";
import { logger } from "../deps";
import { formatAsLocal } from "../utils/code-utils";
import {
  getOrAddProjectConfig,
  getOrAddProjectLock,
  PlasmicContext,
} from "../utils/config-utils";
import {
  defaultResourcePath,
  deleteFile,
  fileExists,
  renameFile,
  writeFileContent,
} from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";

export interface SyncIconsArgs extends CommonArgs {
  projects: readonly string[];
}

export async function syncProjectIconAssets(
  context: PlasmicContext,
  projectId: string,
  version: string,
  iconBundles: IconBundle[],
  checksums: ChecksumBundle
) {
  const project = getOrAddProjectConfig(context, projectId);
  if (!project.icons) {
    project.icons = [];
  }

  const projectLock = getOrAddProjectLock(context, projectId);
  const knownIconConfigs = L.keyBy(project.icons, (i) => i.id);
  const iconFileLocks = L.keyBy(
    projectLock.fileLocks.filter((fileLock) => fileLock.type === "icon"),
    (fl) => fl.assetId
  );
  const id2IconChecksum = new Map(checksums.iconChecksums);

  const iconBundleIds = L.keyBy(iconBundles, (i) => i.id);
  const deletedIcons = L.filter(
    knownIconConfigs,
    (i) => !iconBundleIds[i.id] && !id2IconChecksum.has(i.id)
  );

  for (const bundle of iconBundles) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing icon: ${bundle.name}@${version}\t['${project.projectName}' ${project.projectId}/${bundle.id} ${project.version}]`
      );
    }
    let iconConfig = knownIconConfigs[bundle.id];
    const isNew = !iconConfig;
    const defaultModuleFilePath = defaultResourcePath(
      context,
      project,
      "icons",
      bundle.fileName
    );
    if (isNew) {
      iconConfig = {
        id: bundle.id,
        name: bundle.name,
        moduleFilePath: defaultModuleFilePath,
      };
      knownIconConfigs[bundle.id] = iconConfig;
      project.icons.push(iconConfig);
    } else {
      const moduleFilePath = path.join(
        path.dirname(iconConfig.moduleFilePath),
        path.basename(defaultModuleFilePath)
      );
      if (
        iconConfig.moduleFilePath !== moduleFilePath &&
        fileExists(context, iconConfig.moduleFilePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming icon: ${iconConfig.name}@${version}\t['${project.projectName}' ${project.projectId}/${bundle.id} ${project.version}]`
          );
        }
        renameFile(context, iconConfig.moduleFilePath, moduleFilePath);
        iconConfig.moduleFilePath = moduleFilePath;
      }
      iconConfig.name = bundle.name;
    }

    // Update FileLocks
    if (iconFileLocks[bundle.id]) {
      iconFileLocks[bundle.id].checksum = ensure(
        id2IconChecksum.get(bundle.id)
      );
    } else {
      projectLock.fileLocks.push({
        type: "icon",
        assetId: bundle.id,
        checksum: ensure(id2IconChecksum.get(bundle.id)),
      });
    }

    await writeFileContent(
      context,
      iconConfig.moduleFilePath,
      formatAsLocal(bundle.module, iconConfig.moduleFilePath),
      {
        force: !isNew,
      }
    );
  }

  const deletedIconFiles = new Set<string>();
  for (const deletedIcon of deletedIcons) {
    const iconConfig = knownIconConfigs[deletedIcon.id];
    if (fileExists(context, iconConfig.moduleFilePath)) {
      logger.info(
        `Deleting icon: ${iconConfig.name}@${version}\t['${project.projectName}' ${project.projectId}/${deletedIcon.id} ${project.version}]`
      );
      deleteFile(context, iconConfig.moduleFilePath);
      deletedIconFiles.add(deletedIcon.id);
    }
  }
  project.icons = project.icons.filter((i) => !deletedIconFiles.has(i.id));

  const deletedIconIds = new Set(deletedIcons.map((i) => i.id));
  projectLock.fileLocks = projectLock.fileLocks.filter(
    (fileLock) =>
      fileLock.type !== "icon" || !deletedIconIds.has(fileLock.assetId)
  );
}

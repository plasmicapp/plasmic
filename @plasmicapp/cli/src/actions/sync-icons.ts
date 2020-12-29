import L from "lodash";
import path from "upath";
import { CommonArgs } from "..";
import { IconBundle } from "../api";
import { logger } from "../deps";
import { formatAsLocal } from "../utils/code-utils";
import { getOrAddProjectConfig, PlasmicContext } from "../utils/config-utils";
import {
  defaultResourcePath,
  fileExists,
  renameFile,
  writeFileContent,
} from "../utils/file-utils";

export interface SyncIconsArgs extends CommonArgs {
  projects: readonly string[];
}

export function syncProjectIconAssets(
  context: PlasmicContext,
  projectId: string,
  version: string,
  iconBundles: IconBundle[]
) {
  const project = getOrAddProjectConfig(context, projectId);
  if (!project.icons) {
    project.icons = [];
  }
  const knownIconConfigs = L.keyBy(project.icons, (i) => i.id);
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

    writeFileContent(
      context,
      iconConfig.moduleFilePath,
      formatAsLocal(bundle.module, iconConfig.moduleFilePath),
      {
        force: !isNew,
      }
    );
  }
}

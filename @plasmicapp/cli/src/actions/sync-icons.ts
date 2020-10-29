import L from "lodash";
import path from "upath";
import { PlasmicContext, getOrAddProjectConfig } from "../utils/config-utils";
import { ProjectIconsResponse, IconBundle } from "../api";
import {
  writeFileContent,
  fixAllFilePaths,
  defaultResourcePath,
} from "../utils/file-utils";
import { CommonArgs } from "..";
import { format } from "winston";
import { formatAsLocal, maybeConvertTsxToJsx } from "../utils/code-utils";
import { logger } from "../deps";

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
    if (isNew) {
      iconConfig = {
        id: bundle.id,
        name: bundle.name,
        moduleFilePath: defaultResourcePath(
          context,
          project,
          "icons",
          bundle.fileName
        ),
      };
      knownIconConfigs[bundle.id] = iconConfig;
      project.icons.push(iconConfig);
    } else {
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

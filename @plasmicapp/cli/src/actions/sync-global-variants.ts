import L from "lodash";
import path from "upath";
import { GlobalVariantBundle, ProjectMetaBundle } from "../api";
import { logger } from "../deps";
import { formatAsLocal } from "../utils/code-utils";
import { PlasmicContext } from "../utils/config-utils";
import {
  defaultResourcePath,
  fileExists,
  renameFile,
  writeFileContent,
} from "../utils/file-utils";

export function syncGlobalVariants(
  context: PlasmicContext,
  projectMeta: ProjectMetaBundle,
  bundles: GlobalVariantBundle[]
) {
  const projectId = projectMeta.projectId;
  const allVariantConfigs = L.keyBy(
    context.config.globalVariants.variantGroups,
    (c) => c.id
  );
  for (const bundle of bundles) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing global variant ${bundle.name} [${projectId}/${bundle.id}]`
      );
    }
    let variantConfig = allVariantConfigs[bundle.id];
    const isNew = !variantConfig;
    const defaultContextFilePath = defaultResourcePath(
      context,
      projectMeta,
      bundle.contextFileName
    );
    if (isNew) {
      variantConfig = {
        id: bundle.id,
        name: bundle.name,
        projectId,
        contextFilePath: defaultContextFilePath,
      };
      allVariantConfigs[bundle.id] = variantConfig;
      context.config.globalVariants.variantGroups.push(variantConfig);
    } else {
      const contextFilePath = path.join(
        path.dirname(variantConfig.contextFilePath),
        path.basename(defaultContextFilePath)
      );
      if (
        variantConfig.contextFilePath !== contextFilePath &&
        fileExists(context, variantConfig.contextFilePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming global variant: ${variantConfig.name} [${projectId}/${bundle.id}]`
          );
        }
        renameFile(context, variantConfig.contextFilePath, contextFilePath);
        variantConfig.contextFilePath = contextFilePath;
      }
      variantConfig.name = bundle.name;
    }

    writeFileContent(
      context,
      variantConfig.contextFilePath,
      formatAsLocal(bundle.contextModule, variantConfig.contextFilePath),
      { force: !isNew }
    );
  }
}

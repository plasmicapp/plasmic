import L from "lodash";
import path from "upath";
import { GlobalVariantBundle, ProjectMetaBundle } from "../api";
import { logger } from "../deps";
import { formatAsLocal } from "../utils/code-utils";
import { PlasmicContext } from "../utils/config-utils";
import {
  defaultResourcePath,
  deleteFile,
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
  const existingVariantConfigs = L.keyBy(
    context.config.globalVariants.variantGroups.filter(
      (group) => group.projectId === projectId
    ),
    (c) => c.id
  );
  const variantBundleIds = L.keyBy(bundles, (i) => i.id);
  const deletedGlobalVariants = L.filter(
    existingVariantConfigs,
    (i) => !variantBundleIds[i.id]
  );

  for (const bundle of bundles) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing global variant ${bundle.name} [${projectId}/${bundle.id}]`
      );
    }
    let variantConfig = existingVariantConfigs[bundle.id];
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
      existingVariantConfigs[bundle.id] = variantConfig;
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

  const deletedVariantsFiles = new Set<string>();
  for (const deletedGlobalVariant of deletedGlobalVariants) {
    const variantConfig = existingVariantConfigs[deletedGlobalVariant.id];
    if (fileExists(context, variantConfig.contextFilePath)) {
      logger.info(
        `Deleting global variant: ${variantConfig.name} [${projectId}/${deletedGlobalVariant.id}]`
      );
      deleteFile(context, variantConfig.contextFilePath);
      deletedVariantsFiles.add(deletedGlobalVariant.id);
    }
  }
  context.config.globalVariants.variantGroups = context.config.globalVariants.variantGroups.filter(
    (v) => !deletedVariantsFiles.has(v.id)
  );
}

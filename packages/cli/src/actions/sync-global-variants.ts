import L from "lodash";
import path from "upath";
import { ChecksumBundle, GlobalVariantBundle, ProjectMetaBundle } from "../api";
import { logger } from "../deps";
import { formatAsLocal } from "../utils/code-utils";
import { getOrAddProjectLock, PlasmicContext } from "../utils/config-utils";
import {
  defaultResourcePath,
  deleteFile,
  fileExists,
  renameFile,
  writeFileContent,
} from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";

export async function syncGlobalVariants(
  context: PlasmicContext,
  projectMeta: ProjectMetaBundle,
  bundles: GlobalVariantBundle[],
  checksums: ChecksumBundle,
  baseDir: string,
) {
  const projectId = projectMeta.projectId;
  const projectLock = getOrAddProjectLock(context, projectId);
  const existingVariantConfigs = L.keyBy(
    context.config.globalVariants.variantGroups.filter(
      (group) => group.projectId === projectId
    ),
    (c) => c.id
  );
  const globalVariantFileLocks = L.keyBy(
    projectLock.fileLocks.filter(
      (fileLock) => fileLock.type === "globalVariant"
    ),
    (fl) => fl.assetId
  );
  const id2VariantChecksum = new Map(checksums.globalVariantChecksums);

  const variantBundleIds = L.keyBy(bundles, (i) => i.id);
  const deletedGlobalVariants = L.filter(
    existingVariantConfigs,
    (i) => !variantBundleIds[i.id] && !id2VariantChecksum.has(i.id)
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

    // Update FileLocks
    if (globalVariantFileLocks[bundle.id]) {
      globalVariantFileLocks[bundle.id].checksum = ensure(
        id2VariantChecksum.get(bundle.id)
      );
    } else {
      projectLock.fileLocks.push({
        type: "globalVariant",
        assetId: bundle.id,
        checksum: ensure(id2VariantChecksum.get(bundle.id)),
      });
    }

    await writeFileContent(
      context,
      variantConfig.contextFilePath,
      formatAsLocal(bundle.contextModule, variantConfig.contextFilePath, baseDir),
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

  const deletedVariantIds = new Set(deletedGlobalVariants.map((i) => i.id));
  projectLock.fileLocks = projectLock.fileLocks.filter(
    (fileLock) =>
      fileLock.type !== "globalVariant" ||
      !deletedVariantIds.has(fileLock.assetId)
  );
}

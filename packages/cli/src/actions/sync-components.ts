import {
  ComponentInfoForMerge,
  makeCachedProjectSyncDataProvider,
  mergeFiles,
} from "@plasmicapp/code-merger";
import L from "lodash";
import path from "upath";
import { AppServerError, ChecksumBundle, ComponentBundle } from "../api";
import { logger } from "../deps";
import { ComponentUpdateSummary, formatAsLocal } from "../utils/code-utils";
import {
  ComponentConfig,
  CONFIG_FILE_NAME,
  isPageAwarePlatform,
  PlasmicContext,
  ProjectConfig,
  ProjectLock,
} from "../utils/config-utils";
import { HandledError } from "../utils/error";
import {
  defaultPagePath,
  defaultResourcePath,
  deleteFile,
  fileExists,
  readFileContent,
  renameFile,
  writeFileContent,
} from "../utils/file-utils";
import { assert, ensure } from "../utils/lang-utils";
import { confirmWithUser } from "../utils/user-utils";

export interface ComponentPendingMerge {
  // path of the skeleton module
  skeletonModulePath: string;
  editedSkeletonFile: string;
  newSkeletonFile: string;
  // function to perform code merger using input whose import has been resolved.
  merge: (
    resolvedNewSkeletonFile: string,
    resolvedEditedSkeletonFile: string
  ) => Promise<void>;
}

const updateDirectSkeleton = async (
  newFileContent: string,
  editedFileContent: string,
  context: PlasmicContext,
  compConfig: ComponentConfig,
  forceOverwrite: boolean,
  nameInIdToUuid: [string, string][],
  appendJsxOnMissingBase: boolean
) => {
  // merge code!
  const componentByUuid = new Map<string, ComponentInfoForMerge>();

  componentByUuid.set(compConfig.id, {
    editedFile: editedFileContent,
    newFile: newFileContent,
    newNameInIdToUuid: new Map(nameInIdToUuid),
  });
  const mergedFiles = await mergeFiles(
    componentByUuid,
    compConfig.projectId,
    makeCachedProjectSyncDataProvider(async (projectId, revision) => {
      try {
        return await context.api.projectSyncMetadata(projectId, revision, true);
      } catch (e) {
        if (
          e instanceof AppServerError &&
          /revision \d+ not found/.test(e.message)
        ) {
          throw e;
        } else {
          throw new HandledError(e.messag);
        }
      }
    }),
    () => {},
    appendJsxOnMissingBase
  );
  const merged = mergedFiles?.get(compConfig.id);
  if (merged) {
    await writeFileContent(context, compConfig.importSpec.modulePath, merged, {
      force: true,
    });
  } else {
    if (!forceOverwrite) {
      throw new HandledError(
        `Cannot merge ${compConfig.importSpec.modulePath}. If you just switched the code scheme for the component from blackbox to direct, use --force-overwrite option to force the switch.`
      );
    } else {
      logger.warn(
        `Overwrite ${compConfig.importSpec.modulePath} despite merge failure`
      );
      await writeFileContent(
        context,
        compConfig.importSpec.modulePath,
        newFileContent,
        {
          force: true,
        }
      );
    }
  }
};

export async function syncProjectComponents(
  context: PlasmicContext,
  project: ProjectConfig,
  version: string,
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean,
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[],
  projectLock: ProjectLock,
  checksums: ChecksumBundle
) {
  const componentsFromChecksums = new Set([
    ...checksums.cssRulesChecksums.map(([id, _]) => id),
    checksums.renderModuleChecksums.map(([id, _]) => id),
  ]);
  const allCompConfigs = L.keyBy(project.components, (c) => c.id);
  const componentBundleIds = L.keyBy(componentBundles, (i) => i.id);
  const deletedComponents = L.filter(
    allCompConfigs,
    (i) => !componentBundleIds[i.id] && !componentsFromChecksums.has(i.id)
  );

  const renderModuleFileLocks = L.keyBy(
    projectLock.fileLocks.filter(
      (fileLock) => fileLock.type === "renderModule"
    ),
    (fl) => fl.assetId
  );
  const cssRulesFileLocks = L.keyBy(
    projectLock.fileLocks.filter((fileLock) => fileLock.type === "cssRules"),
    (fl) => fl.assetId
  );
  const id2RenderModuleChecksum = new Map(checksums.renderModuleChecksums);
  const id2CssRulesChecksum = new Map(checksums.cssRulesChecksums);

  const deletedComponentFiles = new Set<string>();
  for (const deletedComponent of deletedComponents) {
    const componentConfig = allCompConfigs[deletedComponent.id];
    if (
      fileExists(context, componentConfig.renderModuleFilePath) &&
      fileExists(context, componentConfig.cssFilePath)
    ) {
      logger.info(
        `Deleting component: ${componentConfig.name}@${version}\t['${project.projectName}' ${project.projectId}/${componentConfig.id} ${project.version}]`
      );
      deleteFile(context, componentConfig.renderModuleFilePath);
      deleteFile(context, componentConfig.cssFilePath);
      deletedComponentFiles.add(deletedComponent.id);

      const skeletonPath = componentConfig.importSpec.modulePath;
      if (fileExists(context, skeletonPath)) {
        const deleteSkeleton = await confirmWithUser(
          `Do you want to delete ${skeletonPath}?`,
          context.cliArgs.yes
        );
        if (deleteSkeleton) {
          deleteFile(context, skeletonPath);
        }
      }
    }
  }
  project.components = project.components.filter(
    (c) => !deletedComponentFiles.has(c.id)
  );

  const deletedComponentIds = new Set(deletedComponents.map((i) => i.id));
  projectLock.fileLocks = projectLock.fileLocks.filter(
    (fileLock) =>
      (fileLock.type !== "renderModule" && fileLock.type !== "cssRules") ||
      !deletedComponentIds.has(fileLock.assetId)
  );

  for (const bundle of componentBundles) {
    const {
      renderModule,
      skeletonModule,
      cssRules,
      renderModuleFileName,
      skeletonModuleFileName,
      cssFileName,
      componentName,
      id,
      scheme,
      nameInIdToUuid,
      isPage,
    } = bundle;
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing component: ${componentName}@${version}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`
      );
    }
    let compConfig = allCompConfigs[id];
    const isNew = !compConfig;
    let skeletonModuleModified = isNew;

    const skeletonPath = isPage
      ? defaultPagePath(context, skeletonModuleFileName)
      : skeletonModuleFileName;

    const defaultRenderModuleFilePath = defaultResourcePath(
      context,
      project,
      renderModuleFileName
    );
    const defaultCssFilePath = defaultResourcePath(
      context,
      project,
      cssFileName
    );

    if (isNew) {
      // This is the first time we're syncing this component
      compConfig = {
        id,
        name: componentName,
        type: "managed",
        projectId: project.projectId,
        renderModuleFilePath: defaultRenderModuleFilePath,
        importSpec: { modulePath: skeletonPath },
        cssFilePath: defaultCssFilePath,
        scheme: scheme as "blackbox" | "direct",
        componentType: isPage ? "page" : "component",
      };
      allCompConfigs[id] = compConfig;
      project.components.push(allCompConfigs[id]);

      // Because it's the first time, we also generate the skeleton file.
      await writeFileContent(context, skeletonPath, skeletonModule, {
        force: false,
      });
    } else {
      // This is an existing component.

      compConfig.componentType = isPage ? "page" : "component";

      // Update config on new name from server
      if (componentName !== compConfig.name) {
        compConfig.name = componentName;
      }

      // Read in the existing file
      let editedFile: string;
      try {
        editedFile = readFileContent(context, compConfig.importSpec.modulePath);
      } catch (e) {
        logger.warn(
          `${compConfig.importSpec.modulePath} is missing. If you deleted this component, remember to remove the component from ${CONFIG_FILE_NAME}`
        );
        throw e;
      }

      const renderModuleFilePath = path.join(
        path.dirname(compConfig.renderModuleFilePath),
        path.basename(defaultRenderModuleFilePath)
      );
      if (
        compConfig.renderModuleFilePath !== renderModuleFilePath &&
        fileExists(context, compConfig.renderModuleFilePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming component file: ${compConfig.renderModuleFilePath}@${version}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`
          );
        }
        renameFile(
          context,
          compConfig.renderModuleFilePath,
          renderModuleFilePath
        );
        compConfig.renderModuleFilePath = renderModuleFilePath;
      }

      const cssFilePath = path.join(
        path.dirname(compConfig.cssFilePath),
        path.basename(defaultCssFilePath)
      );
      if (
        compConfig.cssFilePath !== cssFilePath &&
        fileExists(context, compConfig.cssFilePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming component css file: ${compConfig.cssFilePath}@${version}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`
          );
        }
        renameFile(context, compConfig.cssFilePath, cssFilePath);
        compConfig.cssFilePath = cssFilePath;
      }

      if (
        isPage &&
        isPageAwarePlatform(context.config.platform) &&
        skeletonPath !== compConfig.importSpec.modulePath &&
        fileExists(context, compConfig.importSpec.modulePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming page file: ${compConfig.importSpec.modulePath} -> ${skeletonPath}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`
          );
        }
        renameFile(context, compConfig.importSpec.modulePath, skeletonPath);
        compConfig.importSpec.modulePath = skeletonPath;
      }

      if (scheme === "direct") {
        // We cannot merge right now, but wait until all the imports are resolved
        pendingMerge.push({
          skeletonModulePath: compConfig.importSpec.modulePath,
          editedSkeletonFile: editedFile,
          newSkeletonFile: skeletonModule,
          merge: async (resolvedNewFile, resolvedEditedFile) =>
            updateDirectSkeleton(
              resolvedNewFile,
              resolvedEditedFile,
              context,
              compConfig,
              forceOverwrite,
              nameInIdToUuid,
              appendJsxOnMissingBase
            ),
        });
        skeletonModuleModified = true;
      } else if (/\/\/\s*plasmic-managed-jsx\/\d+/.test(editedFile)) {
        if (forceOverwrite) {
          skeletonModuleModified = true;
          await writeFileContent(
            context,
            compConfig.importSpec.modulePath,
            skeletonModule,
            {
              force: true,
            }
          );
        } else {
          logger.warn(
            `file ${compConfig.importSpec.modulePath} is likely in "direct" scheme. If you intend to switch the code scheme from direct to blackbox, use --force-overwrite option to force the switch.`
          );
        }
      }
    }

    assert(L.isArray(projectLock.fileLocks));
    // Update FileLocks
    if (renderModuleFileLocks[id]) {
      renderModuleFileLocks[id].checksum = ensure(
        id2RenderModuleChecksum.get(id)
      );
    } else {
      projectLock.fileLocks.push({
        type: "renderModule",
        assetId: id,
        checksum: ensure(id2RenderModuleChecksum.get(id)),
      });
    }
    if (cssRulesFileLocks[id]) {
      cssRulesFileLocks[id].checksum = ensure(id2CssRulesChecksum.get(id));
    } else {
      projectLock.fileLocks.push({
        type: "cssRules",
        assetId: id,
        checksum: ensure(id2CssRulesChecksum.get(id)),
      });
    }

    await writeFileContent(
      context,
      compConfig.renderModuleFilePath,
      renderModule,
      {
        force: !isNew,
      }
    );
    const formattedCssRules = formatAsLocal(cssRules, compConfig.cssFilePath);
    await writeFileContent(context, compConfig.cssFilePath, formattedCssRules, {
      force: !isNew,
    });
    summary.set(id, { skeletonModuleModified });
  }
}

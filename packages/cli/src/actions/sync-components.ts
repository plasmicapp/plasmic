import L from "lodash";
import path from "upath";
import { ChecksumBundle, ComponentBundle } from "../api";
import { logger } from "../deps";
import { ComponentUpdateSummary, formatAsLocal } from "../utils/code-utils";
import {
  CONFIG_FILE_NAME,
  PlasmicContext,
  ProjectConfig,
  ProjectLock,
  isPageAwarePlatform,
} from "../utils/config-utils";
import {
  defaultPagePath,
  defaultResourcePath,
  deleteFile,
  eqPagePath,
  fileExists,
  readFileContent,
  renameFile,
  writeFileContent,
} from "../utils/file-utils";
import { assert, ensure } from "../utils/lang-utils";
import { syncRscFiles } from "../utils/rsc-config";
import { confirmWithUser } from "../utils/user-utils";

export async function syncProjectComponents(
  context: PlasmicContext,
  project: ProjectConfig,
  version: string,
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  summary: Map<string, ComponentUpdateSummary>,
  projectLock: ProjectLock,
  checksums: ChecksumBundle,
  baseDir: string
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
      path: pagePath,
      plumeType,
    } = bundle;
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing component: ${componentName}@${version}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`
      );
    }
    let compConfig = allCompConfigs[id];

    // A component should be regenerated if it is new or path-related information (like the name)
    // changed.
    const shouldRegenerate = compConfig?.name !== componentName;
    let skeletonModuleModified = shouldRegenerate;

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

    if (shouldRegenerate) {
      project.components = project.components.filter(
        (existingComponent) => existingComponent.id !== id
      );
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
        path: pagePath,
        plumeType,
      };
      allCompConfigs[id] = compConfig;
      project.components.push(allCompConfigs[id]);

      // Because it's the first time, we also generate the skeleton file.
      await writeFileContent(context, skeletonPath, skeletonModule, {
        force: false,
      });
    } else if (compConfig.type === "mapped") {
    } else if (compConfig.type === "managed") {
      // This is an existing component.
      // We only bother touching files on disk if this component is managed.

      compConfig.componentType = isPage ? "page" : "component";

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
        !eqPagePath(skeletonPath, compConfig.importSpec.modulePath) &&
        fileExists(context, compConfig.importSpec.modulePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming page file: ${compConfig.importSpec.modulePath} -> ${skeletonPath}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`
          );
        }
        renameFile(context, compConfig.importSpec.modulePath, skeletonPath);
        compConfig.importSpec.modulePath = skeletonPath;
        if (
          compConfig.rsc?.clientModulePath &&
          fileExists(context, compConfig.rsc.clientModulePath)
        ) {
          const clientModulePath = skeletonPath.replace(
            /\.tsx$/,
            "-client.tsx"
          );
          if (context.cliArgs.quiet !== true) {
            logger.info(
              `Renaming page file: ${compConfig.rsc.clientModulePath} -> ${clientModulePath}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`
            );
          }
          renameFile(
            context,
            compConfig.rsc.clientModulePath,
            clientModulePath
          );
          compConfig.rsc.clientModulePath = clientModulePath;
        }
      }

      compConfig.plumeType = plumeType;

      if ((scheme as any) === "direct") {
        throw new Error(`Direct update codegen scheme is no longer supported`);
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

    if (compConfig.type === "managed") {
      // Again, only need to touch files on disk if managed
      await writeFileContent(
        context,
        compConfig.renderModuleFilePath,
        renderModule,
        {
          force: !shouldRegenerate,
        }
      );
      const formattedCssRules = formatAsLocal(
        cssRules,
        compConfig.cssFilePath,
        baseDir
      );
      await writeFileContent(
        context,
        compConfig.cssFilePath,
        formattedCssRules,
        {
          force: !shouldRegenerate,
        }
      );
    }
    summary.set(id, { skeletonModuleModified });

    await syncRscFiles(context, project, bundle, compConfig, {
      shouldRegenerate,
    });
  }
}

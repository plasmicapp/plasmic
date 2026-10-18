import L from "lodash";
import path from "upath";
import { ChecksumBundle, ComponentBundle } from "../api";
import { logger } from "../deps";
import {
  ComponentModuleRename,
  ComponentUpdateSummary,
  formatAsLocal,
  updateRenamedComponentImports,
} from "../utils/code-utils";
import {
  CONFIG_FILE_NAME,
  ComponentConfig,
  PlasmicContext,
  ProjectConfig,
  ProjectLock,
  isPageAwarePlatform,
} from "../utils/config-utils";
import { HandledError } from "../utils/error";
import {
  defaultPagePath,
  defaultResourcePath,
  deleteFile,
  eqPagePath,
  fileExists,
  readFileContent,
  renameFile,
  stripExtension,
  writeFileContent,
} from "../utils/file-utils";
import { assert, ensure } from "../utils/lang-utils";
import { makeRscClientModulePath, syncRscFiles } from "../utils/rsc-config";
import { confirmWithUser } from "../utils/user-utils";

interface RenamedComponent {
  oldConfig: ComponentConfig;
  // Contents of the old user-owned files, carried over to the new name
  skeleton?: string;
  rscClient?: string;
}

export async function syncProjectComponents(
  context: PlasmicContext,
  project: ProjectConfig,
  version: string,
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  summary: Map<string, ComponentUpdateSummary>,
  projectLock: ProjectLock,
  checksums: ChecksumBundle,
) {
  const componentsFromChecksums = new Set([
    ...checksums.cssRulesChecksums.map(([id, _]) => id),
    checksums.renderModuleChecksums.map(([id, _]) => id),
  ]);
  const allCompConfigs = L.keyBy(project.components, (c) => c.id);
  const componentBundleIds = L.keyBy(componentBundles, (i) => i.id);
  const deletedComponents = L.filter(
    allCompConfigs,
    (i) => !componentBundleIds[i.id] && !componentsFromChecksums.has(i.id),
  );

  const renderModuleFileLocks = L.keyBy(
    projectLock.fileLocks.filter(
      (fileLock) => fileLock.type === "renderModule",
    ),
    (fl) => fl.assetId,
  );
  const cssRulesFileLocks = L.keyBy(
    projectLock.fileLocks.filter((fileLock) => fileLock.type === "cssRules"),
    (fl) => fl.assetId,
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
        `Deleting component: ${componentConfig.name}@${version}\t['${project.projectName}' ${project.projectId}/${componentConfig.id} ${project.version}]`,
      );
      deleteFile(context, componentConfig.renderModuleFilePath);
      deleteFile(context, componentConfig.cssFilePath);
      deletedComponentFiles.add(deletedComponent.id);

      const skeletonPath = componentConfig.importSpec.modulePath;
      if (fileExists(context, skeletonPath)) {
        const deleteSkeleton = await confirmWithUser(
          `Do you want to delete ${skeletonPath}?`,
          context.cliArgs.yes,
        );
        if (deleteSkeleton) {
          deleteFile(context, skeletonPath);
        }
      }
    }
  }
  project.components = project.components.filter(
    (c) => !deletedComponentFiles.has(c.id),
  );

  const deletedComponentIds = new Set(deletedComponents.map((i) => i.id));
  projectLock.fileLocks = projectLock.fileLocks.filter(
    (fileLock) =>
      (fileLock.type !== "renderModule" && fileLock.type !== "cssRules") ||
      !deletedComponentIds.has(fileLock.assetId),
  );

  // New and renamed components, whose wrappers this sync writes
  const regenerated = componentBundles.filter(
    (bundle) => allCompConfigs[bundle.id]?.name !== bundle.componentName,
  );
  assertUniqueWrapperPaths(
    context,
    regenerated,
    allCompConfigs,
    deletedComponentIds,
  );
  const renamedComponents = await removeRenamedComponentFiles(
    context,
    project,
    version,
    componentBundles,
    allCompConfigs,
  );
  const renames: ComponentModuleRename[] = componentBundles.flatMap(
    (bundle) => {
      const old = renamedComponents.get(bundle.id)?.oldConfig;
      if (!old) {
        return [];
      }
      const skeletonPath = bundle.isPage
        ? defaultPagePath(context, bundle.skeletonModuleFileName)
        : old.importSpec.modulePath;
      const modules: [ComponentModuleRename["importType"], string, string][] = [
        [
          "render",
          old.renderModuleFilePath,
          path.join(
            path.dirname(old.renderModuleFilePath),
            bundle.renderModuleFileName,
          ),
        ],
        [
          "css",
          old.cssFilePath,
          path.join(path.dirname(old.cssFilePath), bundle.cssFileName),
        ],
      ];
      if (old.rsc && bundle.rscMetadata) {
        modules.push(
          [
            "rscServer",
            old.rsc.serverModulePath,
            path.join(
              path.dirname(old.rsc.serverModulePath),
              stripExtension(bundle.rscMetadata.pageWrappers.server.fileName) +
                (context.config.code.lang === "js" ? ".jsx" : ".tsx"),
            ),
          ],
          [
            "rscClient",
            old.rsc.clientModulePath,
            renamedClientPath(context, old, skeletonPath),
          ],
        );
      }
      return modules.map(([importType, oldPath, newPath]) => ({
        componentId: bundle.id,
        importType,
        oldPath,
        newPath,
        oldName: old.name,
        newName: bundle.componentName,
      }));
    },
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
      isPage,
      path: pagePath,
      plumeType,
    } = bundle;
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing component: ${componentName}@${version}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`,
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
      renderModuleFileName,
    );
    const defaultCssFilePath = defaultResourcePath(
      context,
      project,
      cssFileName,
    );

    if (shouldRegenerate) {
      const renamed = renamedComponents.get(id);
      // Generated files follow the component name within their existing directory.
      const keepDir = (oldFilePath: string | undefined, newFilePath: string) =>
        oldFilePath
          ? path.join(path.dirname(oldFilePath), path.basename(newFilePath))
          : newFilePath;
      const renderModuleFilePath = keepDir(
        renamed?.oldConfig.renderModuleFilePath,
        defaultRenderModuleFilePath,
      );
      const cssFilePath = keepDir(
        renamed?.oldConfig.cssFilePath,
        defaultCssFilePath,
      );
      // User code imports non-page wrappers by path; keep that module stable.
      const newSkeletonPath = isPage
        ? skeletonPath
        : (renamed?.oldConfig.importSpec.modulePath ?? skeletonPath);
      if (
        renamed &&
        !isPage &&
        path.basename(newSkeletonPath) !== path.basename(skeletonPath)
      ) {
        logger.warn(
          `Component "${renamed.oldConfig.name}" was renamed to "${componentName}", but its wrapper is still at "${newSkeletonPath}" to keep existing imports working. You can rename the wrapper manually, update its consumers' imports, and update this component's importSpec.modulePath in ${CONFIG_FILE_NAME}.`,
        );
      }

      project.components = project.components.filter(
        (existingComponent) => existingComponent.id !== id,
      );
      compConfig = {
        id,
        name: componentName,
        type: "managed",
        projectId: project.projectId,
        renderModuleFilePath,
        importSpec: { modulePath: newSkeletonPath },
        cssFilePath,
        scheme: scheme as "blackbox" | "direct",
        componentType: isPage ? "page" : "component",
        path: pagePath,
        plumeType,
      };
      allCompConfigs[id] = compConfig;
      project.components.push(allCompConfigs[id]);
      if (renamed?.rscClient !== undefined) {
        const oldRsc = ensure(renamed.oldConfig.rsc, "rscClient comes from it");
        const clientModulePath = renamedClientPath(
          context,
          renamed.oldConfig,
          newSkeletonPath,
        );
        await carryOverRenamedFile(
          context,
          oldRsc.clientModulePath,
          clientModulePath,
          renamed.rscClient,
          renames,
        );
        compConfig.rsc = {
          serverModulePath: oldRsc.serverModulePath,
          clientModulePath,
        };
      }
      if (renamed?.skeleton !== undefined) {
        compConfig.importSpec.exportName =
          renamed.oldConfig.importSpec.exportName;
        await carryOverRenamedFile(
          context,
          renamed.oldConfig.importSpec.modulePath,
          newSkeletonPath,
          renamed.skeleton,
          renames,
        );
      } else {
        // Because it's the first time, we also generate the skeleton file.
        await writeFileContent(context, newSkeletonPath, skeletonModule, {
          force: !!renamed,
        });
      }
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
          `${compConfig.importSpec.modulePath} is missing. If you deleted this component, remember to remove the component from ${CONFIG_FILE_NAME}`,
        );
        throw e;
      }

      const renderModuleFilePath = path.join(
        path.dirname(compConfig.renderModuleFilePath),
        path.basename(defaultRenderModuleFilePath),
      );
      if (
        compConfig.renderModuleFilePath !== renderModuleFilePath &&
        fileExists(context, compConfig.renderModuleFilePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming component file: ${compConfig.renderModuleFilePath}@${version}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`,
          );
        }
        renameFile(
          context,
          compConfig.renderModuleFilePath,
          renderModuleFilePath,
        );
        compConfig.renderModuleFilePath = renderModuleFilePath;
      }

      const cssFilePath = path.join(
        path.dirname(compConfig.cssFilePath),
        path.basename(defaultCssFilePath),
      );
      if (
        compConfig.cssFilePath !== cssFilePath &&
        fileExists(context, compConfig.cssFilePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming component css file: ${compConfig.cssFilePath}@${version}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`,
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
            `Renaming page file: ${compConfig.importSpec.modulePath} -> ${skeletonPath}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`,
          );
        }
        renameFile(context, compConfig.importSpec.modulePath, skeletonPath);
        compConfig.importSpec.modulePath = skeletonPath;
        if (
          compConfig.rsc?.clientModulePath &&
          fileExists(context, compConfig.rsc.clientModulePath)
        ) {
          const clientModulePath = makeRscClientModulePath(
            context,
            skeletonPath,
          );
          if (context.cliArgs.quiet !== true) {
            logger.info(
              `Renaming page file: ${compConfig.rsc.clientModulePath} -> ${clientModulePath}\t['${project.projectName}' ${project.projectId}/${id} ${project.version}]`,
            );
          }
          renameFile(
            context,
            compConfig.rsc.clientModulePath,
            clientModulePath,
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
            },
          );
        } else {
          logger.warn(
            `file ${compConfig.importSpec.modulePath} is likely in "direct" scheme. If you intend to switch the code scheme from direct to blackbox, use --force-overwrite option to force the switch.`,
          );
        }
      }
    }

    assert(L.isArray(projectLock.fileLocks), "fileLocks must be an array");
    // Update FileLocks
    if (renderModuleFileLocks[id]) {
      renderModuleFileLocks[id].checksum = ensure(
        id2RenderModuleChecksum.get(id),
        "missing render module checksum",
      );
    } else {
      projectLock.fileLocks.push({
        type: "renderModule",
        assetId: id,
        checksum: ensure(
          id2RenderModuleChecksum.get(id),
          "missing render module checksum",
        ),
      });
    }
    if (cssRulesFileLocks[id]) {
      cssRulesFileLocks[id].checksum = ensure(
        id2CssRulesChecksum.get(id),
        "missing css rules checksum",
      );
    } else {
      projectLock.fileLocks.push({
        type: "cssRules",
        assetId: id,
        checksum: ensure(
          id2CssRulesChecksum.get(id),
          "missing css rules checksum",
        ),
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
        },
      );
      const formattedCssRules = await formatAsLocal(
        cssRules,
        compConfig.cssFilePath,
      );
      await writeFileContent(
        context,
        compConfig.cssFilePath,
        formattedCssRules,
        {
          force: !shouldRegenerate,
        },
      );
    }
    summary.set(id, { skeletonModuleModified });

    await syncRscFiles(context, project, bundle, compConfig, {
      // A carried over client skeleton must not be overwritten
      shouldRegenerate: shouldRegenerate && !renamedComponents.has(id),
    });
  }

  // Other wrappers may import the generated modules removed by a rename.
  const regeneratedIds = new Set(regenerated.map((bundle) => bundle.id));
  const otherWrappers = context.config.projects
    .flatMap((p) => p.components)
    .filter((c) => c.type === "managed" && !regeneratedIds.has(c.id))
    .flatMap((c) => [c.importSpec.modulePath, c.rsc?.clientModulePath]);
  for (const file of L.uniq(otherWrappers)) {
    if (!file || !fileExists(context, file)) {
      continue;
    }
    const code = readFileContent(context, file);
    if (renames.length) {
      const renamedCode = await updateRenamedComponentImports(
        code,
        file,
        file,
        renames,
      );
      if (renamedCode !== code) {
        await writeFileContent(context, file, renamedCode, { force: true });
      }
    }
  }
}

// Renamed wrappers keep their path, which a new component may also claim.
function assertUniqueWrapperPaths(
  context: PlasmicContext,
  regenerated: ComponentBundle[],
  allCompConfigs: Record<string, ComponentConfig>,
  deletedComponentIds: Set<string>,
) {
  const regeneratedIds = new Set(regenerated.map((bundle) => bundle.id));
  const owners = new Map(
    context.config.projects
      .flatMap((p) => p.components)
      .filter(
        (c) =>
          c.type === "managed" &&
          !regeneratedIds.has(c.id) &&
          !deletedComponentIds.has(c.id),
      )
      .map((c) => [
        path.resolve(context.absoluteSrcDir, c.importSpec.modulePath),
        c.name,
      ]),
  );
  // Renamed components claim first; a new component must take another path.
  for (const bundle of L.sortBy(
    regenerated,
    (b) => allCompConfigs[b.id]?.type !== "managed",
  )) {
    const old = allCompConfigs[bundle.id];
    const wrapperPath = bundle.isPage
      ? defaultPagePath(context, bundle.skeletonModuleFileName)
      : old?.type === "managed"
        ? old.importSpec.modulePath
        : bundle.skeletonModuleFileName;
    const key = path.resolve(context.absoluteSrcDir, wrapperPath);
    const owner = owners.get(key);
    if (owner) {
      throw new HandledError(
        `Cannot sync ${bundle.componentName}: its wrapper ${wrapperPath} already belongs to ${owner}. Move ${owner}'s wrapper, update its importSpec.modulePath in ${CONFIG_FILE_NAME}, and sync again.`,
      );
    }
    owners.set(key, bundle.componentName);
  }
}

/**
 * A renamed component keeps its id but gets new generated file names, so the main
 * loop treats it like a newly added component and the files generated under
 * the old name would stay on disk forever.
 *
 * All old files are removed here, before the loop writes anything, so renames
 * that overlap (`Cmp1 -> Container1` while `Container1 -> Container2`, or two
 * components swapping names) never see each other's files. The old user-owned
 * files are read into memory first so the loop can update their contents and
 * restore them at the same wrapper path (or the new route for pages).
 */
async function removeRenamedComponentFiles(
  context: PlasmicContext,
  project: ProjectConfig,
  version: string,
  componentBundles: ComponentBundle[],
  allCompConfigs: Record<string, ComponentConfig>,
): Promise<Map<string, RenamedComponent>> {
  // Claim every user-owned destination before removing any source files. A
  // declined overwrite aborts the sync so both files and config remain intact.
  const renames = componentBundles.filter((bundle) => {
    const old = allCompConfigs[bundle.id];
    return old?.type === "managed" && old.name !== bundle.componentName;
  });
  const sources = new Set(
    renames.flatMap((bundle) => {
      const old = allCompConfigs[bundle.id];
      return [old.importSpec.modulePath, old.rsc?.clientModulePath]
        .filter((p): p is string => !!p)
        .map((p) => path.resolve(context.absoluteSrcDir, p));
    }),
  );
  for (const bundle of renames) {
    const old = allCompConfigs[bundle.id];
    const skeletonPath = bundle.isPage
      ? defaultPagePath(context, bundle.skeletonModuleFileName)
      : old.importSpec.modulePath;
    const destinations = [skeletonPath];
    if (old.rsc && fileExists(context, old.rsc.clientModulePath)) {
      destinations.push(renamedClientPath(context, old, skeletonPath));
    }
    for (const destination of destinations) {
      if (
        !sources.has(path.resolve(context.absoluteSrcDir, destination)) &&
        fileExists(context, destination) &&
        !(await confirmWithUser(
          `File ${destination} already exists. Do you want to overwrite?`,
          context.cliArgs.yes,
        ))
      ) {
        throw new HandledError(
          `Cannot rename ${old.name}: destination ${destination} was not accepted.`,
        );
      }
    }
  }
  const renamedComponents = new Map<string, RenamedComponent>();
  for (const bundle of componentBundles) {
    const oldConfig = allCompConfigs[bundle.id];
    if (
      !oldConfig ||
      oldConfig.type !== "managed" ||
      oldConfig.name === bundle.componentName
    ) {
      continue;
    }
    logger.info(
      `Renaming component: ${oldConfig.name} -> ${bundle.componentName}@${version}\t['${project.projectName}' ${project.projectId}/${oldConfig.id} ${project.version}]`,
    );

    const takeFile = (filePath: string | undefined) => {
      if (!filePath || !fileExists(context, filePath)) {
        return undefined;
      }
      const content = readFileContent(context, filePath);
      deleteFile(context, filePath);
      return content;
    };
    renamedComponents.set(bundle.id, {
      oldConfig,
      skeleton: takeFile(oldConfig.importSpec.modulePath),
      rscClient: takeFile(oldConfig.rsc?.clientModulePath),
    });
    takeFile(oldConfig.renderModuleFilePath);
    takeFile(oldConfig.cssFilePath);
    takeFile(oldConfig.rsc?.serverModulePath);
  }
  return renamedComponents;
}

// Only default client paths follow the page; custom locations stay put.
function renamedClientPath(
  context: PlasmicContext,
  old: ComponentConfig,
  skeletonPath: string,
) {
  const client = ensure(old.rsc, "RSC component").clientModulePath;
  return path.normalize(client) ===
    path.normalize(makeRscClientModulePath(context, old.importSpec.modulePath))
    ? makeRscClientModulePath(context, skeletonPath)
    : client;
}

async function carryOverRenamedFile(
  context: PlasmicContext,
  oldFilePath: string,
  newFilePath: string,
  code: string,
  renames: ComponentModuleRename[],
) {
  await writeFileContent(
    context,
    newFilePath,
    await updateRenamedComponentImports(
      code,
      oldFilePath,
      newFilePath,
      renames,
    ),
    // Destinations were accepted before any rename source was removed.
    { force: true },
  );
}

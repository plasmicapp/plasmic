import { SyncArgs } from "../actions/sync";
import { ChecksumBundle } from "../api";
import { PlasmicContext, ProjectConfig } from "./config-utils";
import { fileExists } from "./file-utils";
import { assert } from "./lang-utils";

function getFilesByFileLockAssetId(
  context: PlasmicContext,
  projectConfig: ProjectConfig
) {
  return {
    renderModule: Object.fromEntries(
      projectConfig.components.map((c) => [c.id, c.renderModuleFilePath])
    ),
    cssRules: Object.fromEntries(
      projectConfig.components.map((c) => [c.id, c.cssFilePath])
    ),
    icon: Object.fromEntries(
      projectConfig.icons.map((i) => [i.id, i.moduleFilePath])
    ),
    image: Object.fromEntries(
      projectConfig.images.map((i) => [i.id, i.filePath])
    ),
    projectCss: { [projectConfig.projectId]: projectConfig.cssFilePath },
    globalVariant: Object.fromEntries(
      context.config.globalVariants.variantGroups
        .filter((vg) => vg.projectId === projectConfig.projectId)
        .map((vg) => [vg.id, vg.contextFilePath])
    ),
    globalContext: {
      [projectConfig.projectId]: projectConfig.globalContextsFilePath,
    },
    splitsProvider: {
      [projectConfig.projectId]: projectConfig.splitsProviderFilePath,
    },
  } as const;
}

export function getChecksums(
  context: PlasmicContext,
  opts: SyncArgs,
  projectId: string,
  componentIds: string[]
): ChecksumBundle {
  const projectConfig = context.config.projects.find(
    (p) => p.projectId === projectId
  );

  const projectLock = context.lock.projects.find(
    (projectLock) => projectLock.projectId === projectId
  );

  if (!projectConfig || !projectLock || opts.allFiles) {
    return {
      imageChecksums: [],
      iconChecksums: [],
      renderModuleChecksums: [],
      cssRulesChecksums: [],
      globalVariantChecksums: [],
      projectCssChecksum: "",
      globalContextsChecksum: "",
      splitsProviderChecksum: "",
    };
  }

  // We only use checksum for files that actually exist on disk
  const fileLocations = getFilesByFileLockAssetId(context, projectConfig);
  const checkFile = (file: string | undefined) => {
    if (!file) {
      return false;
    }
    return fileExists(context, file);
  };

  const fileLocks = projectLock.fileLocks;

  const knownImages = new Set(projectConfig.images.map((i) => i.id));
  const knownIcons = new Set(projectConfig.icons.map((i) => i.id));
  const knownComponents = new Set(projectConfig.components.map((c) => c.id));
  const knownGlobalVariants = new Set(
    context.config.globalVariants.variantGroups
      .filter((vg) => vg.projectId === projectId)
      .map((vg) => vg.id)
  );

  const toBeSyncedComponents = new Set(componentIds);

  const imageChecksums = fileLocks
    .filter(
      (fileLock) =>
        fileLock.type === "image" && knownImages.has(fileLock.assetId)
    )
    .filter((fileLock) => checkFile(fileLocations.image[fileLock.assetId]))
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const iconChecksums = fileLocks
    .filter(
      (fileLock) =>
        projectLock.lang === context.config.code.lang &&
        fileLock.type === "icon" &&
        knownIcons.has(fileLock.assetId)
    )
    .filter((fileLock) => checkFile(fileLocations.icon[fileLock.assetId]))
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const renderModuleChecksums = fileLocks
    .filter(
      (fileLock) =>
        projectLock.lang === context.config.code.lang &&
        fileLock.type === "renderModule" &&
        toBeSyncedComponents.has(fileLock.assetId) &&
        knownComponents.has(fileLock.assetId)
    )
    .filter((fileLock) =>
      checkFile(fileLocations.renderModule[fileLock.assetId])
    )
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const cssRulesChecksums = fileLocks
    .filter(
      (fileLock) =>
        fileLock.type === "cssRules" &&
        toBeSyncedComponents.has(fileLock.assetId) &&
        knownComponents.has(fileLock.assetId)
    )
    .filter((fileLock) => checkFile(fileLocations.cssRules[fileLock.assetId]))
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const globalVariantChecksums = fileLocks
    .filter(
      (fileLock) =>
        projectLock.lang === context.config.code.lang &&
        fileLock.type === "globalVariant" &&
        knownGlobalVariants.has(fileLock.assetId)
    )
    .filter((fileLock) =>
      checkFile(fileLocations.globalVariant[fileLock.assetId])
    )
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const projectCssChecksums = fileLocks
    .filter((fileLock) => fileLock.type === "projectCss")
    .filter((fileLock) =>
      checkFile(fileLocations.projectCss[fileLock.assetId])
    );
  assert(projectCssChecksums.length < 2);
  const projectCssChecksum =
    projectCssChecksums.length > 0 ? projectCssChecksums[0].checksum : "";

  const globalContextsChecksums = fileLocks
    .filter(
      (fileLock) =>
        fileLock.type === "globalContexts" && fileLock.assetId === projectId
    )
    .filter((fileLock) =>
      checkFile(fileLocations.globalContext[fileLock.assetId])
    );
  assert(globalContextsChecksums.length < 2);
  const globalContextsChecksum =
    globalContextsChecksums.length > 0
      ? globalContextsChecksums[0].checksum
      : "";

  const splitsProviderChecksums = fileLocks
    .filter(
      (fileLock) =>
        fileLock.type === "splitsProvider" && fileLock.assetId === projectId
    )
    .filter((fileLock) =>
      checkFile(fileLocations.splitsProvider[fileLock.assetId])
    );
  assert(splitsProviderChecksums.length < 2);
  const splitsProviderChecksum =
    splitsProviderChecksums.length > 0
      ? splitsProviderChecksums[0].checksum
      : "";

  return {
    imageChecksums,
    iconChecksums,
    renderModuleChecksums,
    cssRulesChecksums,
    globalVariantChecksums,
    projectCssChecksum,
    globalContextsChecksum,
    splitsProviderChecksum,
  };
}

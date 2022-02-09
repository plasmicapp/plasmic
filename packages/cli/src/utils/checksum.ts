import { SyncArgs } from "../actions/sync";
import { ChecksumBundle } from "../api";
import { PlasmicContext } from "./config-utils";
import { assert } from "./lang-utils";

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
    };
  }

  const fileLocks = projectLock.fileLocks;

  const knownImages = new Set(projectConfig.images.map((i) => i.id));
  const knownIcons = new Set(projectConfig.icons.map((i) => i.id));
  const knownComponents = new Set(projectConfig.components.map((c) => c.id));
  const knownGlobalVariants = new Set(
    context.config.globalVariants.variantGroups
      .filter((vg) => vg.projectId === projectId)
      .map((vg) => vg.id)
  );
  const knownThemes = new Set(
    (projectConfig.jsBundleThemes || []).map((theme) => theme.bundleName)
  );

  const toBeSyncedComponents = new Set(componentIds);

  const imageChecksums = fileLocks
    .filter(
      (fileLock) =>
        fileLock.type === "image" && knownImages.has(fileLock.assetId)
    )
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const iconChecksums = fileLocks
    .filter(
      (fileLock) =>
        projectLock.lang === context.config.code.lang &&
        fileLock.type === "icon" &&
        knownIcons.has(fileLock.assetId)
    )
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const renderModuleChecksums = fileLocks
    .filter(
      (fileLock) =>
        projectLock.lang === context.config.code.lang &&
        fileLock.type === "renderModule" &&
        toBeSyncedComponents.has(fileLock.assetId) &&
        knownComponents.has(fileLock.assetId)
    )
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const cssRulesChecksums = fileLocks
    .filter(
      (fileLock) =>
        fileLock.type === "cssRules" &&
        toBeSyncedComponents.has(fileLock.assetId) &&
        knownComponents.has(fileLock.assetId)
    )
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const globalVariantChecksums = fileLocks
    .filter(
      (fileLock) =>
        projectLock.lang === context.config.code.lang &&
        fileLock.type === "globalVariant" &&
        knownGlobalVariants.has(fileLock.assetId)
    )
    .map((fileLock): [string, string] => [fileLock.assetId, fileLock.checksum]);

  const projectCssChecksums = fileLocks.filter(
    (fileLock) => fileLock.type === "projectCss"
  );
  assert(projectCssChecksums.length < 2);
  const projectCssChecksum =
    projectCssChecksums.length > 0 ? projectCssChecksums[0].checksum : "";

  const globalContextsChecksums = fileLocks.filter(
    (fileLock) =>
      fileLock.type === "globalContexts" && fileLock.assetId === projectId
  );
  assert(globalContextsChecksums.length < 2);
  const globalContextsChecksum =
    globalContextsChecksums.length > 0
      ? globalContextsChecksums[0].checksum
      : "";

  return {
    imageChecksums,
    iconChecksums,
    renderModuleChecksums,
    cssRulesChecksums,
    globalVariantChecksums,
    projectCssChecksum,
    globalContextsChecksum,
  };
}

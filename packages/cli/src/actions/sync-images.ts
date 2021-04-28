import L from "lodash";
import path from "upath";
import { ChecksumBundle, ImageBundle } from "../api";
import { logger } from "../deps";
import { FixImportContext } from "../utils/code-utils";
import {
  getOrAddProjectConfig,
  getOrAddProjectLock,
  PlasmicContext,
} from "../utils/config-utils";
import {
  defaultPublicResourcePath,
  defaultResourcePath,
  deleteFile,
  fileExists,
  readFileContent,
  renameFile,
  writeFileContent,
} from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";

export async function syncProjectImageAssets(
  context: PlasmicContext,
  projectId: string,
  version: string,
  imageBundles: ImageBundle[],
  checksums: ChecksumBundle
) {
  const project = getOrAddProjectConfig(context, projectId);
  const projectLock = getOrAddProjectLock(context, projectId);
  const knownImageConfigs = L.keyBy(project.images, (i) => i.id);
  const imageBundleIds = L.keyBy(imageBundles, (i) => i.id);
  const imageFileLocks = L.keyBy(
    projectLock.fileLocks.filter((fileLock) => fileLock.type === "image"),
    (fl) => fl.assetId
  );
  const id2ImageChecksum = new Map(checksums.imageChecksums);

  const deletedImages = L.filter(
    knownImageConfigs,
    (i) => !imageBundleIds[i.id] && !id2ImageChecksum.has(i.id)
  );

  for (const bundle of imageBundles) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing image: ${bundle.name}@${version}\t['${project.projectName}' ${project.projectId}/${bundle.id} ${project.version}]`
      );
    }
    let imageConfig = knownImageConfigs[bundle.id];
    const isNew = !imageConfig;
    const defaultFilePath =
      context.config.images.scheme === "public-files"
        ? defaultPublicResourcePath(context, project, "images", bundle.fileName)
        : defaultResourcePath(context, project, "images", bundle.fileName);
    if (isNew) {
      imageConfig = {
        id: bundle.id,
        name: bundle.name,
        filePath: defaultFilePath,
      };
      project.images.push(imageConfig);
    } else {
      const filePath = path.join(
        path.dirname(imageConfig.filePath),
        path.basename(defaultFilePath)
      );
      if (
        imageConfig.filePath !== filePath &&
        fileExists(context, imageConfig.filePath)
      ) {
        if (context.cliArgs.quiet !== true) {
          logger.info(
            `Renaming image: ${imageConfig.name}@${version}\t['${project.projectName}' ${project.projectId}/${bundle.id} ${project.version}]`
          );
        }
        renameFile(context, imageConfig.filePath, filePath);
        imageConfig.filePath = filePath;
      }
      imageConfig.name = bundle.name;
    }

    // Update FileLocks
    if (imageFileLocks[bundle.id]) {
      imageFileLocks[bundle.id].checksum = ensure(
        id2ImageChecksum.get(bundle.id)
      );
    } else {
      projectLock.fileLocks.push({
        type: "image",
        assetId: bundle.id,
        checksum: ensure(id2ImageChecksum.get(bundle.id)),
      });
    }

    await writeFileContent(
      context,
      imageConfig.filePath,
      Buffer.from(bundle.blob, "base64"),
      {
        force: !isNew,
      }
    );
  }

  const deletedImageFiles = new Set<string>();
  for (const deletedImage of deletedImages) {
    const imageConfig = knownImageConfigs[deletedImage.id];
    if (fileExists(context, imageConfig.filePath)) {
      logger.info(
        `Deleting image: ${imageConfig.name}@${version}\t['${project.projectName}' ${project.projectId}/${deletedImage.id} ${project.version}]`
      );
      deleteFile(context, imageConfig.filePath);
      deletedImageFiles.add(deletedImage.id);
    }
  }
  project.images = project.images.filter((i) => !deletedImageFiles.has(i.id));

  const deletedImageIds = new Set(deletedImages.map((i) => i.id));
  projectLock.fileLocks = projectLock.fileLocks.filter(
    (fileLock) =>
      fileLock.type !== "image" || !deletedImageIds.has(fileLock.assetId)
  );
}

const RE_ASSETCSSREF_ALL = /var\(--image-([^\)]+)\)/g;
export async function fixComponentCssReferences(
  context: PlasmicContext,
  fixImportContext: FixImportContext,
  cssFilePath: string
) {
  if (!fileExists(context, cssFilePath)) {
    return;
  }

  const prevContent = readFileContent(context, cssFilePath);
  const newContent = prevContent.replace(RE_ASSETCSSREF_ALL, (sub, assetId) => {
    const asset = fixImportContext.images[assetId];
    if (asset) {
      return context.config.images.scheme === "public-files"
        ? `url("${path.join(
            "/",
            ensure(context.config.images.publicUrlPrefix),
            path.relative(
              ensure(context.config.images.publicDir),
              asset.filePath
            )
          )}")`
        : `url("./${path.relative(
            path.dirname(cssFilePath),
            asset.filePath
          )}")`;
    } else {
      return sub;
    }
  });

  if (prevContent !== newContent) {
    await writeFileContent(context, cssFilePath, newContent, { force: true });
  }
}

const RE_ASSETTSXREF_ALL = /Plasmic_Image_([^\)\s]+)__Ref/g;
export async function fixComponentImagesReferences(
  context: PlasmicContext,
  fixImportContext: FixImportContext,
  renderModuleFilePath: string
) {
  const prevContent = readFileContent(context, renderModuleFilePath);
  const newContent = prevContent.replace(RE_ASSETTSXREF_ALL, (sub, assetId) => {
    const asset = fixImportContext.images[assetId];
    if (asset) {
      return path.join(
        "/",
        ensure(context.config.images.publicUrlPrefix),
        path.relative(ensure(context.config.images.publicDir), asset.filePath)
      );
    } else {
      return sub;
    }
  });

  if (prevContent !== newContent) {
    await writeFileContent(context, renderModuleFilePath, newContent, {
      force: true,
    });
    // Returns true if the content changed
    return true;
  }
  return false;
}

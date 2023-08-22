import { PromisePool } from "@supercharge/promise-pool";
import cliProgress from "cli-progress";
import L from "lodash";
import fetch from "node-fetch";
import path from "upath";
import { ChecksumBundle, ImageBundle } from "../api";
import { logger } from "../deps";
import { FixImportContext } from "../utils/code-utils";
import {
  getOrAddProjectConfig,
  getOrAddProjectLock,
  ImageConfig,
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
  branchName: string,
  version: string,
  imageBundles: ImageBundle[],
  checksums: ChecksumBundle
) {
  const project = getOrAddProjectConfig(context, projectId);
  const projectLock = getOrAddProjectLock(context, projectId, branchName);
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

  await ensureImageAssetContents(imageBundles);

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

export async function ensureImageAssetContents(bundles: ImageBundle[]) {
  // The server may send images as a url instead of a base64 blob. In that
  // case, we fetch the images here in the cli, instead of on the server.
  // If you have a lot of images, this moves the expensive / long fetch
  // from the codegen server to the cli
  const needsFetching = bundles.filter((b) =>
    b.blob.startsWith("https://site-assets.plasmic.app/")
  );
  if (needsFetching.length === 0) {
    return;
  }
  const bar = new cliProgress.SingleBar({
    format: `Downloading images [{bar}] | {value}/{total}`,
  });
  bar.start(needsFetching.length, 0);

  await new PromisePool()
    .withConcurrency(10)
    .for(needsFetching)
    .process(async (bundle) => {
      try {
        const res = await fetch(bundle.blob);
        if (res.status !== 200) {
          throw new Error(
            `Fetching ${bundle.blob} failed with status ${res.status}`
          );
        }
        const arrayBuffer = await res.arrayBuffer();
        bundle.blob = Buffer.from(arrayBuffer).toString("base64");
        bar.increment();
      } catch (err) {
        logger.error(`Failed to fetch image ${bundle.fileName}: ${err}`);
        throw err;
      }
    });
  bar.stop();
}

function getImagePublicUrl(context: PlasmicContext, asset: ImageConfig) {
  return (
    ensure(context.config.images.publicUrlPrefix) +
    (ensure(context.config.images.publicUrlPrefix).endsWith("/") ? "" : "/") +
    path.relative(ensure(context.config.images.publicDir), asset.filePath)
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
        ? `url("${getImagePublicUrl(context, asset)}")`
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
      return getImagePublicUrl(context, asset);
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

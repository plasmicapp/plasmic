import L from "lodash";
import { pathToFileURL } from "url";
import { ImageBundle } from "../api";
import { getOrAddProjectConfig, PlasmicContext } from "../utils/config-utils";
import path from "upath";
import {
  defaultResourcePath,
  readFileContent,
  readFileText,
  writeFileContent,
} from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import { logger } from "../deps";
import { FixImportContext } from "../utils/code-utils";

export function syncProjectImageAssets(
  context: PlasmicContext,
  projectId: string,
  version: string,
  imageBundles: ImageBundle[]
) {
  const project = getOrAddProjectConfig(context, projectId);
  const knownImageConfigs = L.keyBy(project.images, (i) => i.id);
  for (const bundle of imageBundles) {
    if (context.cliArgs.quiet !== true) {
      logger.info(
        `Syncing image: ${bundle.name}@${version}\t['${project.projectName}' ${project.projectId}/${bundle.id} ${project.version}]`
      );
    }
    let imageConfig = knownImageConfigs[bundle.id];
    const isNew = !imageConfig;
    const defaultFilePath = defaultResourcePath(
      context,
      project,
      "images",
      bundle.fileName
    );
    if (isNew) {
      imageConfig = {
        id: bundle.id,
        name: bundle.name,
        filePath: defaultFilePath,
      };
      project.images.push(imageConfig);
    } else {
      imageConfig.name = bundle.name;
    }

    writeFileContent(
      context,
      imageConfig.filePath,
      Buffer.from(bundle.blob, "base64"),
      {
        force: !isNew,
      }
    );
  }
}

const RE_ASSETREF_ALL = /var\(--image-([^\)]+)\)/g;
export function fixComponentCssReferences(
  context: PlasmicContext,
  fixImportContext: FixImportContext,
  cssFilePath: string
) {
  const prevContent = readFileContent(context, cssFilePath);
  const newContent = prevContent.replace(RE_ASSETREF_ALL, (sub, assetId) => {
    const asset = fixImportContext.images[assetId];
    if (asset) {
      return `url("./${path.relative(
        path.dirname(cssFilePath),
        asset.filePath
      )}")`;
    } else {
      return sub;
    }
  });

  if (prevContent !== newContent) {
    writeFileContent(context, cssFilePath, newContent, { force: true });
  }
}

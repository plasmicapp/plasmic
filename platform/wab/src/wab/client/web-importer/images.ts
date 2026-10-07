import { AppCtx } from "@/wab/client/app-ctx";
import {
  ImageAssetOpts,
  ResizableImage,
  maybeUploadImage,
  readAndSanitizeFileAsImage,
} from "@/wab/client/dom-utils";
import { WIError } from "@/wab/client/web-importer/errors";
import { WIBase, WIElement, WIText } from "@/wab/client/web-importer/types";
import type { TplMgr } from "@/wab/shared/TplMgr";
import { assertNever, withoutNils } from "@/wab/shared/common";
import { mkImageAssetRef } from "@/wab/shared/core/image-assets";
import { extractImageDataUrls } from "@/wab/shared/css/urls";
import {
  asSvgDataUrl,
  isImageDataUrl,
  isSvgDataUrl,
} from "@/wab/shared/data-urls";
import L from "lodash";
import { Result, err, fromPromise, ok, safeTry } from "neverthrow";
import { regex } from "regex";

/**
 * An image or svg data parsed from the data uri.
 */
export interface UploadedAssetData {
  image: ResizableImage;
  options: ImageAssetOpts;
}

export function getImgSrc(node: WIBase): string | undefined {
  if (node.attrs.srcset) {
    const options = node.attrs.srcset.split("\n");
    return options[options.length - 1].split(" ")[0];
  }
  return node.attrs.src;
}

/**
 * Collects every image the parsed HTML carries as inline data uri. We only
 * collect images from the safe styles properties since unsafe styles cannot hold
 * image reference, and it will create image asset unnecessarily.
 */
export function collectImageDataUris(wiTree: WIElement): Set<string> {
  const dataUris = new Set<string>();

  function collectFromStyles(styles: Record<string, string>) {
    for (const value of Object.values(styles)) {
      for (const dataUri of extractImageDataUrls(value)) {
        dataUris.add(dataUri);
      }
    }
  }

  function collectFromNode(node: WIElement) {
    const recurse = (children: WIElement[]) =>
      children.forEach((child) => collectFromNode(child));

    if (node.type === "fragment") {
      recurse(node.children);
      return;
    }

    for (const vs of node.variantSettings) {
      collectFromStyles(vs.safeStyles);
    }

    switch (node.type) {
      case "container": {
        const src = node.tag === "img" ? getImgSrc(node) : undefined;
        if (src && isImageDataUrl(src)) {
          dataUris.add(src);
        }
        recurse(node.children);
        return;
      }
      case "text":
        recurse(
          node.content.filter(
            (part): part is WIText => typeof part !== "string",
          ),
        );
        return;
      case "component":
        recurse(Object.values(node.slots).flat());
        return;
      case "slot-target":
        recurse(node.defaultChildren);
        return;
      case "svg":
        dataUris.add(asSvgDataUrl(node.outerHtml));
        return;
      default:
        assertNever(node);
    }
  }

  collectFromNode(wiTree);

  return dataUris;
}

function uploadImageDataUri(appCtx: AppCtx, dataUri: string) {
  const uploadError = (): WIError =>
    isSvgDataUrl(dataUri)
      ? { code: "svg-upload-failed" }
      : { code: "image-upload-failed" };

  return safeTry(async function* () {
    const image = yield* fromPromise(
      readAndSanitizeFileAsImage(appCtx, dataUri),
      uploadError,
    );
    if (!image) {
      return err(uploadError());
    }
    const { imageResult, opts } = yield* fromPromise(
      maybeUploadImage(appCtx, image, undefined, undefined),
      uploadError,
    );
    return imageResult && opts
      ? ok({ image: imageResult, options: opts })
      : err(uploadError());
  });
}

export async function uploadImageDataUris(
  appCtx: AppCtx,
  dataUris: Iterable<string>,
): Promise<
  Result<
    Map<string, UploadedAssetData>,
    {
      uploaded: Map<string, UploadedAssetData>;
      errors: WIError[];
    }
  >
> {
  const uploaded = new Map<string, UploadedAssetData>();
  const errors: WIError[] = [];
  await Promise.all(
    [...new Set(dataUris)].map(async (dataUri) => {
      const result = await uploadImageDataUri(appCtx, dataUri);
      if (result.isOk()) {
        uploaded.set(dataUri, result.value);
      } else {
        errors.push(result.error);
      }
    }),
  );

  return errors.length === 0 ? ok(uploaded) : err({ uploaded, errors });
}

/**
 * Uploads the images embedded in the style values. The uploaded ones go to
 * {@link mkImageAssetRefs}, and the ones that failed come back as errors.
 */
export async function uploadStyleImages(
  appCtx: AppCtx,
  styles: (Record<string, string | null> | null | undefined)[],
): Promise<{
  uploadedAssets: Map<string, UploadedAssetData>;
  errors: WIError[];
}> {
  const dataUris = styles.flatMap((values) =>
    withoutNils(Object.values(values ?? {})).flatMap((value) =>
      extractImageDataUrls(value),
    ),
  );
  return (await uploadImageDataUris(appCtx, dataUris)).match(
    (uploadedAssets) => ({ uploadedAssets, errors: [] }),
    ({ uploaded, errors }) => ({ uploadedAssets: uploaded, errors }),
  );
}

export function mkImageAssetRefs(
  tplMgr: TplMgr,
  uploadedAssets: Map<string, UploadedAssetData>,
): Map<string, string> {
  const assetRefs = new Map<string, string>();
  for (const [dataUri, { image, options }] of uploadedAssets) {
    const { asset } = tplMgr.getOrCreateImageAsset(image, options);
    assetRefs.set(dataUri, mkImageAssetRef(asset));
  }
  return assetRefs;
}

// Matches one url() token and captures the url inside it.
const URL_TOKEN = regex("g")`
  (?i: url ) \( \s*  # css function names are case-insensitive
  (?<quote> ["']? )  # css allows url(x), url("x"), url('x')
  (?<url> .*? )
  \k<quote>
  \s* \)
`;

/**
 * Replaces each embedded url(<data-uri>) in the style values for its image
 * asset ref i.e var(--image-<uuid>).
 */
export function replaceImageDataUrisInStyles(
  styles: Record<string, string>,
  assetRefs: Map<string, string>,
): Record<string, string> {
  const replaced = L.mapValues(styles, (value) =>
    value.replace(
      URL_TOKEN,
      (match, _quote, url) => assetRefs.get(url) ?? match,
    ),
  );

  // A data uri left here has no asset, e.g. its upload failed, so the whole
  // declaration is dropped to keep the raw image out of the model.
  return L.omitBy(replaced, (value) => extractImageDataUrls(value).length > 0);
}

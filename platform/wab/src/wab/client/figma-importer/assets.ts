import { ImageAsset } from "@/wab/classes";
import { AppCtx } from "@/wab/client/app-ctx";
import {
  SiteOps,
  uploadSvgImage,
} from "@/wab/client/components/canvas/site-ops";
import {
  ImageAssetOpts,
  ResizableImage,
  maybeUploadImage,
  parseImage,
} from "@/wab/client/dom-utils";
import { vectorNodeTypes } from "@/wab/client/figma-importer/constants";
import { SceneNode } from "@/wab/client/figma-importer/plugin-types";
import { FigmaData } from "@/wab/client/figma-importer/types";
import { ensure } from "@/wab/common";
import { ImageAssetType } from "@/wab/image-asset-type";
import { keys } from "lodash";

export async function uploadFigmaImages(figmaData: FigmaData, appCtx: AppCtx) {
  const uploadedImages: Map<
    string,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  > = new Map();
  for (const hash of [...keys(figmaData.i)]) {
    const imageData = figmaData.i[hash];
    const image = await parseImage(appCtx, imageData);
    const { imageResult, opts } = image
      ? await maybeUploadImage(
          appCtx,
          image,
          ImageAssetType.Picture,
          "(unnamed)"
        )
      : { imageResult: undefined, opts: undefined };
    uploadedImages.set(hash, {
      imageResult: ensure(
        imageResult,
        "There should be a resulting image after upload"
      ),
      opts: ensure(opts, "There should be a resulting opts after upload"),
    });
  }
  return uploadedImages;
}

export function createImageAssets(
  uploadedImages: Map<
    string,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  siteOps: SiteOps
) {
  const imageAssets: Map<string, ImageAsset> = new Map();
  uploadedImages.forEach((imageParams, hash) => {
    const { imageResult, opts } = imageParams;
    const asset = siteOps.createImageAsset(imageResult, opts).asset;
    imageAssets.set(hash, asset);
  });
  return imageAssets;
}

export function renameImageAssets(
  siteOps: SiteOps,
  imagesToRename: Map<string, string>,
  imageAssets: Map<string, ImageAsset>
) {
  imagesToRename.forEach((name, hash) => {
    const imageAsset = ensure(
      imageAssets.get(hash),
      "Should have image asset created for hash"
    );
    siteOps.renameImageAsset(imageAsset, name);
  });
}

async function uploadAssetFromNode(node: SceneNode, appCtx: AppCtx) {
  if (!("svgData" in node)) {
    // An invisible node. Just discard it.
    return undefined;
  }

  // For Vector node types, attempt to use the svg dimensions as in figma
  // they're usually managed via strokes.
  const nodeWidth = node.width;
  const nodeHeight = node.height;

  const xml = ensure(node.svgData, "Checked before");

  const { imageResult, opts } = await uploadSvgImage(
    xml,
    vectorNodeTypes.includes(node.type),
    nodeWidth,
    nodeHeight,
    appCtx,
    node.name
  );
  return {
    imageResult: ensure(
      imageResult,
      "There should be a resulting image after upload"
    ),
    opts: ensure(opts, "There should be a resulting opts after upload"),
  };
}

export async function uploadNodeImages(nodes: SceneNode[], appCtx: AppCtx) {
  const nodeImages: Map<
    SceneNode,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  > = new Map();

  const allNodes: SceneNode[] = [];

  const dfs = (cur: SceneNode) => {
    allNodes.push(cur);
    if (
      cur.type === "COMPONENT" ||
      cur.type === "FRAME" ||
      cur.type === "INSTANCE" ||
      cur.type === "GROUP"
    ) {
      (cur.children || []).forEach(dfs);
    }
  };
  for (const node of nodes) {
    dfs(node);
  }
  for (const node of allNodes) {
    const uploadedImage = await uploadAssetFromNode(node, appCtx);
    if (uploadedImage) {
      nodeImages.set(node, uploadedImage);
    }
  }
  return nodeImages;
}

export function createNodeAssets(
  nodeImages: Map<
    SceneNode,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >,
  siteOps: SiteOps
) {
  const nodeAssets: Map<SceneNode, { asset: ImageAsset; iconColor?: string }> =
    new Map();
  nodeImages.forEach((imageParams, node) => {
    const { imageResult, opts } = imageParams;
    const asset = siteOps.createImageAsset(imageResult, opts);
    nodeAssets.set(node, asset);
  });
  return nodeAssets;
}

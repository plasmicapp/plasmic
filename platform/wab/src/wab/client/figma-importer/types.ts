import { ImageAssetOpts, ResizableImage } from "@/wab/client/dom-utils";
import { SceneNode } from "@/wab/client/figma-importer/plugin-types";
import { CSSProperties } from "react";

export type Serializable =
  | number
  | string
  | boolean
  | null
  | Array<Serializable>
  | JSONObject;

export interface JSONObject {
  [key: string]: Serializable;
}

export type FigmaClipboard = {
  nodes: Array<SceneNode>;
  uploadedImages: Map<
    string,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >;
  nodeImages: Map<
    SceneNode,
    { imageResult: ResizableImage; opts: ImageAssetOpts }
  >;
  imagesToRename: Map<string, string>;
};

export type FigmaData = {
  version?: string;
  // Images (as base 64 data)
  i: Map<string, string>;
  // Keys
  k: Array<string>;
  // Nodes
  n: Array<JSONObject>;
  // Strings
  s: Array<string>;
  // Vectors (as SVG XML)
  v: Map<string, string>;
};

export type Style = CSSProperties | StyleArray | false | null | undefined;

export type StyleArray = Array<Style>;

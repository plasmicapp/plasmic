import { pick } from "lodash";
import { ArenaFrame, Component, TplNode } from "../classes";
import { ensure } from "../common";
import { cloneArenaFrame } from "../shared/Arenas";
import { VariantCombo } from "../shared/Variants";
import * as Tpls from "../tpls";
import {
  readAndSanitizeFileAsImage,
  readAndSanitizeSvgXmlAsImage,
  ResizableImage,
} from "./dom-utils";

export interface StyleClip {
  type: "style";
  cssProps: Record<string, string>;
}

export interface TplClip {
  type: "tpl";
  component: Component;
  node: TplNode;

  // Original node - used to preserve reference to original copied node when
  // clip is cloned
  origNode?: TplNode;

  // Active variant combo when the node was copied.  If node is not variantable,
  // then undefined.
  activeVariants?: VariantCombo;
}

export interface FrameClip {
  type: "frame";
  frame: ArenaFrame;
}
export type Clippable = TplClip | TplClip[] | FrameClip | StyleClip;

export function isStyleClip(x: Clippable): x is StyleClip {
  return !Array.isArray(x) && x.type === "style";
}

export function isTplClip(x: Clippable): x is TplClip {
  return !Array.isArray(x) && x.type === "tpl";
}

export function isTplsClip(x: Clippable): x is TplClip[] {
  return Array.isArray(x);
}

export function isFrameClip(x: Clippable): x is FrameClip {
  return !Array.isArray(x) && x.type === "frame";
}

export function cloneClip(x: Clippable): Clippable {
  if (isStyleClip(x)) {
    return {
      type: "style",
      cssProps: { ...x.cssProps },
    };
  } else if (isTplClip(x)) {
    return {
      type: "tpl",
      component: x.component,
      origNode: x.origNode ?? x.node,
      node: Tpls.clone(x.node),
      activeVariants: x.activeVariants ? [...x.activeVariants] : undefined,
    };
  } else if (isFrameClip(x)) {
    return {
      type: "frame",
      frame: cloneArenaFrame(x.frame),
    };
  } else {
    return x.map((clip) => cloneClip(clip) as TplClip);
  }
}

export class Clipboard {
  _contents: undefined | Clippable = undefined;
  copy(x: Clippable) {
    this._contents = cloneClip(x);
  }
  paste() {
    const contents = ensure(
      this._contents,
      "Cannot paste if there is no contents in the clipboard"
    );
    return cloneClip(contents);
  }
  clear() {
    this._contents = undefined;
  }
  isSet() {
    return this._contents !== undefined;
  }
  isEmpty() {
    return !this.isSet();
  }
  contents() {
    return this._contents;
  }
}

export type ClipboardAction = "cut" | "copy";

interface ParsedClipboardImage {
  url: string;
  height: number;
  width: number;
  aspectRatio: number | undefined;
}

export interface ParsedClipboardData {
  map: Record<string, string>;
  image?: ParsedClipboardImage;
}

export async function parseClipboardItems(
  items: ClipboardItem[],
  lastAction: ClipboardAction
): Promise<ParsedClipboardData> {
  const map: Record<string, string> = {};
  let image: ParsedClipboardImage | undefined;
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items[i].types.length; j++) {
      const format = items[i].types[j];

      // Clipboard API does not allow getting arbitrary data (other
      // than text and image).
      if (format === "application/vnd.plasmic.clipboard+json") {
        map[format] = JSON.stringify({ action: lastAction });
        continue;
      }

      const blob = await items[i].getType(format);
      if (!blob) {
        continue;
      }

      if (format.indexOf("image") >= 0) {
        // Convert from blob to file.
        const b = blob as any;
        b.name = "";
        b.lastModifiedDate = new Date();
        const file = b as File;

        const resizableImage = await readAndSanitizeFileAsImage(file);
        if (resizableImage?.url) {
          image = {
            ...pick(resizableImage, ["url", "width", "height"]),
            aspectRatio: resizableImage.actualAspectRatio,
          };
          continue;
        }
      }

      const text = await blob.text();

      try {
        const svg = await readAndSanitizeSvgXmlAsImage(text);
        if (svg?.url) {
          image = {
            ...pick(svg, ["url", "width", "height"]),
            aspectRatio: svg.actualAspectRatio,
          };
          continue;
        }
      } catch (_) {
        // If an error happens in SVG parsing, just keep going and
        // treat the pasted content as plain text.
      }

      map[format] = text;
    }
  }
  return { map, image };
}

/**
 * This is used to transform an array of ClipboardItem, coming from
 * Clipboard API, into a more usable interface to get clipboard data.
 */
export class ClipboardData {
  private map: Record<string, string>;
  private image: ResizableImage | undefined;

  constructor() {
    this.map = {};
  }

  setParsedData(data: ParsedClipboardData) {
    this.map = { ...data.map };
    this.image = data.image
      ? new ResizableImage(
          data.image.url,
          data.image.width,
          data.image.height,
          data.image.aspectRatio
        )
      : undefined;
  }

  getData(format: string): string {
    return this.map[format] || "";
  }

  getImage(): ResizableImage | undefined {
    return this.image;
  }
}

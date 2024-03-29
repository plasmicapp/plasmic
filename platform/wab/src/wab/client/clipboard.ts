import { ArenaFrame, Component, TplNode } from "@/wab/classes";
import { ensure } from "@/wab/common";
import { cloneArenaFrame } from "@/wab/shared/Arenas";
import { VariantCombo } from "@/wab/shared/Variants";
import * as Tpls from "@/wab/tpls";
import { AppCtx } from "./app-ctx";
import {
  readAndSanitizeFileAsImage,
  readAndSanitizeSvgXmlAsImage,
  readUploadedFileAsDataUrl,
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

export const PLASMIC_CLIPBOARD_FORMAT =
  "application/vnd.plasmic.clipboard+json";

export interface ParsedClipboardData {
  map: Record<string, string>;
}

export async function parseClipboardItems(
  items: ClipboardItem[],
  lastAction: ClipboardAction
): Promise<ParsedClipboardData> {
  const map: Record<string, string> = {};
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items[i].types.length; j++) {
      const format = items[i].types[j];

      // Clipboard API does not allow getting arbitrary data (other
      // than text and image).
      if (format === PLASMIC_CLIPBOARD_FORMAT) {
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

        const dataUrl = await readUploadedFileAsDataUrl(file);
        map[format] = dataUrl;
        continue;
      }

      const text = await blob.text();
      map[format] = text;
    }
  }
  return { map };
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

  async setParsedData(appCtx: AppCtx, data: ParsedClipboardData) {
    this.map = {};
    for (const [key, value] of Object.entries(data.map)) {
      if (key.indexOf("image") >= 0) {
        const resizableImage = await readAndSanitizeFileAsImage(appCtx, value);
        if (resizableImage?.url) {
          this.image = resizableImage;
          continue;
        }
      }

      try {
        const svg = await readAndSanitizeSvgXmlAsImage(appCtx, value);
        if (svg?.url) {
          this.image = new ResizableImage(
            svg.url,
            svg.width,
            svg.height,
            svg.actualAspectRatio
          );
          continue;
        }
      } catch (_) {
        // If an error happens in SVG parsing, just keep going and
        // treat the pasted content as plain text.
      }

      this.map[key] = value;
    }
  }

  getData(format: string): string {
    return this.map[format] || "";
  }

  getImage(): ResizableImage | undefined {
    return this.image;
  }
}

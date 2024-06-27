import { AppCtx } from "@/wab/client/app-ctx";
import {
  readAndSanitizeFileAsImage,
  readAndSanitizeSvgXmlAsImage,
  readUploadedFileAsDataUrl,
  ResizableImage,
} from "@/wab/client/dom-utils";
import { swallow } from "@/wab/shared/common";

import {
  PlasmicClipboardData,
  PLASMIC_CLIPBOARD_FORMAT,
} from "@/wab/client/clipboard/common";
import { LocalClipboardAction } from "@/wab/client/clipboard/local";

export type ClipboardData = { [type: string]: string | File };
export type SerializableClipboardData = { [type: string]: string };

/**
 * Clipboard abstraction for pasting.
 */
export class ReadableClipboard {
  static fromData(data: ClipboardData) {
    return new ReadableClipboard(data);
  }

  static fromDataTransfer(dataTransfer: DataTransfer): ReadableClipboard {
    const data: ClipboardData = {};

    // Sometimes `dataTransfer.items` is undefined,
    // even though the TypeScript types doesn't think so.
    if (dataTransfer.items) {
      for (const item of dataTransfer.items) {
        if (item.kind === "string") {
          const text = dataTransfer.getData(item.type);
          if (text) {
            data[item.type] = text;
          }
        } else if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            data[item.type] = file;
          }
        }
      }
    }

    return new ReadableClipboard(data);
  }

  private constructor(private readonly data: ClipboardData) {}

  getText(): string | null {
    const text = this.data["text/plain"];
    if (typeof text === "string") {
      return text;
    } else {
      return null;
    }
  }

  getPlasmicData(): PlasmicClipboardData | null {
    const json = this.data[PLASMIC_CLIPBOARD_FORMAT];
    if (typeof json === "string") {
      return swallow(() => JSON.parse(json) as PlasmicClipboardData);
    } else {
      return null;
    }
  }

  async getImage(appCtx: AppCtx): Promise<ResizableImage | null> {
    for (const [type, data] of Object.entries(this.data)) {
      if (type.includes("image")) {
        const resizableImage = await readAndSanitizeFileAsImage(appCtx, data);
        if (resizableImage?.url) {
          return resizableImage;
        }
      }

      if (typeof data === "string" && data.includes("<svg")) {
        try {
          const svg = await readAndSanitizeSvgXmlAsImage(appCtx, data);
          if (svg) {
            return svg;
          }
        } catch (_) {
          // If an error happens in SVG parsing, just keep going and
          // treat the pasted content as plain text.
        }
      }
    }
    return null;
  }
}

/**
 * Serializes ClipboardItems to a format that can be transferred over Comlink.
 *
 * TODO: Refactor this to a ReadableClipboard.fromClipboardItems() static method
 *       and add a ReadableClipboard.serialize() method.
 */
export async function serializeClipboardItems(
  items: ClipboardItem[],
  lastAction: LocalClipboardAction
): Promise<SerializableClipboardData> {
  const map: SerializableClipboardData = {};
  for (const item of items) {
    for (const type of item.types) {
      // serializeClipboardItems may not completely represent the clipboard contents.
      // For example, if the clipboard is rich content with multiple images,
      // we don't currently handle storing each image separately.
      if (type in map) {
        continue;
      }

      const blob = await item.getType(type);
      if (!blob) {
        continue;
      }

      // Clipboard API does not allow getting arbitrary data (other
      // than text and image).
      if (type === PLASMIC_CLIPBOARD_FORMAT) {
        map[type] = JSON.stringify({ action: lastAction });
      } else if (type.indexOf("image") >= 0) {
        // Convert from blob to file.
        const b = blob as any;
        b.name = "";
        b.lastModifiedDate = new Date();
        const file = b as File;

        map[type] = await readUploadedFileAsDataUrl(file);
      } else {
        map[type] = await blob.text();
      }
    }
  }
  return map;
}

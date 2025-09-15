import { LocalClipboardData, StyleClip } from "@/wab/client/clipboard/local";
import type { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { spawn } from "@/wab/shared/common";
import type { Pt } from "@/wab/shared/geom";
import { CopyState } from "@/wab/shared/insertable-templates/types";
import { FRAME_CAP } from "@/wab/shared/Labels";
import { UserError } from "@/wab/shared/UserError";
import * as Sentry from "@sentry/browser";

/** Plasmic-specific clipboard format. */
export const PLASMIC_CLIPBOARD_FORMAT =
  "web application/vnd.plasmic.clipboard+json";

/** Data shape for "application/vnd.plasmic.clipboard+json" */
export type PlasmicClipboardData = LocalClipboardData | CopyState | StyleClip;

export interface PasteArgs {
  studioCtx: StudioCtx;
  cursorClientPt?: Pt;
  insertRelLoc?: InsertRelLoc;
}

/**
 * Result of a paste operation.
 *
 * Throwing an error will be treated as `{ handled: true, success: false }`.
 */
export type PasteResult =
  | {
      handled: false;
    }
  | {
      handled: true;
      success: boolean;
    };

export function ensureViewCtxOrThrowUserError(studioCtx: StudioCtx): ViewCtx {
  const viewCtx = studioCtx.focusedViewCtx();
  if (viewCtx) {
    return viewCtx;
  } else {
    throw new UserError(
      "Cannot paste item",
      `You must have an ${FRAME_CAP} in focus in order to paste.`
    );
  }
}

export async function readClipboardPlasmicData(): Promise<string | undefined> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.read === "function"
  ) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes(PLASMIC_CLIPBOARD_FORMAT)) {
          const blob = await item.getType(PLASMIC_CLIPBOARD_FORMAT);
          if (blob) {
            return await blob.text();
          }
        }
      }
    } catch (e) {
      console.warn("Failed to read from system clipboard", e);
      Sentry.captureException(e);
    }
  }
  return undefined;
}

export function writeClipboardPlasmicData(data: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    navigator.clipboard.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      const blob = new Blob([data], { type: PLASMIC_CLIPBOARD_FORMAT });
      const item = new ClipboardItem({ [PLASMIC_CLIPBOARD_FORMAT]: blob });
      spawn(navigator.clipboard.write([item]));
    } catch (e) {
      console.warn("Failed to write to system clipboard", e);
      Sentry.captureException(e);
    }
  }
}

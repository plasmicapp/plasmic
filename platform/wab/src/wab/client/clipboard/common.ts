import { LocalClipboardData } from "@/wab/client/clipboard/local";
import type { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import type { Pt } from "@/wab/geom";
import { CopyState } from "@/wab/shared/insertable-templates/types";
import { FRAME_CAP } from "@/wab/shared/Labels";
import { UserError } from "@/wab/shared/UserError";

/** Plasmic-specific clipboard format. */
export const PLASMIC_CLIPBOARD_FORMAT =
  "application/vnd.plasmic.clipboard+json";

/** Data shape for "application/vnd.plasmic.clipboard+json" */
export type PlasmicClipboardData = LocalClipboardData | CopyState;

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

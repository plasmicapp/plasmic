import {
  PasteArgs,
  PasteResult,
  ensureViewCtxOrThrowUserError,
} from "@/wab/client/clipboard/common";
import { unwrap } from "@/wab/commons/failable-utils";
import { cloneArenaFrame } from "@/wab/shared/Arenas";
import { VariantCombo } from "@/wab/shared/Variants";
import { ensure } from "@/wab/shared/common";
import * as Tpls from "@/wab/shared/core/tpls";
import { ArenaFrame, Component, TplNode } from "@/wab/shared/model/classes";

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

/**
 * Clipboard for copy/paste operations within the same client.
 */
export class LocalClipboard {
  _contents: undefined | Clippable = undefined;
  _timeStamp: number = Date.now();

  copy(x: Clippable) {
    this._timeStamp = Date.now();
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

  timeStamp() {
    return this._timeStamp;
  }
}

export type LocalClipboardAction = "cut" | "copy";
export type LocalClipboardData = { action: LocalClipboardAction };

/**
 * pasteLocal returns a boolean representing success or failure.
 *
 */
export async function pasteLocal(
  clip: Clippable,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  if (isFrameClip(clip)) {
    return {
      handled: true,
      success: unwrap(
        await studioCtx.change(({ success }) => {
          return success(studioCtx.siteOps().pasteFrameClip(clip));
        })
      ),
    };
  }

  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);

  return {
    handled: true,
    success: unwrap(
      await studioCtx.change(({ success }) => {
        if (isStyleClip(clip)) {
          return success(viewCtx.viewOps.pasteStyleClip(clip));
        } else if (isTplClip(clip)) {
          const pastedTpl = viewCtx.viewOps.pasteTplClip({
            clip,
            cursorClientPt,
            loc: insertRelLoc,
          });
          return success(!!pastedTpl);
        } else {
          const pastedTpls = viewCtx.viewOps.pasteTplClips({
            clips: clip,
            cursorClientPt,
            loc: insertRelLoc,
          });
          return success(pastedTpls.length > 0);
        }
      })
    ),
  };
}

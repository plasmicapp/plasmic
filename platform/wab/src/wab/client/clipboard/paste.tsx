import { PasteArgs } from "@/wab/client/clipboard/common";
import { pasteImage } from "@/wab/client/clipboard/image";
import { pasteLocal } from "@/wab/client/clipboard/local";
import { ReadableClipboard } from "@/wab/client/clipboard/ReadableClipboard";
import { pasteRemote } from "@/wab/client/clipboard/remote";
import { pasteText } from "@/wab/client/clipboard/text";
import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { reportError, showError } from "@/wab/client/ErrorNotifications";
import { pasteFromFigma } from "@/wab/client/figma";
import { pasteFromHtmlImporter } from "@/wab/client/HtmlImporter";
import { isCopyState } from "@/wab/client/insertable-templates";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { pasteFromWebImporter } from "@/wab/client/WebImporter";
import { Pt } from "@/wab/shared/geom";
import { CopyState } from "@/wab/shared/insertable-templates/types";
import { notification } from "antd";

export async function paste({
  clipboard,
  studioCtx,
  cursorClientPt,
  as,
}: {
  clipboard: ReadableClipboard;
  studioCtx: StudioCtx;
  cursorClientPt: Pt | undefined;
  as?: "sibling" | "child";
}): Promise<boolean> {
  // If "as" is not specified, we check if we should enforce pasting as sibling
  if (!as) {
    as = studioCtx.focusedViewCtx()?.enforcePastingAsSibling
      ? "sibling"
      : "child";
  }

  const success = await pasteRouter(clipboard, {
    studioCtx,
    cursorClientPt,
    insertRelLoc: as === "sibling" ? InsertRelLoc.after : undefined,
  });

  // After pasting (and selecting the new node),
  // we always enforce next pasting to be as sibling
  // so the user can paste multiple times.
  // We stop enforcing that when they intentionally change selection.
  if (success) {
    const vc = studioCtx.focusedViewCtx();
    if (vc) {
      vc.enforcePastingAsSibling = true;
    }
  }

  return success;
}

async function pasteRouter(
  clipboard: ReadableClipboard,
  args: PasteArgs
): Promise<boolean> {
  const { studioCtx } = args;

  try {
    const plasmicData = clipboard.getPlasmicData();
    if (plasmicData) {
      // We've 2 different behavior when performing a copy/paste:
      //
      // - Copy/paste inside the project (local)
      // This has a different handling because it allows to do more direct surgery in the tree
      // which will be pasted, as we can reference existing content more easily, but this actually
      // can be troublesome inside the own project if it involves different branches or versions
      //
      // - Copy/paste cross projects (remote)
      // This is a more limited copy/paste as in many cases some references will be removed, as
      // an example, global variants, data source exprs, page references, state references,
      // which we can't be sure to perform an attachment in between projects.

      if (
        isCopyState(plasmicData) &&
        shouldPerformCrossTabCopy(studioCtx, plasmicData)
      ) {
        const remoteResult = await pasteRemote(plasmicData, args);
        if (remoteResult.handled) {
          return remoteResult.success;
        }
      }

      if (studioCtx.clipboard.isSet()) {
        const localResult = await pasteLocal(studioCtx.clipboard.paste(), args);
        if (localResult.handled) {
          return localResult.success;
        }
      }
    }

    // Figma paste check needs to come before the image check, as it contains
    // SVG data and will return a false positive from `clipboard.getImage()`.
    const textContent = clipboard.getText();
    if (textContent) {
      const figmaResult = await pasteFromFigma(textContent, args);
      if (figmaResult.handled) {
        return figmaResult.success;
      }

      const htmlImporterResult = await pasteFromHtmlImporter(textContent, args);
      if (htmlImporterResult.handled) {
        return htmlImporterResult.success;
      }

      const wiImporterResult = await pasteFromWebImporter(textContent, args);
      if (wiImporterResult.handled) {
        return wiImporterResult.success;
      }
    }

    const image = await clipboard.getImage(studioCtx.appCtx);
    if (image) {
      const imageResult = await pasteImage(image, args);
      if (imageResult.handled) {
        return imageResult.success;
      }
    }

    if (textContent) {
      // TODO: work with rich text as well
      const textResult = await pasteText(textContent, args);
      if (textResult.handled) {
        return textResult.success;
      }
    }

    notification.warn({
      message: "Nothing to paste - the clipboard is empty",
    });
    return false;
  } catch (err) {
    reportError(err);
    showError(err, {
      title: "Paste failed",
    });
    return false;
  }
}

function shouldPerformCrossTabCopy(
  sc: StudioCtx,
  copyState: CopyState
): boolean {
  // If we are dealing with a different project, then we can only
  // perform a cross-tab copy
  if (copyState.projectId !== sc.siteInfo.id) {
    return true;
  }
  // We are in the same project, dealing with different branches
  // perform a cross-tab copy, since we are not sure about references
  if (copyState.branchId !== sc.dbCtx().branchInfo?.id) {
    return true;
  }
  // We are dealing with the same project and branch, but an older version
  // perform a cross-tab copy, since we are not sure about references
  if (copyState.bundleRef.type === "pkg") {
    return true;
  }
  // We are dealing with the same project and branch, but different tab
  // perform a cross-tab copy, if local clipboard is empty or the cross-tab clipboard is more recent.
  if (
    sc.clipboard.isEmpty() ||
    sc.clipboard.timeStamp() < copyState.timeStamp
  ) {
    return true;
  }
  // It may be the case that we are dealing with a different revisionNum here
  // but we will assume it's fine, considering the expected time for user to copy/paste
  return false;
}

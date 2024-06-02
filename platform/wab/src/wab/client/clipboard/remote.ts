import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import {
  buildCopyStateExtraInfo,
  postInsertableTemplate,
} from "@/wab/client/insertable-templates";
import { unwrap } from "@/wab/commons/failable-utils";
import { cloneCopyState } from "@/wab/shared/insertable-templates";
import { CopyState } from "@/wab/shared/insertable-templates/types";
import { getBaseVariant } from "@/wab/shared/Variants";

export async function pasteRemote(
  copyState: CopyState,
  { studioCtx }: PasteArgs
): Promise<PasteResult> {
  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);
  const extraInfo = await buildCopyStateExtraInfo(studioCtx, copyState);

  return {
    handled: true,
    success: unwrap(
      await studioCtx.change(({ success }) => {
        const currentComponent = viewCtx.currentComponent();
        const { nodesToPaste, seenFonts } = cloneCopyState(
          studioCtx.site,
          extraInfo,
          getBaseVariant(currentComponent),
          studioCtx.getPlumeSite(),
          currentComponent,
          viewCtx.viewOps.adaptTplNodeForPaste
        );

        // `cloneCopyState` only handles a single node for now
        if (nodesToPaste.length === 0) {
          return success(false);
        }

        const result = viewCtx.viewOps.pasteNode(nodesToPaste[0]);
        if (result) {
          postInsertableTemplate(studioCtx, seenFonts);
          return success(true);
        } else {
          return success(false);
        }
      })
    ),
  };
}

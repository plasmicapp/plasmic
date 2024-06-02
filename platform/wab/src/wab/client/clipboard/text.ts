import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import { unwrap } from "@/wab/commons/failable-utils";

export async function pasteText(
  text: string,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);
  return unwrap(
    await studioCtx.change(({ success }) => {
      const vtm = viewCtx.variantTplMgr();
      const node = vtm.mkTplInlinedText(text);
      const pasteSuccess = viewCtx.viewOps.pasteNode(
        node,
        cursorClientPt,
        undefined,
        insertRelLoc
      );
      return success({
        handled: true,
        success: pasteSuccess,
      });
    })
  );
}

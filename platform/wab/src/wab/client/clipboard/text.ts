import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import { unwrap } from "@/wab/commons/neverthrow-utils";
import { ok } from "neverthrow";

export async function pasteText(
  text: string,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);
  return unwrap(
    await studioCtx.change(() => {
      const vtm = viewCtx.variantTplMgr();
      const node = vtm.mkTplInlinedText(text);
      const pasteSuccess = viewCtx.viewOps.pasteNode(
        node,
        cursorClientPt,
        undefined,
        insertRelLoc
      );
      return ok({
        handled: true,
        success: pasteSuccess,
      });
    })
  );
}

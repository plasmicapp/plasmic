import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import { htmlToTpl } from "@/wab/client/operations/html-to-tpl";
import { unwrap } from "@/wab/commons/failable-utils";

export async function pasteFromWebImporter(
  text,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  if (!studioCtx.appCtx.appConfig.allowHtmlPaste) {
    return { handled: false };
  }

  const htmlString = text.trim();
  if (!htmlString.startsWith("<")) {
    return { handled: false };
  }

  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);
  const component = viewCtx.currentTplComponent().component;

  const result = await studioCtx.app.withSpinner(
    htmlToTpl(htmlString, {
      site: studioCtx.site,
      vtm: viewCtx.variantTplMgr(),
      appCtx: viewCtx.appCtx,
    })
  );

  if (!result) {
    return { handled: false };
  }

  return {
    handled: true,
    success: unwrap(
      await studioCtx.change(({ success }) => {
        result.finalize({
          component,
          tplMgr: viewCtx.tplMgr(),
        });

        return success(
          viewCtx.viewOps.pasteNode(
            result.tpl,
            cursorClientPt,
            undefined,
            insertRelLoc
          )
        );
      })
    ),
  };
}

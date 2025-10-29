import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import { maybeUploadImage, ResizableImage } from "@/wab/client/dom-utils";
import { unwrap } from "@/wab/commons/failable-utils";

export async function pasteImage(
  image: ResizableImage,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  const { imageResult, opts } = await studioCtx.app.withSpinner(
    maybeUploadImage(studioCtx.appCtx, image, undefined, undefined)
  );
  if (!imageResult || !opts) {
    return {
      handled: false,
    };
  }

  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);
  return {
    handled: true,
    success: unwrap(
      await studioCtx.change(({ success }) => {
        const asset = studioCtx.siteOps().createImageAsset(imageResult, opts);
        const node = viewCtx.variantTplMgr().mkTplImage({
          asset: asset.asset,
          iconColor: asset.iconColor,
        });
        return success(
          viewCtx.viewOps.pasteNode(
            node,
            cursorClientPt,
            undefined,
            insertRelLoc
          )
        );
      })
    ),
  };
}

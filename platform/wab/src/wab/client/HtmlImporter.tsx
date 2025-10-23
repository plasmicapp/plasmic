import { PasteArgs, PasteResult } from "@/wab/client/clipboard/common";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import { processWebImporterTree } from "@/wab/client/WebImporter";

export async function pasteFromHtmlImporter(
  text,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  if (!studioCtx.appCtx.appConfig.allowHtmlPaste) {
    return {
      handled: false,
    };
  }

  const htmlString = text.trim();
  if (!htmlString.startsWith("<")) {
    return {
      handled: false,
    };
  }

  const { wiTree, animationSequences } = await studioCtx.app.withSpinner(
    parseHtmlToWebImporterTree(htmlString, studioCtx.site)
  );

  if (!wiTree) {
    return {
      handled: false,
    };
  }

  return await processWebImporterTree(wiTree, animationSequences, {
    studioCtx,
    cursorClientPt,
    insertRelLoc,
  });
}

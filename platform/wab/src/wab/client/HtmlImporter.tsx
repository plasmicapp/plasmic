import { PasteArgs, PasteResult } from "@/wab/client/clipboard/common";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import { processWebImporterTree } from "@/wab/client/WebImporter";
import { DEVFLAGS } from "@/wab/shared/devflags";

export async function pasteFromHtmlImporter(
  text,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  if (!DEVFLAGS.allowHtmlPaste) {
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

  const { wiTree } = await studioCtx.app.withSpinner(
    parseHtmlToWebImporterTree(htmlString)
  );

  if (!wiTree) {
    return {
      handled: false,
    };
  }

  return await processWebImporterTree(wiTree, {
    studioCtx,
    cursorClientPt,
    insertRelLoc,
  });
}

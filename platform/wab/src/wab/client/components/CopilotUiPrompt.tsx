import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import CopilotCodePrompt from "@/wab/client/components/CopilotCodePrompt";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import { processWebImporterTree } from "@/wab/client/WebImporter";
import * as React from "react";

function CopilotUiPrompt() {
  const studioCtx = useStudioCtx();
  const insertRelLoc = studioCtx.focusedViewCtx()?.enforcePastingAsSibling
    ? InsertRelLoc.after
    : undefined;

  return (
    <CopilotCodePrompt
      type={"ui"}
      defaultDialogOpen={true}
      onDialogOpenChange={(isOpen) => {
        studioCtx.openUiCopilotDialog(isOpen);
      }}
      onUpdate={async (generatedHtml) => {
        const { wiTree } = await studioCtx.app.withSpinner(
          parseHtmlToWebImporterTree(generatedHtml)
        );
        if (wiTree) {
          await processWebImporterTree(wiTree, {
            studioCtx,
            insertRelLoc,
            cursorClientPt: undefined,
          });
        }
      }}
    />
  );
}

export { CopilotUiPrompt };

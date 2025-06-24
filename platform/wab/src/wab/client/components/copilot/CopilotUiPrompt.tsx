import { COMMANDS } from "@/wab/client/commands/command";
import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { CopilotPromptDialog } from "@/wab/client/components/copilot/CopilotPromptDialog";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import { processWebImporterTree } from "@/wab/client/WebImporter";
import { QueryCopilotUiResponse } from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import * as React from "react";

function CopilotUiPrompt() {
  const studioCtx = useStudioCtx();
  const insertRelLoc = studioCtx.focusedViewCtx()?.enforcePastingAsSibling
    ? InsertRelLoc.after
    : undefined;

  return (
    <CopilotPromptDialog
      type={"ui"}
      showImageUpload={true}
      dialogOpen={studioCtx.showUiCopilot}
      onDialogOpenChange={(isOpen) => {
        studioCtx.openUiCopilotDialog(isOpen);
      }}
      onUpdate={async (newValue) => {
        const copilotUiData = JSON.parse(
          newValue
        ) as unknown as QueryCopilotUiResponse["data"];
        if (!copilotUiData) {
          return;
        }

        for (const action of copilotUiData.actions) {
          switch (action.name) {
            case "insert-html": {
              const { wiTree } = await studioCtx.app.withSpinner(
                parseHtmlToWebImporterTree(action.data.html, studioCtx.site)
              );
              if (wiTree) {
                await processWebImporterTree(wiTree, {
                  studioCtx,
                  insertRelLoc,
                  cursorClientPt: undefined,
                });
              }
              break;
            }

            case "add-token": {
              spawn(
                COMMANDS.token.addToken.execute(studioCtx, action.data, {})
              );
              break;
            }
          }
        }
      }}
    />
  );
}

export { CopilotUiPrompt };

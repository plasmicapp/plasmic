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
    <CopilotPromptDialog<QueryCopilotUiResponse["data"]>
      className={"CopilotUiPromptDialog"}
      type={"ui"}
      showImageUpload={true}
      dialogOpen={studioCtx.showUiCopilot}
      onDialogOpenChange={(isOpen) => {
        studioCtx.openUiCopilotDialog(isOpen);
      }}
      onCopilotSubmit={async ({ prompt, images }) => {
        const result = await studioCtx.appCtx.api.queryUiCopilot({
          type: "ui",
          goal: prompt,
          projectId: studioCtx.siteInfo.id,
          images,
          tokens: studioCtx.site.styleTokens.map((t) => ({
            name: t.name,
            uuid: t.uuid,
            type: t.type,
            value: t.value,
          })),
        });

        const response = result.data;

        const messageParts: string[] = [];

        const actions = response.actions;
        const hasHtmlDesign =
          actions.filter((action) => action.name === "insert-html")?.length > 0;
        if (hasHtmlDesign) {
          messageParts.push("• A new HTML design snippet is ready to be used");
        }

        const newTokensCount =
          actions.filter((action) => action.name === "add-token")?.length ?? 0;
        if (newTokensCount > 0) {
          messageParts.push(
            `• ${newTokensCount} new token${
              newTokensCount > 1 ? "s" : ""
            } is ready to be used`
          );
        }

        return {
          response,
          displayMessage: messageParts.join("\n"),
          copilotInteractionId: result.copilotInteractionId,
        };
      }}
      onCopilotApply={async (newValue) => {
        const copilotUiData = newValue;
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

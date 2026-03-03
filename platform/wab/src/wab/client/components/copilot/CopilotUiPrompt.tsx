import { COMMANDS } from "@/wab/client/commands/command";
import { CopilotPromptDialog } from "@/wab/client/components/copilot/CopilotPromptDialog";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { addOrUpsertTokens } from "@/wab/commons/StyleToken";
import {
  QueryCopilotUiRequest,
  QueryCopilotUiResponse,
  UpsertTokenReq,
} from "@/wab/shared/ApiSchema";
import { assert, spawn } from "@/wab/shared/common";
import { fixJson } from "@/wab/shared/copilot/fix-json";
import * as React from "react";

function CopilotUiPrompt() {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedOrFirstViewCtx();

  return (
    <CopilotPromptDialog<QueryCopilotUiResponse["response"]>
      className={"CopilotUiPromptDialog"}
      type={"ui"}
      showImageUpload={true}
      dialogOpen={studioCtx.showUiCopilot}
      onDialogOpenChange={(isOpen) => {
        studioCtx.openUiCopilotDialog(isOpen);
      }}
      onCopilotSubmit={async ({
        prompt,
        images,
        modelProviderOverride,
        copilotSystemPromptOverride,
      }) => {
        const copilotQuery = studioCtx.appCtx.selfInfo
          ? studioCtx.appCtx.api.queryUiCopilot
          : studioCtx.appCtx.api.queryPublicUiCopilot;
        const payload: QueryCopilotUiRequest = {
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
        };
        if (modelProviderOverride) {
          payload.modelProviderOverride = JSON.parse(
            fixJson(modelProviderOverride)
          );
        }
        if (copilotSystemPromptOverride) {
          payload.copilotSystemPromptOverride = copilotSystemPromptOverride;
        }
        const result = await copilotQuery(payload);

        const response = result.response;
        const { tokens, html } = response;

        const messageParts: string[] = [];

        if (html.trim()) {
          messageParts.push("• A new HTML design snippet is ready to be used");
        }

        const newTokensCount = tokens.length;
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
      onCopilotApply={async (response) => {
        const { tokens, html } = response;
        assert(viewCtx, "ViewCtx must be defined");

        spawn(
          studioCtx.change(({ success }) => {
            spawn(
              (async function () {
                const upsertTokens: UpsertTokenReq[] = tokens.map((t) => ({
                  name: t.name,
                  value: t.value,
                  type: t.tokenType,
                }));
                addOrUpsertTokens(studioCtx.site, upsertTokens);

                spawn(
                  COMMANDS.copilot.insertHtml.execute(
                    studioCtx,
                    {
                      html,
                    },
                    { viewCtx }
                  )
                );
              })()
            );

            return success();
          })
        );
      }}
    />
  );
}

export { CopilotUiPrompt };

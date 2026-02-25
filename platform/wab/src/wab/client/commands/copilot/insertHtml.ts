import { processWebImporterTree } from "@/wab/client/WebImporter";
import { Command, stringPrompt } from "@/wab/client/commands/types";
import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import { COPILOT_COMMANDS } from "@/wab/shared/copilot/internal/commands";
import { failableAsync } from "ts-failable/src/failable";
import { z } from "zod";

type InsertHtmlInput = z.infer<typeof COPILOT_COMMANDS.insertHtml.inputSchema>;

export const insertHtmlCommand: Command<
  InsertHtmlInput,
  { viewCtx: ViewCtx },
  boolean
> = {
  meta: () => ({
    id: COPILOT_COMMANDS.insertHtml.toolName,
    name: COPILOT_COMMANDS.insertHtml.toolName,
    title: COPILOT_COMMANDS.insertHtml.title,
    description: COPILOT_COMMANDS.insertHtml.description,
    args: {
      html: stringPrompt({}),
    },
  }),
  context: (studioCtx) => {
    const viewCtx = studioCtx.focusedOrFirstViewCtx();
    if (!viewCtx) {
      return [];
    }
    return [{ viewCtx }];
  },
  execute: async (studioCtx, { html }, { viewCtx }) => {
    return await failableAsync<boolean, never>(async ({ success }) => {
      const insertRelLoc = viewCtx.enforcePastingAsSibling
        ? InsertRelLoc.after
        : undefined;

      const { wiTree, animationSequences } = await studioCtx.app.withSpinner(
        parseHtmlToWebImporterTree(html, studioCtx.site)
      );

      if (wiTree) {
        // processWebImporterTree calls studioCtx.change() internally
        const result = await processWebImporterTree(
          wiTree,
          animationSequences,
          {
            studioCtx,
            insertRelLoc,
            cursorClientPt: undefined,
          }
        );

        return success(result.handled);
      }

      return success(false);
    });
  },
};

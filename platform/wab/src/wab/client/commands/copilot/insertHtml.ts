import { processWebImporterTree } from "@/wab/client/WebImporter";
import {
  Command,
  choicePrompt,
  stringPrompt,
} from "@/wab/client/commands/types";
import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import { COPILOT_COMMANDS } from "@/wab/shared/copilot/internal/commands";
import { SlotSelection } from "@/wab/shared/core/slots";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { TplNode } from "@/wab/shared/model/classes";
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
      targetTplUuid: stringPrompt({ required: false }),
      insertRelLoc: choicePrompt<InsertRelLoc>({
        required: false,
        options: Object.values(InsertRelLoc).map((v) => ({
          id: v,
          label: v,
          value: v,
        })),
      }),
    },
  }),
  context: (studioCtx) => {
    const viewCtx = studioCtx.focusedOrFirstViewCtx();
    if (!viewCtx) {
      return [];
    }
    return [{ viewCtx }];
  },
  execute: async (
    studioCtx,
    { html, targetTplUuid, insertRelLoc },
    { viewCtx }
  ) => {
    return await failableAsync<boolean, never>(async ({ success }) => {
      let target: TplNode | SlotSelection | undefined;

      if (targetTplUuid) {
        const component = viewCtx.currentTplComponent().component;
        target = flattenTpls(component.tplTree).find(
          (tpl) => tpl.uuid === targetTplUuid
        );
        if (!target) {
          throw new Error(
            `Cannot find element for targetTplUuid:${targetTplUuid}`
          );
        }
      }

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
            insertRelLoc: insertRelLoc as InsertRelLoc,
            cursorClientPt: undefined,
            target,
          }
        );

        return success(result.handled);
      }

      return success(false);
    });
  },
};

import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { htmlToTpl } from "@/wab/client/operations/html-to-tpl";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/internal/copilot-tools";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { TplNode } from "@/wab/shared/model/classes";

export const insertHtmlTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.insertHtml,
  async (studioCtx, { html, targetTplUuid, insertRelLoc }) => {
    const viewCtx = studioCtx.focusedOrFirstViewCtx();
    if (!viewCtx) {
      return {
        success: false,
        error: {
          message: "No active component view",
          type: "EXECUTION_FAILED",
        },
      };
    }

    const component = viewCtx.currentTplComponent().component;

    let target: TplNode | undefined;
    if (targetTplUuid) {
      target = flattenTpls(component.tplTree).find(
        (tpl) => tpl.uuid === targetTplUuid
      );
      if (!target) {
        return {
          success: false,
          error: {
            message: `Cannot find element for targetTplUuid:${targetTplUuid}`,
            type: "EXECUTION_FAILED",
          },
        };
      }
    }

    const result = await htmlToTpl(html, {
      site: studioCtx.site,
      vtm: viewCtx.variantTplMgr(),
      appCtx: viewCtx.appCtx,
    });

    if (!result) {
      return {
        success: false,
        error: {
          message: "Failed to parse HTML snippet",
          type: "EXECUTION_FAILED",
        },
      };
    }

    const pasted = unwrap(
      await studioCtx.change<never, boolean>(({ success }) => {
        result.finalize({
          component,
          tplMgr: viewCtx.tplMgr(),
        });

        return success(
          viewCtx.viewOps.pasteNode(
            result.tpl,
            undefined,
            target,
            insertRelLoc as InsertRelLoc
          )
        );
      })
    );

    return {
      success: true,
      output: pasted
        ? "Inserted HTML successfully."
        : "HTML was parsed but no elements were inserted.",
    };
  }
);

import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { htmlToTpl } from "@/wab/client/operations/html-to-tpl";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/internal/copilot-tools";
import {
  getComponentByUuid,
  getTplByUuid,
  getVariantsByUuids,
} from "@/wab/shared/copilot/utils";

export const insertHtmlTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.insertHtml,
  async (
    studioCtx,
    { html, componentUuid, tplUuid, insertRelLoc, variantUuids }
  ) => {
    const component = getComponentByUuid(studioCtx.site, componentUuid);
    const target = getTplByUuid(component, tplUuid);
    const variants = variantUuids?.length
      ? getVariantsByUuids(variantUuids, {
          component,
          tpl: target,
          site: studioCtx.site,
        })
      : undefined;

    const viewCtx = await studioCtx.getViewCtxForComponent(component, variants);

    const result = await htmlToTpl(html, {
      site: studioCtx.site,
      vtm: viewCtx.variantTplMgr(),
      appCtx: viewCtx.appCtx,
    });

    if (!result) {
      throw new Error("Failed to parse HTML snippet");
    }

    const pasted = unwrap(
      await studioCtx.change<never, boolean>(({ success }) => {
        result.finalize({
          component,
          tplMgr: viewCtx.tplMgr(),
        });

        return success(
          viewCtx.viewOps.pasteNodes({
            nodes: result.tpls,
            cursorClientPt: undefined,
            target,
            loc: insertRelLoc as InsertRelLoc,
          })
        );
      })
    );

    return pasted
      ? "Inserted HTML successfully."
      : "HTML was parsed but no elements were inserted.";
  }
);

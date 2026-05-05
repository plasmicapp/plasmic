import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { htmlToTpl } from "@/wab/client/operations/html-to-tpl";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
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

    const htmlToTplResult = await htmlToTpl(html, {
      site: studioCtx.site,
      vtm: viewCtx.variantTplMgr(),
      appCtx: viewCtx.appCtx,
    });

    if (!htmlToTplResult) {
      throw new Error("Failed to parse HTML snippet");
    }

    const pasted = unwrap(
      await studioCtx.change<never, boolean>(({ success }) => {
        htmlToTplResult.finalize({
          component,
          tplMgr: viewCtx.tplMgr(),
        });

        return success(
          viewCtx.viewOps.pasteNodes({
            nodes: htmlToTplResult.tpls,
            cursorClientPt: undefined,
            target,
            loc: insertRelLoc as InsertRelLoc,
          })
        );
      })
    );

    if (insertRelLoc === "replace") {
      return pasted
        ? `Replaced element "${tplUuid}" with ${htmlToTplResult.tpls.length} new element(s).`
        : `Failed to replace element "${tplUuid}".`;
    }
    return pasted
      ? "Inserted HTML successfully."
      : "HTML was parsed but no elements were inserted.";
  }
);

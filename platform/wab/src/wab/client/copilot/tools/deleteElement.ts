import { DeleteTplResult, deleteTpl } from "@/wab/client/operations/delete-tpl";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import {
  getComponentArenaAndVariantTplMgr,
  getComponentByUuid,
  getTplByUuid,
} from "@/wab/shared/copilot/utils";

export const deleteElementTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.deleteElement,
  async (studioCtx, { componentUuid, tplUuid }) => {
    const component = getComponentByUuid(studioCtx.site, componentUuid);
    const tpl = getTplByUuid(component, tplUuid);

    const { vtm, arena } = getComponentArenaAndVariantTplMgr(
      studioCtx.site,
      component,
      studioCtx.tplMgr()
    );

    // Switch to the target component's arena
    studioCtx.switchToArena(arena);

    const result = unwrap(
      await studioCtx.change<never, DeleteTplResult>(({ success }) => {
        return success(
          deleteTpl([tpl], {
            component,
            site: studioCtx.site,
            vtm,
          })
        );
      })
    );

    if (result.result === "error") {
      return `Failed to delete element "${tplUuid}": ${result.message}`;
    }

    return `Element "${tplUuid}" deleted successfully.`;
  }
);

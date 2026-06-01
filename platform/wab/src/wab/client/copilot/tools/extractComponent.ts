import {
  ExtractComponentResult,
  extractComponent,
} from "@/wab/client/operations/extract-component";
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
import { isKnownTplComponent, isKnownTplTag } from "@/wab/shared/model/classes";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";
import { serializeInvalidResource } from "@/wab/shared/web-exporter/project-exporter";

export const extractComponentTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.extractComponent,
  async (studioCtx, { componentUuid, tplUuid, name }) => {
    const component = getComponentByUuid(studioCtx.site, componentUuid);
    const tpl = getTplByUuid(component, tplUuid);
    if (!(isKnownTplTag(tpl) || isKnownTplComponent(tpl))) {
      return serializeInvalidResource(
        tplUuid,
        "tpl",
        "Tpl must be TplTag or TplComponent"
      );
    }

    const { arena } = getComponentArenaAndVariantTplMgr(
      studioCtx.site,
      component,
      studioCtx.tplMgr()
    );
    studioCtx.switchToArena(arena);

    const result = unwrap(
      await studioCtx.change<never, ExtractComponentResult>(({ success }) =>
        success(
          extractComponent({
            site: studioCtx.site,
            containingComponent: component,
            tpl,
            name,
            resurfaceParams: true,
            tplMgr: studioCtx.tplMgr(),
            // getCanvasEnvForTpl reads a tpl's live $ctx/$state from its
            // rendered val to populate fallbacks for $ctx-bound exprs that lose
            // their data context once extracted. Here extract runs on
            // the model and isn't anchored to a rendered val or ViewCtx, so we pass
            // undefined: those exprs get no fallback value, so they evaluate
            // to undefined when the new component has no $ctx.
            getCanvasEnvForTpl: () => undefined,
          })
        )
      )
    );

    if (result.result === "error") {
      return `Failed to extract component: ${result.message}`;
    }

    return [
      serializeComponent(result.tplComponent.component),
      ...result.warnings.map((w) => `Warning: ${w}`),
    ].join("\n\n");
  }
);

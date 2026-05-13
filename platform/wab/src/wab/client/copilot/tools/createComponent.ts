import { createComponentVariantGroups } from "@/wab/client/copilot/tools/createComponentVariantGroups";
import { serializeCopilotError } from "@/wab/client/frame-ctx/host-frame-api";
import { createComponent } from "@/wab/client/operations/create-component";
import { htmlToTpl } from "@/wab/client/operations/html-to-tpl";
import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { getComponentArenaAndVariantTplMgr } from "@/wab/shared/copilot/utils";
import { trackComponentRoot } from "@/wab/shared/core/tpls";
import { Component } from "@/wab/shared/model/classes";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";

export const createComponentTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.createComponent,
  async (studioCtx, { name, type, html, pageMeta, variantGroups }) => {
    const tplMgr = studioCtx.tplMgr();

    // Wrap all the change() calls in startUnlogged so the create-component,
    // variant-group, and htmlToTpl mutations collapse into a single undo
    // record.
    studioCtx.startUnlogged();
    try {
      const createComponentResult = unwrap(
        await studioCtx.change<
          never,
          | { result: "success"; component: Component; invalid: string[] }
          | { result: "error"; message: string }
        >(({ success }) => {
          const componentResult = createComponent({
            tplMgr,
            name,
            type,
            pageMeta,
          });
          if (componentResult.result === "error") {
            return success({
              result: "error",
              message: componentResult.message,
            });
          }
          const component = componentResult.component;
          const invalid = createComponentVariantGroups(
            component,
            tplMgr,
            variantGroups ?? []
          );
          return success({ result: "success", component, invalid });
        })
      );

      if (createComponentResult.result === "error") {
        return `Failed to create component: ${createComponentResult.message}`;
      }
      const { component, invalid } = createComponentResult;

      const { vtm } = getComponentArenaAndVariantTplMgr(
        studioCtx.site,
        component,
        tplMgr
      );

      // Parse the HTML against the newly created component's vtm.
      // If htmlToTpl throws an error, it causes the Copilot to retry the tool call
      // which creates duplicate components because of the createComponent call above.
      // With try/catch, we return a meaningful response back to the Copilot so it
      // can call insertHtml as a followup instead of calling createComponent again
      // since component is already created successfully at this point.
      try {
        const htmlResult = await htmlToTpl(html, {
          site: studioCtx.site,
          vtm,
          appCtx: studioCtx.appCtx,
        });

        if (!htmlResult) {
          return [
            `Failed to parse the HTML snippet, but component created successfully with empty design.`,
            serializeComponent(component),
            ...invalid,
          ].join("\n\n");
        }
        if (htmlResult.tpls.length !== 1) {
          return [
            `HTML must have exactly one root element (got ${htmlResult.tpls.length}), but component created successfully with empty design.`,
            serializeComponent(component),
            ...invalid,
          ].join("\n\n");
        }

        unwrap(
          await studioCtx.change<never, void>(({ success }) => {
            component.tplTree = htmlResult.tpls[0];
            trackComponentRoot(component);
            htmlResult.finalize({ component, tplMgr });
            return success();
          })
        );

        return [serializeComponent(component), ...invalid].join("\n\n");
      } catch (err: unknown) {
        return [
          `Failed to insert HTML: ${serializeCopilotError(
            err
          )}. Component created successfully with empty design.`,
          serializeComponent(component),
          ...invalid,
        ].join("\n\n");
      }
    } finally {
      studioCtx.stopUnlogged();
    }
  }
);

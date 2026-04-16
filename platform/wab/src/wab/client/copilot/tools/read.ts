import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { allAnimationSequences } from "@/wab/shared/core/sites";
import { flattenTpls } from "@/wab/shared/core/tpls";
import {
  serializeComponent,
  serializeTpl,
} from "@/wab/shared/web-exporter/component-exporter";
import {
  serializeAnimationSequence,
  serializeInvalidResource,
  serializeProject,
  serializeToken,
} from "@/wab/shared/web-exporter/project-exporter";

export const readTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.read,
  async (studioCtx, { project, components, elements, tokens, animations }) => {
    const site = studioCtx.site;
    const output: string[] = [];
    const invalidData: string[] = [];

    // Project-level info
    if (project) {
      output.push(serializeProject(site, project));
    }

    // Specific tokens by UUID
    if (tokens?.length) {
      for (const uuid of tokens) {
        const token = site.styleTokens.find((t) => t.uuid === uuid);
        if (!token) {
          invalidData.push(
            serializeInvalidResource(
              uuid,
              "token",
              `Token with UUID "${uuid}" not found.`
            )
          );
          continue;
        }
        output.push(serializeToken(token, { site }));
      }
    }

    // Specific animation sequences by UUID
    if (animations?.length) {
      const allAnims = allAnimationSequences(site, { includeDeps: "direct" });
      for (const uuid of animations) {
        const anim = allAnims.find((a) => a.uuid === uuid);
        if (!anim) {
          invalidData.push(
            serializeInvalidResource(
              uuid,
              "animation",
              `Animation sequence with UUID "${uuid}" not found.`
            )
          );
          continue;
        }
        output.push(serializeAnimationSequence(anim));
      }
    }

    // Specific components by UUID
    if (components?.length) {
      for (const uuid of components) {
        const comp = site.components.find((c) => c.uuid === uuid);
        if (!comp) {
          invalidData.push(
            serializeInvalidResource(
              uuid,
              "component",
              `Component with UUID "${uuid}" not found.`
            )
          );
          continue;
        }
        output.push(serializeComponent(comp));
      }
    }

    // Specific elements by UUID
    if (elements?.length) {
      for (const { componentUuid, elementUuid } of elements) {
        const comp = site.components.find((c) => c.uuid === componentUuid);
        if (!comp) {
          invalidData.push(
            serializeInvalidResource(
              componentUuid,
              "component",
              `Component with UUID "${componentUuid}" not found.`
            )
          );
          continue;
        }
        const tpl = flattenTpls(comp.tplTree).find(
          (t) => t.uuid === elementUuid
        );
        if (!tpl) {
          invalidData.push(
            serializeInvalidResource(
              elementUuid,
              "tpl",
              `Element with UUID "${elementUuid}" not found in component "${comp.name}".`
            )
          );
          continue;
        }
        output.push(serializeTpl(tpl));
      }
    }

    return [...output, ...invalidData].join("\n");
  }
);

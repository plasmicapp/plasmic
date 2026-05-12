import { unwrap } from "@/wab/commons/failable-utils";
import { parseDynamicStringInput } from "@/wab/shared/copilot/dynamic-value-input";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { getComponentByUuid } from "@/wab/shared/copilot/utils";
import { isPageComponent } from "@/wab/shared/core/components";
import { mkTemplatedStringOfOneDynExpr } from "@/wab/shared/core/exprs";
import {
  TemplatedString,
  isKnownCustomCode,
  isKnownObjectPath,
} from "@/wab/shared/model/classes";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";

type PageMetaString = string | TemplatedString;

function normalizePagePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function toPageMetaValue(value: string | null): PageMetaString | null {
  if (value === null) {
    return null;
  }
  const parsed = parseDynamicStringInput(value);
  // PageMeta fields are `String | TemplatedString`, so wrap ObjectPath/CustomCode
  if (isKnownObjectPath(parsed) || isKnownCustomCode(parsed)) {
    return mkTemplatedStringOfOneDynExpr(parsed);
  }
  return parsed;
}

export const setPageMetaTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.setPageMeta,
  async (studioCtx, input) => {
    const component = getComponentByUuid(studioCtx.site, input.componentUuid);
    if (!isPageComponent(component)) {
      throw new Error(`Component "${input.componentUuid}" is not a page.`);
    }

    const hasUpdates = Object.entries(input).some(
      ([key, value]) => key !== "componentUuid" && value !== undefined
    );
    if (!hasUpdates) {
      throw new Error("At least one page metadata field is required.");
    }
    const name = input.name?.trim();
    if (input.name !== undefined && !name) {
      throw new Error("Page name cannot be empty.");
    }

    // Parse dyn-string inputs up-front so any parse error surfaces as a tool
    // error before we enter `studioCtx.change` (which would otherwise swallow
    // the throw inside its failable wrapper).
    const titleValue =
      input.title !== undefined ? toPageMetaValue(input.title) : undefined;
    const descriptionValue =
      input.description !== undefined
        ? toPageMetaValue(input.description) ?? ""
        : undefined;
    const canonicalValue =
      input.canonical !== undefined
        ? toPageMetaValue(input.canonical)
        : undefined;
    const openGraphImageValue =
      input.openGraphImage !== undefined
        ? toPageMetaValue(input.openGraphImage)
        : undefined;

    unwrap(
      await studioCtx.change(({ success }) => {
        if (name !== undefined) {
          studioCtx.tplMgr().renameComponent(component, name);
        }
        if (input.path !== undefined) {
          studioCtx
            .tplMgr()
            .changePagePath(component, normalizePagePath(input.path.trim()));
        }
        if (titleValue !== undefined) {
          component.pageMeta.title = titleValue;
        }
        if (descriptionValue !== undefined) {
          component.pageMeta.description = descriptionValue;
        }
        if (canonicalValue !== undefined) {
          component.pageMeta.canonical = canonicalValue;
        }
        if (openGraphImageValue !== undefined) {
          component.pageMeta.openGraphImage = openGraphImageValue;
        }
        return success();
      })
    );

    return serializeComponent(component);
  }
);

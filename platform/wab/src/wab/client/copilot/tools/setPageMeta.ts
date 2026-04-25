import { unwrap } from "@/wab/commons/failable-utils";
import {
  COPILOT_TOOL_DEFS,
  CopilotPageMetaValue,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { getComponentByUuid } from "@/wab/shared/copilot/utils";
import { isPageComponent } from "@/wab/shared/core/components";
import {
  codeLit,
  customCode,
  mkTemplatedStringOfOneDynExpr,
} from "@/wab/shared/core/exprs";
import { ObjectPath, TemplatedString } from "@/wab/shared/model/classes";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";

type PageMetaString = string | TemplatedString;

function normalizePagePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function fallbackExpr(fallback: string | null | undefined) {
  return fallback === undefined
    ? undefined
    : fallback === null
    ? null
    : codeLit(fallback);
}

function dynamicPageMetaPart(
  value: Exclude<CopilotPageMetaValue, string | null | { type: "template" }>
) {
  if (value.type === "code") {
    return customCode(value.code, fallbackExpr(value.fallback));
  } else {
    return new ObjectPath({
      path: value.path,
      fallback: fallbackExpr(value.fallback),
    });
  }
}

function pageMetaValueToModelValue(
  value: CopilotPageMetaValue
): PageMetaString | null {
  if (value === null || typeof value === "string") {
    return value;
  } else if (value.type === "template") {
    return new TemplatedString({
      text: value.parts.map((part) =>
        typeof part === "string" ? part : dynamicPageMetaPart(part)
      ),
    });
  } else {
    return mkTemplatedStringOfOneDynExpr(dynamicPageMetaPart(value));
  }
}

export const setPageMetaTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.setPageMeta,
  async (studioCtx, input) => {
    const component = getComponentByUuid(studioCtx.site, input.componentUuid);
    if (!isPageComponent(component)) {
      throw new Error(`Component "${input.componentUuid}" is not a page.`);
    }

    if (
      input.name === undefined &&
      input.path === undefined &&
      input.title === undefined &&
      input.description === undefined &&
      input.canonical === undefined &&
      input.openGraphImage === undefined
    ) {
      throw new Error("At least one page metadata field is required.");
    }
    const name = input.name?.trim();
    if (input.name !== undefined && !name) {
      throw new Error("Page name cannot be empty.");
    }

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
        if (input.title !== undefined) {
          component.pageMeta.title = pageMetaValueToModelValue(input.title);
        }
        if (input.description !== undefined) {
          component.pageMeta.description =
            pageMetaValueToModelValue(input.description) ?? "";
        }
        if (input.canonical !== undefined) {
          component.pageMeta.canonical = pageMetaValueToModelValue(
            input.canonical
          );
        }
        if (input.openGraphImage !== undefined) {
          component.pageMeta.openGraphImage = pageMetaValueToModelValue(
            input.openGraphImage
          );
        }
        return success();
      })
    );

    return serializeComponent(component);
  }
);

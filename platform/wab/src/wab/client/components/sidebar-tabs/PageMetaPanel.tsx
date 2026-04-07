import {
  StringPropEditor,
  isTemplatedStringEditorValue,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { PropEditorRow } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { spawn, switchType } from "@/wab/shared/common";
import { PageComponent } from "@/wab/shared/core/components";
import {
  codeLit,
  flattenTemplatedStringToString,
  hasDynamicParts,
  mkTemplatedStringOfOneDynExpr,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import {
  CustomCode,
  Expr,
  ObjectPath,
  TemplatedString,
  TplTag,
  isKnownExpr,
} from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

const PageMetaPanel = observer(function PageMetaPanel(props: {
  viewCtx: ViewCtx;
  page: PageComponent;
  env: Record<string, any> | undefined;
}) {
  const { page, viewCtx, env } = props;
  const sc = useStudioCtx();
  const disableDynamicValue = !sc.appCtx.appConfig.serverQueries
    ? true
    : undefined;

  const titleExpr = React.useMemo(
    () => convertPageMetaStringToExpr(page.pageMeta?.title),
    [page.pageMeta?.title]
  );

  return (
    <SidebarSection style={{ paddingTop: 12 }} id="sidebar-page-meta">
      <LabeledItemRow label="URL path" data-test-id="page-path">
        <StringPropEditor
          disabled={false}
          leftAligned={true}
          onChange={(v) => sc.tryChangePath(page, v)}
          value={page.pageMeta?.path || ""}
        />
      </LabeledItemRow>
      <PropEditorRow
        attr="title"
        label="Title"
        propType={{ type: "string", defaultValueHint: "Title" }}
        expr={titleExpr}
        onChange={(expr: Expr | undefined) => {
          const newTitle = convertExprToPageMetaString(expr);
          spawn(sc.tryChangePageMeta(page, "title", newTitle));
        }}
        viewCtx={viewCtx}
        tpl={page.tplTree as TplTag}
        disableLinkToProp={true}
        disableDynamicValue={disableDynamicValue}
        env={env}
      />
    </SidebarSection>
  );
});

export default PageMetaPanel;

/**
 * Page meta values used to be static string, but are now
 * string | TemplatedString. We keep the static string form
 * to avoid the complex codegen for dynamic page meta.
 */
export type PageMetaString = string | TemplatedString;

/**
 * PageMetaString is edited via PropEditorRow/TemplatedStringPropEditor.
 * This converts the onChange value back to PageMetaString.
 */
export function convertExprToPageMetaString(
  value: Expr | null | undefined
): PageMetaString | null {
  if (value == null) {
    return null;
  } else if (isTemplatedStringEditorValue(value)) {
    return switchType(value)
      .when(TemplatedString, (ts) => {
        return hasDynamicParts(ts) ? ts : flattenTemplatedStringToString(ts);
      })
      .when(CustomCode, (codeExpr) => {
        const maybeStr = tryExtractJson(codeExpr);
        if (typeof maybeStr === "string") {
          return maybeStr;
        }
        return mkTemplatedStringOfOneDynExpr(codeExpr);
      })
      .when(ObjectPath, (objectPath) => {
        return mkTemplatedStringOfOneDynExpr(objectPath);
      })
      .result();
  } else {
    return null;
  }
}

/**
 * PageMetaString is edited via PropEditorRow/TemplatedStringPropEditor.
 * This converts PageMetaString to an accepted value type.
 */
export function convertPageMetaStringToExpr(
  value: PageMetaString | null | undefined
): Expr | undefined {
  if (value == null) {
    return undefined;
  }
  if (isKnownExpr(value)) {
    return value;
  }
  return codeLit(value);
}

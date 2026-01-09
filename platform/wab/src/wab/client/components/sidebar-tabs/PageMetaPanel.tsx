import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { PropEditorRow } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { spawn } from "@/wab/shared/common";
import { PageComponent } from "@/wab/shared/core/components";
import {
  convertExprToStringOrTemplatedString,
  convertTemplatedStringToExpr,
} from "@/wab/shared/core/exprs";
import { Expr, TplTag } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

const PageMetaPanel = observer(function PageMetaPanel(props: {
  viewCtx: ViewCtx;
  page: PageComponent;
  env: Record<string, any>;
}) {
  const { page, viewCtx, env } = props;
  const sc = useStudioCtx();
  const disableDynamicValue = !sc.appCtx.appConfig.serverQueries
    ? true
    : undefined;

  const titleExpr = React.useMemo(
    () => convertTemplatedStringToExpr(page.pageMeta?.title),
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
          const newTitle = convertExprToStringOrTemplatedString(expr);
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

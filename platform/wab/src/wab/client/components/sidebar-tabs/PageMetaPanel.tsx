import { observer } from "mobx-react-lite";
import React from "react";
import { PageComponent } from "../../../components";
import { useStudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { LabeledItemRow } from "../sidebar/sidebar-helpers";
import { SidebarSection } from "../sidebar/SidebarSection";
import { StringPropEditor } from "./ComponentProps/StringPropEditor";

const PageMetaPanel = observer(function PageMetaPanel(props: {
  viewCtx: ViewCtx;
  page: PageComponent;
}) {
  const { page } = props;
  const sc = useStudioCtx();

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
      <LabeledItemRow label="Title">
        <StringPropEditor
          disabled={false}
          leftAligned={true}
          onChange={async (v) => sc.tryChangePageMeta(page, "title", v)}
          value={page.pageMeta?.title || ""}
        />
      </LabeledItemRow>
    </SidebarSection>
  );
});

export default PageMetaPanel;

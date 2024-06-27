import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { PageParamsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/shared/common";
import { extractParamsFromPagePath } from "@/wab/shared/core/components";
import { Component } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

const PageParamsPanel = observer(function PageParamsPanel(props: {
  page: Component;
}) {
  const { page } = props;
  const sc = useStudioCtx();

  const pageMeta = ensure(
    page.pageMeta,
    "Page components are expected to have pageMeta"
  );
  const params = extractParamsFromPagePath(pageMeta.path);

  if (params.length === 0) {
    return null;
  }

  const changePageParam = async (param: string, value: string) => {
    await sc.change(({ success }) => {
      pageMeta.params[param] = value;
      return success();
    });
  };

  return (
    <SidebarSection
      title={
        <LabelWithDetailedTooltip tooltip={<PageParamsTooltip />}>
          Preview parameters
        </LabelWithDetailedTooltip>
      }
      isHeaderActive={true}
    >
      {params.map((param) => (
        <LabeledItemRow label={param} data-test-id={`page-param-${param}`}>
          <StringPropEditor
            disabled={false}
            leftAligned={true}
            onChange={(v) => changePageParam(param, v)}
            value={pageMeta.params[param]}
          />
        </LabeledItemRow>
      ))}
    </SidebarSection>
  );
});

export default PageParamsPanel;

import { observer } from "mobx-react-lite";
import React from "react";
import { Component } from "../../../classes";
import { ensure } from "../../../common";
import { extractParamsFromPagePath } from "../../../components";
import { useStudioCtx } from "../../studio-ctx/StudioCtx";
import { LabeledItemRow } from "../sidebar/sidebar-helpers";
import { SidebarSection } from "../sidebar/SidebarSection";
import { PageParamsTooltip } from "../widgets/DetailedTooltips";
import { LabelWithDetailedTooltip } from "../widgets/LabelWithDetailedTooltip";
import { StringPropEditor } from "./ComponentProps/StringPropEditor";

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

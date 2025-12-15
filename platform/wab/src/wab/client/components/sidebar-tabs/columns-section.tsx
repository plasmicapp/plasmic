import { reportError } from "@/wab/client/ErrorNotifications";
import S from "@/wab/client/components/sidebar-tabs/ColumnsSection.module.scss";
import { FlexContainerControls } from "@/wab/client/components/sidebar-tabs/FlexContainerControls";
import { ColumnsAlignControls } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsAlignControls";
import { ColumnsSizeControls } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsSizeControls";
import { ColumnsWrapControls } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsWrapControls";
import {
  addNewColumn,
  removeLastColumn,
} from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/tpl-columns-utils";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  FullRow,
  LabeledItemRow,
  LabeledStyleItemRow,
  VerticalLabeledStyleDimItem,
  shouldBeDisabled,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { DefinedIndicator } from "@/wab/client/components/style-controls/DefinedIndicator";
import {
  ExpsProvider,
  StylePanelSection,
} from "@/wab/client/components/style-controls/StyleComponent";
import { IconLinkButton } from "@/wab/client/components/widgets";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import MinusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { equalColumnDistribution } from "@/wab/shared/columns-utils";
import { NullOrUndefinedValueError, ensure } from "@/wab/shared/common";
import { TplColumnTag, TplColumnsTag } from "@/wab/shared/core/tpls";
import { LENGTH_PERCENTAGE_UNITS, NUMBER_UNITS } from "@/wab/shared/css/types";
import { computeDefinedIndicator } from "@/wab/shared/defined-indicator";
import { ColumnsConfig } from "@/wab/shared/model/classes";
import { Menu } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import React from "react";

export interface ColumnsPanelProps {
  studioCtx: StudioCtx;
  tpl: TplColumnsTag;
  expsProvider: ExpsProvider;
}

export const ColumnsPanelSection = observer(function ColumnsPanelSection(
  props: ColumnsPanelProps
) {
  const { tpl, expsProvider } = props;
  const childrenLength = props.tpl.children.length;
  const studioCtx = props.studioCtx;
  const viewCtx = ensure(
    studioCtx.focusedViewCtx(),
    "must have focused viewctx"
  );
  const effectiveVs = viewCtx.effectiveCurrentVariantSetting(tpl);

  if (!effectiveVs.columnsConfig) {
    // only capture the error, but don't crash the studio because of it
    reportError(
      new NullOrUndefinedValueError(
        "[rc] - columnsConfig expected to be truthy"
      )
    );
  }

  // in case we don't have columns config, use an equal distribution
  // this way the user can still access the columns section
  const columnsConfig =
    effectiveVs.columnsConfig ||
    new ColumnsConfig({
      breakUpRows: false,
      colsSizes: equalColumnDistribution(tpl.children.length),
    });

  const definedIndicator = computeDefinedIndicator(
    studioCtx.site,
    viewCtx.currentComponent(),
    effectiveVs.getColumnsConfigSource(),
    viewCtx.variantTplMgr().getTargetIndicatorComboForNode(tpl)
  );

  const { isDisabled } = shouldBeDisabled({
    props: {},
    indicators: [definedIndicator],
  });

  return (
    <SidebarSection
      title="Responsive Section"
      isHeaderActive={true}
      definedIndicator={
        <DefinedIndicator
          label={"Responsive Section"}
          type={definedIndicator}
        />
      }
      makeHeaderMenu={() => {
        if (isDisabled) {
          return <></>;
        }
        return (
          <Menu>
            <Menu.Item
              onClick={async () => {
                await studioCtx.change(({ success }) => {
                  expsProvider
                    .mergedExp()
                    .clearAll([
                      "justify-content",
                      "align-items",
                      "align-content",
                    ]);
                  expsProvider.mergedExp().merge({
                    display: "flex",
                    position: "relative",
                    width: "stretch",
                    height: "wrap",
                    alignItems: "stretch",
                    flexShrink: 1,
                  });
                  return success();
                });
              }}
            >
              Reset style
            </Menu.Item>
          </Menu>
        );
      }}
    >
      {(renderMaybeCollapsibleRows) => (
        <>
          {childrenLength > 0 && (
            <ColumnsSizeControls
              tpl={tpl}
              viewCtx={viewCtx}
              config={columnsConfig}
              isDisabled={isDisabled}
            />
          )}
          <LabeledItemRow
            label={<div className={S.rcLabelWidth}>Total Columns</div>}
          >
            <FullRow twinCols>
              <DimTokenSpinner
                value={`${childrenLength}`}
                onChange={async (val) => {
                  if (val && +val !== childrenLength && +val > 0) {
                    await studioCtx.changeUnsafe(() => {
                      let delta = +val - childrenLength;
                      if (delta > 0) {
                        while (delta--) {
                          addNewColumn(tpl, viewCtx);
                        }
                      } else {
                        delta *= -1;
                        while (delta--) {
                          removeLastColumn(tpl, viewCtx);
                        }
                      }
                    });
                  }
                }}
                noClear
                allowedUnits={NUMBER_UNITS}
                extraOptions={[]}
                min={0}
                max={12}
                studioCtx={studioCtx}
                allowFunctions={false}
              />
              <div className={cn("flex justify-end", S.iconsMargin)}>
                <IconLinkButton
                  disabled={childrenLength <= 1}
                  onClick={async () =>
                    await studioCtx.change<never>(({ success }) => {
                      removeLastColumn(tpl, viewCtx);
                      return success();
                    })
                  }
                >
                  <Icon icon={MinusIcon} />
                </IconLinkButton>
                <IconLinkButton
                  disabled={childrenLength === 12}
                  onClick={async () =>
                    await studioCtx.change<never>(({ success }) => {
                      addNewColumn(tpl, viewCtx);
                      return success();
                    })
                  }
                >
                  <Icon icon={PlusIcon} />
                </IconLinkButton>
              </div>
            </FullRow>
          </LabeledItemRow>
          <ColumnsGapControls
            expsProvider={expsProvider}
            studioCtx={studioCtx}
            isDisabled={isDisabled}
            includeRowGap={columnsConfig.breakUpRows}
          />
          {childrenLength > 0 && (
            <ColumnsWrapControls
              tpl={tpl}
              expsProvider={expsProvider}
              viewCtx={viewCtx}
              config={columnsConfig}
              isDisabled={isDisabled}
            />
          )}
          {renderMaybeCollapsibleRows([
            {
              collapsible: true,
              content: (
                <ColumnsAlignControls
                  tpl={tpl}
                  viewCtx={viewCtx}
                  isDisabled={isDisabled}
                />
              ),
            },
          ])}
        </>
      )}
    </SidebarSection>
  );
});

export const ColumnsStyleOnlySection = observer(
  function ColumnsStyleOnlySection(props: { expsProvider: ExpsProvider }) {
    const { expsProvider } = props;
    const studioCtx = useStudioCtx();
    return (
      <SidebarSection title="Responsive Section">
        <ColumnsGapControls
          expsProvider={expsProvider}
          studioCtx={studioCtx}
          includeRowGap={true}
        />
      </SidebarSection>
    );
  }
);

export const ColumnsGapControls = observer(function ColumnsGapControls(props: {
  expsProvider: ExpsProvider;
  studioCtx: StudioCtx;
  isDisabled?: boolean;
  includeRowGap?: boolean;
}) {
  const { expsProvider, studioCtx, isDisabled, includeRowGap } = props;
  const exp = expsProvider.mergedExp();

  return (
    <LabeledStyleItemRow label={"Gaps"} styleName={["column-gap", "row-gap"]}>
      <FullRow twinCols>
        <VerticalLabeledStyleDimItem
          label="Column"
          styleName="column-gap"
          expsProvider={expsProvider}
          dimOpts={{
            min: 0,
            noClear: true,
            allowedUnits: LENGTH_PERCENTAGE_UNITS,
            allowFunctions: true,
          }}
          isDisabled={isDisabled}
        />
        <VerticalLabeledStyleDimItem
          label="Row"
          styleName="row-gap"
          expsProvider={expsProvider}
          dimOpts={{
            min: 0,
            noClear: true,
            allowedUnits: LENGTH_PERCENTAGE_UNITS,
            allowFunctions: true,
          }}
          isDisabled={isDisabled || !includeRowGap}
        />
      </FullRow>
    </LabeledStyleItemRow>
  );
});

export const ColumnSection = observer(function ColumnSection(props: {
  viewCtx: ViewCtx;
  expsProvider: ExpsProvider;
  tpl: TplColumnTag;
}) {
  const { expsProvider } = props;
  return (
    <StylePanelSection
      title="Responsive Column"
      expsProvider={expsProvider}
      styleProps={[
        "flex-direction",
        "justify-content",
        "align-items",
        "align-content",
        "flex-wrap",
        "row-gap",
        "column-gap",
      ]}
    >
      {(renderMaybeCollapsibleRows) => (
        <FlexContainerControls
          expsProvider={expsProvider}
          renderMaybeCollapsibleRows={renderMaybeCollapsibleRows}
        />
      )}
    </StylePanelSection>
  );
});

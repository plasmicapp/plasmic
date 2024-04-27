import { ColumnsConfig } from "@/wab/classes";
import S from "@/wab/client/components/sidebar-tabs/ColumnsSection.module.scss";
import { FlexContainerControls } from "@/wab/client/components/sidebar-tabs/FlexContainerControls";
import { ColumnsAlignControls } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsAlignControls";
import { ColumnsSizeControls } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsSizeControls";
import { ColumnsWrapControls } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsWrapControls";
import {
  addNewColumn,
  removeLastColumn,
} from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/tpl-columns-utils";
import {
  DraggableDimLabel,
  FullRow,
  LabeledItemRow,
  LabeledStyleItemRow,
  shouldBeDisabled,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { DefinedIndicator } from "@/wab/client/components/style-controls/DefinedIndicator";
import {
  ExpsProvider,
  StylePanelSection,
} from "@/wab/client/components/style-controls/StyleComponent";
import { IconLinkButton } from "@/wab/client/components/widgets";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { reportError } from "@/wab/client/ErrorNotifications";
import MinusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, NullOrUndefinedValueError } from "@/wab/common";
import { TokenType } from "@/wab/commons/StyleToken";
import { equalColumnDistribution } from "@/wab/shared/columns-utils";
import { computeDefinedIndicator } from "@/wab/shared/defined-indicator";
import { TplColumnsTag, TplColumnTag } from "@/wab/tpls";
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
                allowedUnits={[""]}
                extraOptions={[]}
                min={0}
                max={12}
                studioCtx={studioCtx}
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

const SingleGapControl = observer(function ColumnsGapControls(props: {
  expsProvider: ExpsProvider;
  studioCtx: StudioCtx;
  isDisabled?: boolean;
  label: string;
  prop: string;
  value: string;
}) {
  const { studioCtx, expsProvider, prop, label, value, isDisabled } = props;
  const exp = expsProvider.mergedExp();
  return (
    <div className="flex flex-col flex-align-end" style={{ overflow: "auto" }}>
      <DimTokenSpinner
        value={value}
        onChange={(val) =>
          val &&
          studioCtx.changeUnsafe(() => {
            exp.set(prop, val);
          })
        }
        noClear={true}
        allowedUnits={["px"]}
        disabled={isDisabled}
        studioCtx={studioCtx}
        tokenType={TokenType.Spacing}
        minDropdownWidth={200}
      />
      {isDisabled ? (
        label
      ) : (
        <DraggableDimLabel
          styleNames={[prop]}
          studioCtx={studioCtx}
          label={label}
          expsProvider={expsProvider}
          defaultUnit={"px"}
          min={0}
          fractionDigits={0}
          dragScale={"10"}
        />
      )}
    </div>
  );
});

export const ColumnsGapControls = observer(function ColumnsGapControls(props: {
  expsProvider: ExpsProvider;
  studioCtx: StudioCtx;
  isDisabled?: boolean;
  includeRowGap?: boolean;
}) {
  const { expsProvider, studioCtx, isDisabled, includeRowGap } = props;
  const exp = expsProvider.mergedExp();

  const rowGap = exp.get("flex-row-gap") || "";
  const colGap = exp.get("flex-column-gap") || "";
  return (
    <LabeledStyleItemRow
      label={"Gaps"}
      styleName={["flex-column-gap", "flex-row-gap"]}
    >
      <FullRow twinCols>
        <SingleGapControl
          expsProvider={expsProvider}
          studioCtx={studioCtx}
          isDisabled={isDisabled}
          label={"Column"}
          prop="flex-column-gap"
          value={colGap}
        />
        <SingleGapControl
          expsProvider={expsProvider}
          studioCtx={studioCtx}
          isDisabled={isDisabled || !includeRowGap}
          label={"Row"}
          prop="flex-row-gap"
          value={rowGap}
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
        "flex-row-gap",
        "flex-column-gap",
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

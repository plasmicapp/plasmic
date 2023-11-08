import { Menu } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import React from "react";
import { ColumnsConfig } from "../../../classes";
import { ensure, NullOrUndefinedValueError } from "../../../common";
import { TokenType } from "../../../commons/StyleToken";
import { equalColumnDistribution } from "../../../shared/columns-utils";
import { computeDefinedIndicator } from "../../../shared/defined-indicator";
import { TplColumnsTag, TplColumnTag } from "../../../tpls";
import { reportError } from "../../ErrorNotifications";
import MinusIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import {
  DraggableDimLabel,
  FullRow,
  LabeledItemRow,
  LabeledStyleItemRow,
  shouldBeDisabled,
} from "../sidebar/sidebar-helpers";
import { SidebarSection } from "../sidebar/SidebarSection";
import { DefinedIndicator } from "../style-controls/DefinedIndicator";
import {
  ExpsProvider,
  StylePanelSection,
} from "../style-controls/StyleComponent";
import { IconLinkButton } from "../widgets";
import DimTokenSpinner from "../widgets/DimTokenSelector";
import { Icon } from "../widgets/Icon";
import S from "./ColumnsSection.module.scss";
import { FlexContainerControls } from "./FlexContainerControls";
import { ColumnsAlignControls } from "./ResponsiveColumns/ColumnsAlignControls";
import { ColumnsSizeControls } from "./ResponsiveColumns/ColumnsSizeControls";
import { ColumnsWrapControls } from "./ResponsiveColumns/ColumnsWrapControls";
import {
  addNewColumn,
  removeLastColumn,
} from "./ResponsiveColumns/tpl-columns-utils";

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
            config={columnsConfig}
            isDisabled={isDisabled}
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

const SingleGapControl = observer(function ColumnsGapControls(props: {
  expsProvider: ExpsProvider;
  studioCtx: StudioCtx;
  config: ColumnsConfig;
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
  config: ColumnsConfig;
  isDisabled?: boolean;
}) {
  const { expsProvider, studioCtx, config, isDisabled } = props;
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
          config={config}
          isDisabled={isDisabled}
          label={"Column"}
          prop="flex-column-gap"
          value={colGap}
        />
        <SingleGapControl
          expsProvider={expsProvider}
          studioCtx={studioCtx}
          config={config}
          isDisabled={isDisabled || !config.breakUpRows}
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

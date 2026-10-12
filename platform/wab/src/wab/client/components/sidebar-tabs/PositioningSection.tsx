import {
  MaybeCollapsibleRowsRenderer,
  SidebarSection,
} from "@/wab/client/components/sidebar/SidebarSection";
import {
  FullRow,
  LabeledStyleDimItem,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  PosControls2,
  PosPushButtons,
} from "@/wab/client/components/style-controls/PosControls";
import {
  ExpsProvider,
  FlexControlHelper,
  StyleComponent,
  StylePanelSection,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import { AlignItemsControls } from "@/wab/client/components/style-controls/align-items-controls";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { isStylePropSet } from "@/wab/client/utils/style-utils";
import { isBaseVariant } from "@/wab/shared/Variants";
import { mapify, maybe } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { isTplComponent } from "@/wab/shared/core/tpls";
import { LENGTH_PERCENTAGE_UNITS, NUMBER_UNITS } from "@/wab/shared/css/types";
import { standardSides } from "@/wab/shared/geom";
import { ContainerType } from "@/wab/shared/layoututils";
import { observer } from "mobx-react";
import React from "react";

export const PositioningPanelSection = observer(
  class extends StyleComponent {
    render() {
      if (!this.props.expsProvider.showPositioningPanel()) {
        return (
          <SidebarSection
            title={
              <LabelWithDetailedTooltip
                tooltip={
                  this.studioCtx().focusedViewCtx()?.component.pageMeta ? (
                    <div>
                      Positioning controls are disabled on root elements,
                      because a page always takes up the full window.
                    </div>
                  ) : (
                    <div>
                      Positioning controls are disabled on root element.{" "}
                      <strong>Set it on component instances instead.</strong>
                    </div>
                  )
                }
              >
                Position
              </LabelWithDetailedTooltip>
            }
          />
        );
      }

      const exps = this.props.expsProvider;
      const h = new FlexControlHelper(exps);

      const curPosition = h.getEffectivePosition();
      const isAuto = h.getIsAuto();
      const parentContainerType = h.getParentContainerType();
      const parentIsFlex = ["flex-row", "flex-column"].includes(
        parentContainerType || "",
      );
      const parentIsFree = parentContainerType === "free";

      const parentIsCodeComponent =
        exps instanceof TplExpsProvider &&
        exps.tpl?.parent &&
        isTplComponent(exps.tpl.parent) &&
        isCodeComponent(exps.tpl.parent.component);

      const expsProvider = this.props.expsProvider;

      let toggleButtons = [
        {
          label: "Free",
          tooltip: "Free",
          value: "absolute",
        },
        {
          label: "Sticky",
          tooltip: "Sticky",
          value: "sticky",
        },
        {
          label: "Fixed",
          tooltip: "Fixed",
          value: "fixed",
        },
      ];

      if (!parentIsFree) {
        // Don't show Auto if parent is free container
        toggleButtons = [
          {
            label: "Auto",
            tooltip: "Auto",
            value: "relative",
          },
          ...toggleButtons,
        ];
      }

      const styleProps = [
        "position",
        "z-index",
        "vertical-align",
        ...standardSides,
        // Flex child settings
        "align-self",
        "order",
        // Grid child settings
        "grid-row",
        "grid-column",
        "justify-self",
        "align-self",
      ];
      const defaultStyleProps = mapify({ position: "relative" });

      const collapsableIndicatorNames = ["z-index", ...standardSides];
      return (
        <>
          <StylePanelSection
            expsProvider={this.props.expsProvider}
            title={"Position"}
            unremovableStyleProps={
              // You cannot remove "position" if you're a base variant
              exps instanceof TplExpsProvider &&
              isBaseVariant(exps.targetVariantCombo) &&
              !parentIsCodeComponent
                ? ["position"]
                : []
            }
            defaultStyleProps={defaultStyleProps}
            styleProps={styleProps}
            collapsableIndicatorNames={collapsableIndicatorNames}
            controls={
              <StyleToggleButtonGroup
                value={curPosition}
                autoWidth
                onChange={(val) =>
                  this.studioCtx().changeUnsafe(() => {
                    this.props.expsProvider.onPositionChange(val);
                  })
                }
              >
                {toggleButtons.map((button) => (
                  <StyleToggleButton
                    key={button.label}
                    showLabel
                    label={button.label}
                    tooltip={button.tooltip}
                    value={button.value}
                    children={null}
                    noIcon
                  />
                ))}
              </StyleToggleButtonGroup>
            }
            hasMore
          >
            {(renderMaybeCollapsibleRows) =>
              curPosition && (
                <>
                  <div>
                    {curPosition === "absolute" && (
                      <FreeChildSettings
                        expsProvider={this.props.expsProvider}
                        renderMaybeCollapsibleRows={renderMaybeCollapsibleRows}
                      />
                    )}
                    {curPosition === "fixed" && (
                      <FixedChildSettings
                        expsProvider={this.props.expsProvider}
                        renderMaybeCollapsibleRows={renderMaybeCollapsibleRows}
                      />
                    )}
                    {curPosition === "sticky" && (
                      <StickyChildSettings
                        flexParent={parentIsFlex}
                        expsProvider={this.props.expsProvider}
                        renderMaybeCollapsibleRows={renderMaybeCollapsibleRows}
                      />
                    )}
                    {isAuto && (
                      <AutoChildSettings
                        parentContainerType={parentContainerType}
                        expsProvider={expsProvider}
                        renderMaybeCollapsibleRows={renderMaybeCollapsibleRows}
                      />
                    )}
                  </div>
                </>
              )
            }
          </StylePanelSection>
        </>
      );
    }
  },
);

const AutoChildSettings = observer(function AutoChildSettings(props: {
  expsProvider: ExpsProvider;
  renderMaybeCollapsibleRows?: MaybeCollapsibleRowsRenderer;
  parentContainerType: ContainerType | undefined;
}) {
  const { expsProvider, parentContainerType } = props;
  const parentExp = expsProvider.getTargetDeepLayoutParentRsh();
  const flexDir = maybe(
    parentExp,
    (exp) => exp.get("flex-direction").split("-")[0],
  );

  const isSet = isStylePropSet(expsProvider);

  return (
    <>
      {["flex-row", "flex-column"].includes(parentContainerType || "") && (
        <AlignItemsControls
          expsProvider={expsProvider}
          prop="align-self"
          dir={flexDir || "row"}
          includeAuto={true}
          isFlex={true}
        />
      )}
      {parentContainerType === "content-layout" && (
        <AlignItemsControls
          expsProvider={expsProvider}
          prop="justify-self"
          dir={"column"}
          includeAuto={true}
          isFlex={false}
        />
      )}
      {props.renderMaybeCollapsibleRows?.([
        ["flex-row", "flex-column", "content-layout"].includes(
          parentContainerType || "",
        )
          ? {
              collapsible: !isSet("order") && !isSet("z-index"),
              content: (
                <FullRow twinCols>
                  <LabeledStyleDimItem
                    label="Order"
                    styleName="order"
                    dimOpts={{
                      allowedUnits: NUMBER_UNITS,
                      extraOptions: [],
                      dragScale: "1",
                      allowFunctions: false,
                    }}
                    labelSize="small"
                  />
                  <LabeledStyleDimItem
                    label="Z-index"
                    styleName="z-index"
                    dimOpts={{
                      allowedUnits: NUMBER_UNITS,
                      extraOptions: [],
                      dragScale: "1",
                      allowFunctions: false,
                    }}
                    labelSize="small"
                  />
                </FullRow>
              ),
            }
          : {
              collapsible: !isSet("z-index"),
              content: (
                <FullRow>
                  <div style={{ marginLeft: "auto", width: "50%" }}>
                    <LabeledStyleDimItem
                      label="Z-index"
                      styleName="z-index"
                      dimOpts={{
                        allowedUnits: NUMBER_UNITS,
                        extraOptions: [],
                        dragScale: "1",
                        allowFunctions: false,
                      }}
                      labelSize="small"
                    />
                  </div>
                </FullRow>
              ),
            },
      ])}
    </>
  );
});

const FreeChildSettings = observer(function FreeChildSettings({
  expsProvider,
  renderMaybeCollapsibleRows,
}: {
  expsProvider: ExpsProvider;
  renderMaybeCollapsibleRows?: MaybeCollapsibleRowsRenderer;
}) {
  return (
    <>
      <FullRow>
        <PosPushButtons expsProvider={expsProvider} />
      </FullRow>
      {renderMaybeCollapsibleRows?.([
        {
          collapsible: true,
          content: (
            <FullRow>
              <PosControls2 expsProvider={expsProvider} />
            </FullRow>
          ),
        },
        {
          collapsible: true,
          content: (
            <FullRow>
              <div style={{ marginLeft: "auto", width: "50%" }}>
                <LabeledStyleDimItem
                  label="Z-index"
                  styleName="z-index"
                  dimOpts={{
                    allowedUnits: NUMBER_UNITS,
                    dragScale: "1",
                    allowFunctions: false,
                  }}
                  labelSize="small"
                />
              </div>
            </FullRow>
          ),
        },
      ])}
    </>
  );
});

const FixedChildSettings = observer(function FixedChildSettings({
  expsProvider,
  renderMaybeCollapsibleRows,
}: {
  expsProvider: ExpsProvider;
  renderMaybeCollapsibleRows?: MaybeCollapsibleRowsRenderer;
}) {
  return (
    <>
      <FullRow>
        <PosPushButtons expsProvider={expsProvider} />
      </FullRow>
      {renderMaybeCollapsibleRows?.([
        {
          collapsible: true,
          content: (
            <FullRow>
              <PosControls2
                expsProvider={expsProvider}
                dimOpts={{
                  max: 300, // For fixed elements 300px is plenty of space to set it,
                  allowedUnits: LENGTH_PERCENTAGE_UNITS,
                }}
              />
            </FullRow>
          ),
        },
        {
          collapsible: true,
          content: (
            <FullRow>
              <div style={{ marginLeft: "auto", width: "50%" }}>
                <LabeledStyleDimItem
                  label="Z-index"
                  styleName="z-index"
                  dimOpts={{
                    allowedUnits: NUMBER_UNITS,
                    dragScale: "1",
                    allowFunctions: false,
                  }}
                  labelSize="small"
                />
              </div>
            </FullRow>
          ),
        },
      ])}
    </>
  );
});

const StickyChildSettings = observer(function StickyChildSettings({
  expsProvider,
  renderMaybeCollapsibleRows,
  flexParent,
}: {
  expsProvider: ExpsProvider;
  renderMaybeCollapsibleRows?: MaybeCollapsibleRowsRenderer;
  flexParent?: boolean;
}) {
  const parentExp = expsProvider.getTargetDeepLayoutParentRsh();
  const flexDir = maybe(
    parentExp,
    (exp) => exp.get("flex-direction").split("-")[0],
  );

  return (
    <>
      <FullRow>
        <PosControls2 expsProvider={expsProvider} />
      </FullRow>
      {renderMaybeCollapsibleRows?.([
        ...(flexParent
          ? [
              {
                collapsible: true,
                content: (
                  <AlignItemsControls
                    expsProvider={expsProvider}
                    prop="align-self"
                    dir={flexDir || "row"}
                    includeAuto={true}
                    isFlex={true}
                  />
                ),
              },
            ]
          : []),
        {
          collapsible: true,
          content: (
            <FullRow>
              <div style={{ marginLeft: "auto", width: "50%" }}>
                <LabeledStyleDimItem
                  label="Z-index"
                  styleName="z-index"
                  dimOpts={{
                    allowedUnits: NUMBER_UNITS,
                    dragScale: "1",
                    min: 1,
                    allowFunctions: false,
                  }}
                  labelSize="small"
                />
              </div>
            </FullRow>
          ),
        },
      ])}
    </>
  );
});

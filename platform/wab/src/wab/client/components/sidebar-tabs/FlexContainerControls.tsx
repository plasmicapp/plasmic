import { useContextMenu } from "@/wab/client/components/ContextMenu";
import S from "@/wab/client/components/sidebar-tabs/FlexContainerControls.module.scss";
import {
  FullRow,
  LabeledStyleDimItem,
  LabeledStyleSwitchItem,
  SectionSeparator,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { MaybeCollapsibleRowsRenderer } from "@/wab/client/components/sidebar/SidebarSection";
import { DefinedIndicator } from "@/wab/client/components/style-controls/DefinedIndicator";
import {
  createStyleContextMenu,
  ExpsProvider,
  TplExpsProvider,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { DropdownTooltip } from "@/wab/client/components/widgets/DropdownTooltip";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ChevronDownsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg";
import ChevronLeftsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronLeftSvg";
import ChevronRightsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronRightSvg";
import ChevronUpsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronUpSvg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { reverseIf } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { isTplComponent } from "@/wab/shared/core/tpls";
import { camelProp } from "@/wab/shared/css";
import { DefinedIndicatorType } from "@/wab/shared/defined-indicator";
import { flexDirToArrangement } from "@/wab/shared/layoututils";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { Menu } from "antd";
import cn from "classnames";
import { mapKeys, range } from "lodash";
import { observer } from "mobx-react";
import React, { useState } from "react";

type FlexArrangement = "row" | "column";

type AlignmentType = "with-axis" | "cross-axis" | "wrap-content";
type AlignmentProp =
  | "justify-content"
  | "align-items"
  | "align-content"
  | "justify-items";

type FlexAlignmentStyles = Partial<Record<AlignmentProp, FlexOptions>>;
type FlexConfig = {
  arrangement: FlexArrangement;
  isReverse: boolean;
  isWrap: boolean;
  isWrapReverse: boolean;
  alignment: FlexAlignmentStyles;
};

export enum FlexOptions {
  flexEnd = "flex-end",
  flexStart = "flex-start",
  center = "center",
  spaceBetween = "space-between",
  spaceAround = "space-around",
  spaceEvenly = "space-evenly",
  stretch = "stretch",
  baseline = "baseline",
  unset = "unset",
}

const withAxisAlignments = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
] as FlexOptions[];

const crossAxisAlignments = [
  "flex-start",
  "center",
  "flex-end",
  "stretch",
  "baseline",
] as FlexOptions[];

const wrapContentAlignments = [
  "flex-start",
  "center",
  "flex-end",
  "stretch",
  "space-between",
  "space-around",
  "space-evenly",
] as FlexOptions[];

const basicFlexAlignments = [
  FlexOptions.flexStart,
  FlexOptions.center,
  FlexOptions.flexEnd,
];

function isRow(arrangement?: "row" | "column") {
  return arrangement === "row";
}

function isColumn(arrangement?: "row" | "column") {
  return arrangement === "column";
}

function getCrossAxisProp(wrap?: boolean) {
  return wrap ? "alignContent" : "alignItems";
}

function getOppositeAlignmentIf(alignment: FlexOptions, invert?: boolean) {
  if (invert) {
    if (alignment === FlexOptions.flexStart) {
      return FlexOptions.flexEnd;
    }
    if (alignment === FlexOptions.flexEnd) {
      return FlexOptions.flexStart;
    }
  }
  return alignment;
}

const itemSizes = ["25%", "30%", "20%", "15%", "23%"];

function StackItems({
  wrap,
  arrangement,
}: {
  wrap?: boolean;
  arrangement: FlexArrangement;
}) {
  const sizeProp = arrangement === "row" ? "minHeight" : "minWidth";
  return (
    <>
      {range(wrap ? 5 : 3).map((_, i) => (
        <div key={i} style={{ [sizeProp]: itemSizes[i] }}>
          {i + 1}
        </div>
      ))}
    </>
  );
}

function PreviewStack({
  dimmed,
  arrangement,
  hidden,
  hovering,
  reverse,
  wrap,
  wrapReverse,
  alignment,
}: {
  dimmed?: boolean;
  arrangement: FlexArrangement;
  hidden?: boolean;
  hovering?: boolean;
  reverse?: boolean;
  wrap?: boolean;
  wrapReverse?: boolean;
  alignment: FlexAlignmentStyles;
}) {
  return (
    <>
      <div
        className={cn({
          [S.stackHidden]: hidden,
          [S.stackPreviewDimmed]: dimmed,
          [S.horizontalStack]: isRow(arrangement),
          [S.verticalStack]: isColumn(arrangement),
          [S.stackReverse]: reverse,
          [S.stackWrap]: wrap,
          [S.stackWrapReverse]: wrapReverse,
          [S.stackPreviewSimulated]: hovering,
        })}
        style={{
          alignItems: alignment["align-items"],
          alignContent: alignment["align-content"],
          justifyContent: alignment["justify-content"],
        }}
      >
        <StackItems wrap={wrap} arrangement={arrangement} />
      </div>
    </>
  );
}

function PreviewStack2({
  dimmed,
  arrangement,
  hidden,
  hovering,
  wrap,
  alignment,
  containerStyles,
}: {
  dimmed?: boolean;
  arrangement: FlexArrangement;
  hidden?: boolean;
  hovering?: boolean;
  wrap?: boolean;
  alignment: FlexAlignmentStyles;
  containerStyles: React.CSSProperties;
}) {
  return (
    <>
      <div
        className={cn({
          [S.previewStack]: true,
          [S.stackHidden]: hidden,
          [S.stackPreviewDimmed]: dimmed,
          [S.horizontalArrangement]: arrangement === "row",
          [S.verticalArrangement]: arrangement === "column",
          [S.stackPreviewSimulated]: hovering,
        })}
        style={{
          ...containerStyles,
          ...mapKeys(alignment, (_, k) => camelProp(k)),
        }}
      >
        <StackItems wrap={wrap} arrangement={arrangement} />
      </div>
    </>
  );
}

export function useFlexConfig(expsProvider: ExpsProvider) {
  const getStyle = (prop: string) => expsProvider.mergedExp().get(prop);

  const direction = getStyle("flex-direction");
  const isReverse = getStyle("flex-direction").endsWith("reverse");
  const isWrap = getStyle("flex-wrap").startsWith("wrap");
  const isWrapReverse = getStyle("flex-wrap").endsWith("reverse");
  const arrangement = flexDirToArrangement(direction);

  return {
    isReverse,
    isWrap,
    isWrapReverse,
    arrangement,
    alignment: {
      "align-items": getStyle("align-items") as FlexOptions,
      "align-content": getStyle("align-content") as FlexOptions,
      "justify-content": getStyle("justify-content") as FlexOptions,
    },
  } as FlexConfig;
}

interface FlexContainerControlsProps {
  expsProvider: ExpsProvider;
  renderMaybeCollapsibleRows: MaybeCollapsibleRowsRenderer;
  vsh?: VariantedStylesHelper;
}

function FlexContainerControls_(props: FlexContainerControlsProps) {
  const styling = useStyleComponent();
  const studioCtx = useStudioCtx();
  const {
    expsProvider,
    renderMaybeCollapsibleRows,
    vsh = makeVariantedStylesHelperFromCurrentCtx(studioCtx),
  } = props;

  const forCodeComponent =
    expsProvider instanceof TplExpsProvider &&
    isTplComponent(expsProvider.tpl) &&
    isCodeComponent(expsProvider.tpl.component);

  const { isReverse, isWrap, isWrapReverse, arrangement, alignment } =
    useFlexConfig(expsProvider);

  const getGapFieldProps = (prop: string): any => ({
    styleName: prop,
    tokenType: "Spacing",
    dimOpts: {
      min: 0,
      dragScale: "10",
      value: styling.exp().get(prop),
      onChange: (val) =>
        studioCtx.changeUnsafe(() => {
          if (val) {
            styling.exp().set(prop, val);
          } else {
            styling.exp().clear(prop);
          }
        }),
      styleType: "left",
    },
    vsh,
  });

  const toggleReverse = async () => {
    return styling.studioCtx().changeUnsafe(() => {
      if (isReverse) {
        styling.exp().set("flex-direction", arrangement);
      } else {
        styling.exp().set("flex-direction", `${arrangement}-reverse`);
      }
    });
  };

  const toggleWrapReverse = async () => {
    return styling.studioCtx().changeUnsafe(() => {
      if (isWrapReverse) {
        styling.exp().set("flex-wrap", "wrap");
      } else {
        styling.exp().set("flex-wrap", "wrap-reverse");
      }
    });
  };

  const toggleWrap = async () => {
    return styling.studioCtx().changeUnsafe(() => {
      if (isWrap) {
        styling.exp().set("flex-wrap", "nowrap");
        styling.exp().set("align-content", alignment["align-items"] ?? "unset");
      } else {
        styling.exp().set("flex-wrap", "wrap");
        styling.exp().clear("align-content");
        styling.exp().set("align-items", alignment["align-content"] ?? "unset");
      }
    });
  };

  const makeOptions = (prop: AlignmentProp) =>
    makeFlexAlignmentOptions({
      prop,
      arrangement,
      isWrap,
      isReverse,
      isWrapReverse,
    });
  const xProp = isColumn(arrangement) ? "align-items" : "justify-content";
  const outerXProp =
    isColumn(arrangement) && isWrap ? "align-content" : undefined;
  const yProp = isRow(arrangement) ? "align-items" : "justify-content";
  const outerYProp = isRow(arrangement) && isWrap ? "align-content" : undefined;

  return (
    <>
      <AlignmentGridControl
        xProp={xProp}
        xOptions={makeOptions(xProp)}
        outerXProp={outerXProp}
        outerXOptions={outerXProp ? makeOptions(outerXProp) : undefined}
        yProp={yProp}
        yOptions={makeOptions(yProp)}
        outerYProp={outerYProp}
        outerYOptions={outerYProp ? makeOptions(outerYProp) : undefined}
        arrangement={arrangement}
        containerStyles={{
          display: "flex",
          flexDirection: styling.exp().get("flex-direction") as any,
          flexWrap: isWrapReverse ? "wrap-reverse" : isWrap ? "wrap" : "nowrap",
        }}
        isWrap={isWrap}
      />
      <SectionSeparator className="mv-m" />
      {/* Gap fields */}
      {reverseIf(isColumn(arrangement), [
        (isRow(arrangement) || isWrap) && (
          <FullRow key="col">
            <LabeledStyleDimItem
              label={"Cols gap"}
              {...getGapFieldProps("column-gap")}
            />
          </FullRow>
        ),
        (isColumn(arrangement) || isWrap) && (
          <FullRow key="row">
            <LabeledStyleDimItem
              label={"Rows gap"}
              {...getGapFieldProps("row-gap")}
            />
          </FullRow>
        ),
      ])}
      <FullRow twinCols>
        <LabeledStyleSwitchItem
          styleName="flex-wrap"
          label="Wrap"
          value={isWrap}
          onChange={toggleWrap}
        />
        {isWrap && (
          <LabeledStyleSwitchItem
            tooltip="Wrap reverse"
            styleName="flex-wrap"
            label="Reverse"
            value={isWrapReverse}
            onChange={toggleWrapReverse}
          />
        )}
      </FullRow>
      {renderMaybeCollapsibleRows([
        {
          collapsible: !isReverse,
          content: (
            <FullRow className={S.flexTogglers}>
              <LabeledStyleSwitchItem
                styleName="flex-reverse"
                label="Reverse items"
                value={isReverse}
                onChange={toggleReverse}
              />
            </FullRow>
          ),
        },
      ])}
    </>
  );
}

export const FlexContainerControls = observer(FlexContainerControls_);

export function getFlexLabel(opts: {
  value: string;
  direction: "horizontal" | "vertical";
  reverse: boolean;
}) {
  const { value, direction, reverse } = opts;
  switch (value) {
    case "flex-start":
      return direction === "horizontal"
        ? reverse
          ? "Right"
          : "Left"
        : reverse
        ? "Bottom"
        : "Top";
    case "flex-end":
      return direction === "horizontal"
        ? reverse
          ? "Left"
          : "Right"
        : reverse
        ? "Top"
        : "Bottom";
    case "center":
      return "Center";
    case "stretch":
      return "Stretch";
    case "space-between":
      return "Between";
    case "space-around":
      return "Around";
    case "space-evenly":
      return "Evenly";
    case "baseline":
      return "Baseline";
    case "unset":
      return "(unset)";
  }
  throw new Error(`Unknown value: ${value}`);
}

function getAlignmentType(prop: AlignmentProp) {
  if (prop === "justify-content") {
    return "with-axis";
  } else if (prop === "align-content") {
    return "wrap-content";
  } else {
    // align-items
    return "cross-axis";
  }
}

function shouldReverseLabels(opts: {
  alignmentType: "with-axis" | "cross-axis" | "wrap-content";
  isReverse: boolean;
  isWrapReverse: boolean;
}) {
  const { alignmentType, isReverse, isWrapReverse } = opts;
  return (
    (alignmentType === "with-axis" && isReverse) ||
    (alignmentType === "wrap-content" && isWrapReverse) ||
    (alignmentType === "cross-axis" && isWrapReverse)
  );
}

function Aligner(props: {
  prop: AlignmentProp;
  value: FlexOptions;
  arrangement: FlexArrangement;
  isReverse: boolean;
  isWrap: boolean;
  isWrapReverse: boolean;
  onShowPreview: (value: FlexOptions) => void;
  onSelect: (value: FlexOptions) => void;
  definedIndicator?: DefinedIndicatorType;
  contextMenu: () => React.ReactElement;
}) {
  const {
    prop,
    value,
    arrangement,
    isReverse,
    isWrapReverse,
    isWrap,
    onShowPreview,
    onSelect,
    definedIndicator,
    contextMenu,
  } = props;
  const alignmentType = getAlignmentType(prop);
  const isCrossAxis =
    alignmentType === "cross-axis" || alignmentType === "wrap-content";
  const orientation =
    (arrangement === "row" && isCrossAxis) ||
    (arrangement === "column" && !isCrossAxis)
      ? "vertical"
      : "horizontal";
  const flexOptions =
    alignmentType === "with-axis"
      ? withAxisAlignments
      : alignmentType === "cross-axis"
      ? crossAxisAlignments
      : wrapContentAlignments;
  const reverseLabels = shouldReverseLabels({
    alignmentType,
    isReverse,
    isWrapReverse,
  });
  const isPerLine = isWrap && prop === "align-items";
  const title = `Distribute ${
    orientation === "horizontal" ? "horizontally" : "vertically"
  }${
    isPerLine
      ? ` for each ${orientation === "horizontal" ? "column" : "row"}`
      : ""
  }`;
  const contextMenuProps = useContextMenu({ menu: contextMenu });
  const indicator = definedIndicator && (
    <span
      className={cn({
        [S.verticalIndicator]: orientation === "vertical",
        [S.horizontalIndicator]: orientation === "horizontal",
      })}
    >
      <DefinedIndicator
        label={title}
        type={definedIndicator}
        menu={contextMenu}
      />
    </span>
  );
  return (
    <div
      className={cn({
        [S.aligner]: true,
        [S.horizontalAligner]: orientation === "horizontal",
        [S.verticalAligner]: orientation === "vertical",
        [S.isLineAligner]: isWrap && prop === "align-items",
      })}
    >
      {orientation === "horizontal" && indicator}
      <DropdownTooltip
        title={title}
        overlay={() => {
          return (
            <Menu>
              {flexOptions
                .map((val) => ({
                  value: val,
                  label: getFlexLabel({
                    value: val,
                    direction: orientation,
                    reverse: reverseLabels,
                  }),
                }))
                .map(({ label, value: val }) => (
                  <Menu.Item
                    key={val}
                    onMouseEnter={() => onShowPreview(val)}
                    onClick={() => onSelect(val)}
                  >
                    {label}
                  </Menu.Item>
                ))}
            </Menu>
          );
        }}
        trigger={["click"]}
        placement={orientation === "horizontal" ? "bottomLeft" : "topLeft"}
      >
        <button {...contextMenuProps} aria-label={title}>
          <div className={S.iconWrapper}>
            <Icon
              icon={
                orientation === "horizontal"
                  ? ChevronLeftsvgIcon
                  : ChevronUpsvgIcon
              }
            />
          </div>
          <div className={S.alignerTextWrapper}>
            {isPerLine &&
              `Each ${orientation === "horizontal" ? "col" : "row"}: `}
            {getFlexLabel({
              value,
              direction: orientation,
              reverse: reverseLabels,
            })}
          </div>
          <div className={S.iconWrapper}>
            <Icon
              icon={
                orientation === "horizontal"
                  ? ChevronRightsvgIcon
                  : ChevronDownsvgIcon
              }
            />
          </div>
        </button>
      </DropdownTooltip>
      {orientation === "vertical" && indicator}
    </div>
  );
}

function Aligner2(props: {
  value: FlexOptions;
  options: { value: FlexOptions; label: string }[];
  axis: "x" | "y";
  onShowPreview: (value: FlexOptions) => void;
  onSelect: (value: FlexOptions) => void;
  definedIndicator?: DefinedIndicatorType;
  contextMenu: () => React.ReactElement;
  isInnerAxis?: boolean;
}) {
  const {
    value,
    axis,
    options,
    onShowPreview,
    onSelect,
    definedIndicator,
    contextMenu,
    isInnerAxis,
  } = props;
  const contextMenuProps = useContextMenu({ menu: contextMenu });
  const title = `Distribute ${axis === "x" ? "horizontally" : "vertically"}${
    isInnerAxis ? ` for each ${axis === "x" ? "column" : "row"}` : ""
  }`;
  const indicator = definedIndicator && (
    <span
      className={cn({
        [S.verticalIndicator]: axis === "y",
        [S.horizontalIndicator]: axis === "x",
      })}
    >
      <DefinedIndicator
        label={title}
        type={definedIndicator}
        menu={contextMenu}
      />
    </span>
  );
  return (
    <div
      className={cn({
        [S.aligner]: true,
        [S.horizontalAligner]: axis === "x",
        [S.verticalAligner]: axis === "y",
      })}
    >
      {axis === "x" && indicator}
      <DropdownTooltip
        title={title}
        overlay={() => {
          return (
            <Menu>
              {options.map(({ label, value: val }) => (
                <Menu.Item
                  key={val}
                  onMouseEnter={() => onShowPreview(val)}
                  onClick={() => onSelect(val)}
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu>
          );
        }}
        trigger={["click"]}
        placement={axis === "x" ? "bottomLeft" : "topLeft"}
      >
        <button {...contextMenuProps} aria-label={title}>
          <div className={S.iconWrapper}>
            <Icon icon={axis === "x" ? ChevronLeftsvgIcon : ChevronUpsvgIcon} />
          </div>
          <div className={S.alignerTextWrapper}>
            {isInnerAxis && `Each ${axis === "x" ? "col" : "row"}: `}
            {options.find((op) => op.value === value)?.label}
          </div>
          <div className={S.iconWrapper}>
            <Icon
              icon={axis === "x" ? ChevronRightsvgIcon : ChevronDownsvgIcon}
            />
          </div>
        </button>
      </DropdownTooltip>
      {axis === "y" && indicator}
    </div>
  );
}

export function getGridLocation(opts: {
  value: FlexOptions;
  axis: "x" | "y";
  reverse: boolean;
}) {
  const { value, axis, reverse } = opts;
  if (!basicFlexAlignments.includes(value)) {
    return {};
  }
  if (axis === "x") {
    if (value === "flex-start") {
      return { gridX: reverse ? "right" : "left" } as const;
    } else if (value === "center") {
      return { gridX: "center" } as const;
    } else {
      return { gridX: reverse ? "left" : "right" } as const;
    }
  } else {
    if (value === "flex-start") {
      return { gridY: reverse ? "bottom" : "top" } as const;
    } else if (value === "center") {
      return { gridY: "center" } as const;
    } else {
      return { gridY: reverse ? "top" : "bottom" } as const;
    }
  }
}
function makeFlexAlignmentOptions(opts: {
  prop: AlignmentProp;
  arrangement: FlexArrangement;
  isWrap: boolean;
  isReverse: boolean;
  isWrapReverse: boolean;
}): AlignmentOption[] {
  const { prop, arrangement, isWrap, isReverse, isWrapReverse } = opts;
  const alignmentType = getAlignmentType(prop);
  const reverse = shouldReverseLabels({
    alignmentType,
    isReverse,
    isWrapReverse,
  });
  const isCrossAxis =
    alignmentType === "cross-axis" || alignmentType === "wrap-content";
  const orientation =
    (arrangement === "row" && isCrossAxis) ||
    (arrangement === "column" && !isCrossAxis)
      ? "vertical"
      : "horizontal";
  const values =
    alignmentType === "with-axis"
      ? withAxisAlignments
      : alignmentType === "cross-axis"
      ? crossAxisAlignments
      : wrapContentAlignments;

  return values.map((value) => {
    return {
      value,
      label: getFlexLabel({ value, direction: orientation, reverse }),
      ...getGridLocation({
        value,
        axis: orientation === "horizontal" ? "x" : "y",
        reverse,
      }),
    };
  });
}

interface AlignmentOption {
  value: FlexOptions;
  label: string;
  gridX?: "left" | "center" | "right";
  gridY?: "top" | "center" | "bottom";
}

export function AlignmentGridControl(props: {
  xProp: AlignmentProp;
  xOptions: AlignmentOption[];
  outerXProp?: AlignmentProp;
  outerXOptions?: AlignmentOption[];
  yProp: AlignmentProp;
  yOptions: AlignmentOption[];
  outerYProp?: AlignmentProp;
  outerYOptions?: AlignmentOption[];
  arrangement: FlexArrangement;
  containerStyles: React.CSSProperties;
  isWrap?: boolean;
}) {
  const {
    xProp,
    outerXProp,
    yProp,
    outerYProp,
    xOptions,
    outerXOptions,
    yOptions,
    outerYOptions,
    containerStyles,
    arrangement,
    isWrap,
  } = props;
  const [isHovering, setHovering] = useState(false);
  const [simulatedConfig, setSimulatedConfig] = useState<FlexAlignmentStyles>({
    [xProp]: FlexOptions.unset,
    [yProp]: FlexOptions.unset,
    ...(outerYProp && { [outerYProp]: FlexOptions.unset }),
  });

  const styling = useStyleComponent();

  const alignment: FlexAlignmentStyles = {
    [xProp]: styling.exp().get(xProp) ?? "unset",
    [yProp]: styling.exp().get(yProp) ?? "unset",
    ...(outerYProp && {
      [outerYProp]: styling.exp().get(outerYProp) ?? "unset",
    }),
    ...(outerXProp && {
      [outerXProp]: styling.exp().get(outerXProp) ?? "unset",
    }),
  };

  const setHoveringPreviewAlignment = (opts: Partial<FlexAlignmentStyles>) => {
    setHovering(true);
    setSimulatedConfig({ ...alignment, ...opts });
  };

  const makeAligner = (opts: {
    prop: AlignmentProp;
    options: AlignmentOption[];
    axis: "x" | "y";
    isInner?: boolean;
  }) => {
    const { prop, options, axis, isInner } = opts;
    return (
      <Aligner2
        value={alignment[prop]!}
        options={options}
        axis={axis}
        onShowPreview={(val) => setHoveringPreviewAlignment({ [prop]: val })}
        onSelect={(val) => styling.change(() => styling.exp().set(prop, val))}
        definedIndicator={styling.definedIndicator(prop)}
        contextMenu={() => createStyleContextMenu(styling, [prop])}
        isInnerAxis={isInner}
      />
    );
  };

  return (
    <FullRow className={S.root}>
      <div
        className={S.arrangementRoot}
        onMouseLeave={() => setHovering(false)}
      >
        <div className={S.leftControls}>
          {outerYProp &&
            outerYOptions &&
            makeAligner({
              prop: outerYProp,
              options: outerYOptions,
              axis: "y",
              isInner: false,
            })}
          {
            <MaybeWrap
              cond={!!outerYProp}
              wrapper={(x) => <div className={S.alignEachRow}>{x}</div>}
            >
              {makeAligner({
                prop: yProp,
                options: yOptions,
                axis: "y",
                isInner: !!outerYProp,
              })}
            </MaybeWrap>
          }
        </div>
        <div className={S.mainControls}>
          <div className={S.gridRoot}>
            {/* Stack preview: actual config */}
            <PreviewStack2
              dimmed={isHovering}
              arrangement={arrangement}
              containerStyles={containerStyles}
              alignment={alignment}
              wrap={isWrap}
            />

            {/* Stack preview: simulated config */}
            <PreviewStack2
              hovering
              arrangement={arrangement}
              containerStyles={containerStyles}
              hidden={!isHovering}
              alignment={simulatedConfig}
              wrap={isWrap}
            />

            {/* Hoverable grid */}
            <div className={S.hoverableGrid}>
              {range(9).map((_, i) => {
                const gridX = ["left", "center", "right"][i % 3];
                const gridY = ["top", "center", "bottom"][Math.floor(i / 3)];
                const horizontalVal = (outerXOptions ?? xOptions).find(
                  (o) => o.gridX === gridX
                )!.value;
                const verticalVal = (outerYOptions ?? yOptions).find(
                  (o) => o.gridY === gridY
                )!.value;
                return (
                  <div
                    key={i}
                    onMouseEnter={() =>
                      setHoveringPreviewAlignment({
                        [outerXProp ?? xProp]: horizontalVal,
                        [outerYProp ?? yProp]: verticalVal,
                      })
                    }
                    onClick={() =>
                      styling.studioCtx().changeUnsafe(() => {
                        styling.exp().set(outerXProp ?? xProp, horizontalVal);
                        styling.exp().set(outerYProp ?? yProp, verticalVal);
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
          <div className={S.bottomControls}>
            <MaybeWrap
              cond={!!outerXProp}
              wrapper={(x) => <div className={S.alignEachColumn}>{x}</div>}
            >
              {makeAligner({
                prop: xProp,
                options: xOptions,
                axis: "x",
                isInner: !!outerXProp,
              })}
            </MaybeWrap>
            {outerXProp &&
              outerXOptions &&
              makeAligner({
                prop: outerXProp,
                options: outerXOptions,
                axis: "x",
              })}
          </div>
        </div>
      </div>
    </FullRow>
  );
}

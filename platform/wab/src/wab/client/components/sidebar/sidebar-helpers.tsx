import { useContextMenu } from "@/wab/client/components/ContextMenu";
import { useLabel } from "@/wab/client/components/aria-utils";
import { ColorButton } from "@/wab/client/components/style-controls/ColorButton";
import {
  DefinedIndicator,
  mergedIndicatorSource,
} from "@/wab/client/components/style-controls/DefinedIndicator";
import StyleCheckbox from "@/wab/client/components/style-controls/StyleCheckbox";
import {
  ExpsProvider,
  createStyleContextMenu,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import StyleSwitch from "@/wab/client/components/style-controls/StyleSwitch";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import {
  DimTokenSpinner,
  DimValueOpts,
} from "@/wab/client/components/widgets/DimTokenSelector";
import { FontFamilySelector } from "@/wab/client/components/widgets/FontFamilySelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { PlasmicStyleToggleButtonGroup__VariantsArgs } from "@/wab/client/plasmic/plasmic_kit_style_controls/PlasmicStyleToggleButtonGroup";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { StyleTokenType, tryParseTokenRef } from "@/wab/commons/StyleToken";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { IRuleSetHelpersX } from "@/wab/shared/RuleSetHelpers";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { VariantCombo, makeVariantName } from "@/wab/shared/Variants";
import {
  cx,
  ensure,
  ensureArray,
  maybe,
  spawn,
  withoutNils,
} from "@/wab/shared/common";
import { siteFinalStyleTokensAllDeps } from "@/wab/shared/core/site-style-tokens";
import { parseCssNumericNew, roundedCssNumeric } from "@/wab/shared/css";
import { isDraggableSize } from "@/wab/shared/css-size";
import {
  DefinedIndicatorType,
  getTargetBlockingCombo,
} from "@/wab/shared/defined-indicator";
import { Select, Tooltip } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import * as React from "react";
import { CSSProperties, ReactNode } from "react";
import type { SetOptional } from "type-fest";

export function LabeledItem(props: {
  label?: React.ReactNode;
  subtitle?: React.ReactNode;
  layout?: "vertical" | "horizontal";
  labelSize?: "half" | "small" | "auto";
  className?: string;
  children: React.ReactNode;
  menu?: React.ReactElement | (() => React.ReactElement);
  tooltip?: React.ReactNode | (() => React.ReactNode);
  definedIndicator?: DefinedIndicatorType | DefinedIndicatorType[];
  rightExtras?: React.ReactNode;
  labelAriaProps?: { id?: string; htmlFor?: string };
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  indicatorClassName?: string;
  "data-test-id"?: string;
  alignment?: "top" | "center" | "baseline";
  autoWidth?: boolean;
  indentLabel?: boolean;
  contentAlignment?: "right";
  noMenuButton?: boolean;
  icon?: React.ReactNode;
}) {
  const {
    children,
    menu,
    className,
    label,
    subtitle,
    layout = "horizontal",
    labelSize,
    "data-test-id": dataTestId,
    alignment = "baseline",
    autoWidth,
    indentLabel,
    noMenuButton,
    contentAlignment,
    icon,
  } = props;
  const indicators = ensureArray(props.definedIndicator);
  const contextMenuProps = useContextMenu({ menu });
  const mergedSource = mergedIndicatorSource(indicators);
  const isDefaultTheme =
    indicators.length == 1 &&
    indicators[0].source === "setNonVariable" &&
    indicators[0].isDefaultTheme;
  const showIndicator =
    indicators.length > 0 &&
    !["theme", "none"].includes(mergedSource) &&
    !isDefaultTheme;

  const hasLabel = typeof label === "string" ? !!label.trim() : !!label;

  return (
    <LabeledListItem
      layout={layout === "vertical" ? "vertical" : undefined}
      alignment={alignment === "baseline" ? undefined : alignment}
      className={className}
      data-test-id={dataTestId}
      autoWidth={autoWidth}
      {...contextMenuProps}
      noMenuButton={props.noMenuButton}
      showMoreActions={!!props.rightExtras}
      moreActionButtons={props.rightExtras}
      noLabel={!hasLabel}
      nesting={indentLabel ? "labelOnly" : undefined}
      contentAlignment={contentAlignment}
      padding={withoutNils([
        "noContent",
        "noHorizontal",
        alignment === "center" ? "noLabel" : undefined,
      ])}
      withIcon={!!icon}
      icon={icon}
      menu={menu}
      labelSize={labelSize}
      label={
        <MaybeWrap
          cond={!!props.tooltip}
          wrapper={(x) => (
            <Tooltip title={props.tooltip}>{x as React.ReactElement}</Tooltip>
          )}
        >
          <label className="text-wrap" {...(props.labelAriaProps ?? {})}>
            {label}
          </label>
        </MaybeWrap>
      }
      subtitle={subtitle}
      withSubtitle={!!subtitle}
      indicator={
        showIndicator && (
          <DefinedIndicator label={label} menu={menu} type={indicators} />
        )
      }
    >
      {children}
    </LabeledListItem>
  );

  // return (
  //   <div
  //     className={cn(
  //       "labeled-item",
  //       `labeled-item--${layout}`,
  //       {
  //         "labeled-item--horizontal--flushtop": alignment === "top",
  //         "labeled-item--horizontal--vcenter": alignment === "center",
  //       },
  //       className
  //     )}
  //     {...contextMenuProps}
  //     data-test-id={dataTestId}
  //   >
  //     {hasLabel && (
  //       <div className={"labeled-item__label-and-defined-container"}>
  //         <MaybeWrap
  //           cond={!!props.tooltip}
  //           wrapper={(x) => (
  //             <Tooltip title={props.tooltip}>{x as React.ReactElement}</Tooltip>
  //           )}
  //         >
  //           <label
  //             {...(props.labelAriaProps ?? {})}
  //             className={cx({
  //               "labeled-item__label": true,
  //               "labeled-item__label--horizontal": layout === "horizontal",
  //               "labeled-item__label--vertical": layout === "vertical",
  //               "labeled-item__label--small": small,
  //               "labeled-item__label--icon": iconLabel,
  //               "labeled-item__label--disabled": props.isDisabled,
  //               "labeled-item__label--set":
  //                 mergedSource === "set" || mergedSource === "setNonVariable",
  //             })}
  //             title={typeof label === "string" ? label : undefined}
  //           >
  //             {label}
  //           </label>
  //         </MaybeWrap>
  //         {indicators.length > 0 &&
  //           !["theme", "none"].includes(mergedSource) &&
  //           !isDefaultTheme && (
  //             // Only show indicator if not from default theme
  //             <div
  //               className={cx(
  //                 "labeled-item__defined-container",
  //                 props.indicatorClassName
  //               )}
  //             >
  //               <DefinedIndicator label={label} menu={menu} type={indicators} />
  //               &nbsp;
  //             </div>
  //           )}
  //       </div>
  //     )}
  //     {children}
  //     {props.rightExtras}
  //   </div>
  // );
}

export const LabeledStyleItem = observer(function LabeledStyleItem_(
  props: Omit<React.ComponentProps<typeof LabeledItem>, "menu"> & {
    styleName: string | string[];
    displayStyleName?: string;
    initialMenuItems?: React.ReactNode | (() => React.ReactNode);
    hideIndicator?: boolean;
    noExtract?: boolean;
  }
) {
  const sc = useStyleComponent();
  const { styleName, hideIndicator, ...rest } = props;
  const styleNames = ensureArray(styleName);
  const makeMenu = () =>
    createStyleContextMenu(sc, styleNames, {
      displayStyleName:
        props.displayStyleName ??
        (typeof props.label === "string" ? props.label : undefined),
      initialMenuContent: props.initialMenuItems,
      noExtract: props.noExtract,
    });
  const indicator = hideIndicator
    ? undefined
    : ensureArray(
        props.definedIndicator || sc.definedIndicators(...styleNames)
      );
  return <LabeledItem {...rest} menu={makeMenu} definedIndicator={indicator} />;
});

export const DraggableDimLabel = observer(function DraggableDimLabel(props: {
  studioCtx: StudioCtx;
  label: React.ReactNode;
  expsProvider: ExpsProvider;
  exp?: IRuleSetHelpersX;
  styleNames: string[];
  defaultUnit: string;
  axis?: "x" | "y";
  min?: number;
  max?: number;
  dragScale?: "0.1" | "1" | "10" | "100";
  fractionDigits?: number;
  disabledDragging?: boolean;
  onChange?: (val: string) => void;
}) {
  const {
    label,
    studioCtx,
    styleNames,
    expsProvider,
    defaultUnit,
    min,
    max,
    dragScale,
    fractionDigits,
    disabledDragging,
    onChange,
  } = props;
  const axis = props.axis ?? "x";
  const exp = props.exp || expsProvider.mergedExp();
  const [init, setInit] = React.useState<string[] | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const isDraggingDisabled =
    disabledDragging ||
    React.useMemo(() => {
      let isDisabled = false;
      styleNames.forEach((styleName) => {
        const rawValue = exp.get(styleName);
        const maybeToken = tryParseTokenRef(rawValue, () =>
          siteFinalStyleTokensAllDeps(studioCtx.site)
        );
        if (!isDraggableSize((maybeToken && maybeToken.value) || rawValue)) {
          isDisabled = true;
          return;
        }
      });
      return isDisabled;
    }, [styleNames]);
  return (
    <XDraggable
      useMovement={true}
      disabled={isDraggingDisabled}
      onStart={() => {
        if (ref.current) {
          ref.current.requestPointerLock();
        }
        studioCtx.startUnlogged();
        const elt = maybe(expsProvider.forDom(), ($dom) => $dom[0]);
        setInit(
          styleNames.map((style) => {
            const val = exp.get(style);
            const parsed = parseCssNumericNew(val);
            if (!parsed && elt) {
              const realVal = getComputedStyle(elt)[style];
              if (realVal) {
                const realParsed = parseCssNumericNew(realVal);
                if (realParsed) {
                  return realVal;
                }
              }
            }
            return val;
          })
        );
      }}
      onDrag={(e) => {
        spawn(
          studioCtx.changeUnsafe(() => {
            let delta = axis === "x" ? e.data.deltaX : -e.data.deltaY;
            if (dragScale === "10") {
              delta /= 5.0;
            } else if (dragScale === "1") {
              delta /= 25;
            } else if (dragScale === "0.1") {
              delta /= 250;
            }
            styleNames.forEach((prop, i) => {
              const parsed = parseCssNumericNew(
                ensure(init, "Should have init defined when handling drag")[i]
              );
              const { num, units } = parsed || {
                num: 0,
                units: defaultUnit,
              };
              let newNum = num + delta;
              if (min !== undefined) {
                newNum = Math.max(min, newNum);
              }
              if (max !== undefined) {
                newNum = Math.min(max, newNum);
              }
              let newVal = `${newNum}${units || defaultUnit}`;
              if (fractionDigits !== undefined) {
                newVal = roundedCssNumeric(newVal, fractionDigits);
              }
              onChange ? onChange(newVal) : exp.set(prop, newVal);
            });
          })
        );
      }}
      onStop={() => {
        studioCtx.stopUnlogged();
        document.exitPointerLock();
      }}
    >
      <div
        className={
          isDraggingDisabled
            ? undefined
            : axis === "x"
            ? "ew-resize"
            : "ns-resize"
        }
        ref={ref}
      >
        {label}
      </div>
    </XDraggable>
  );
});

export const LabeledStyleDimItem = observer(function LabeledStyleDimItem(
  props: Omit<React.ComponentProps<typeof LabeledStyleItem>, "children"> & {
    dimOpts?: SetOptional<
      Omit<React.ComponentProps<typeof DimTokenSpinner>, "studioCtx">,
      "value" | "onChange"
    > &
      Pick<React.ComponentProps<typeof DraggableDimLabel>, "dragScale">;
    tokenType?: StyleTokenType;
    vsh?: VariantedStylesHelper;
    disabledDragging?: boolean;
  }
) {
  const { labelProps, fieldProps } = useLabel(props);
  const sc = useStyleComponent();
  const {
    dimOpts = {},
    label,
    tokenType,
    vsh = new VariantedStylesHelper(),
    disabledDragging,
    ...rest
  } = props;

  const styleName = ensureArray(props.styleName);
  const indicators = ensureArray(
    props.definedIndicator || sc.definedIndicators(...styleName)
  );
  const value =
    styleName.length > 1 || "value" in dimOpts
      ? ensure(dimOpts.value, "Should have value prop")
      : sc.exp().get(styleName[0]);
  const onChange =
    styleName.length > 1 || dimOpts.onChange
      ? ensure(dimOpts.onChange, "Should have onChange handler")
      : (val) => {
          sc.change(() => {
            if (val === undefined) {
              sc.exp().clear(styleName[0]);
            } else {
              sc.exp().set(styleName[0], val);
            }
          });
        };
  const studioCtx = sc.studioCtx();

  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props,
    label,
    indicators,
  });

  const draggableLabel =
    label && !isDisabled ? (
      <DraggableDimLabel
        styleNames={styleName}
        studioCtx={sc.studioCtx()}
        label={label}
        expsProvider={sc.props.expsProvider}
        defaultUnit={
          maybe(dimOpts.allowedUnits, (u) => u[0]) ??
          (dimOpts.allowedUnits?.includes("") ? "" : "px")
        }
        onChange={
          dimOpts.onChange
            ? (val) => dimOpts.onChange?.(val, "spin")
            : undefined
        }
        min={dimOpts.min}
        max={dimOpts.max}
        fractionDigits={dimOpts.fractionDigits ?? 0}
        dragScale={dimOpts.dragScale}
        disabledDragging={disabledDragging}
      />
    ) : (
      label
    );

  const valueSetState = getValueSetState(...indicators);
  return (
    <LabeledStyleItem
      {...rest}
      label={draggableLabel}
      definedIndicator={indicators}
      labelAriaProps={labelProps}
      isDisabled={isDisabled}
      displayStyleName={
        rest.displayStyleName ?? (typeof label === "string" ? label : undefined)
      }
    >
      <DimTokenSpinner
        value={value}
        onChange={onChange}
        minDropdownWidth={200}
        {...(dimOpts || {})}
        noClear={dimOpts?.noClear || valueSetState !== "isSet"}
        fieldAriaProps={fieldProps}
        studioCtx={studioCtx}
        tokenType={tokenType}
        valueSetState={valueSetState}
        disabled={isDisabled}
        disabledTooltip={disabledTooltip}
        data-plasmic-prop={styleName[0]}
        tooltip={dimOpts.tooltip}
        vsh={vsh}
      />
    </LabeledStyleItem>
  );
});

export const VerticalLabeledStyleDimItem = observer(
  function VerticalLabeledStyleDimItem(props: {
    expsProvider: ExpsProvider;
    styleName: string;
    label: string;
    dimOpts?: Omit<DimValueOpts, "onChange" | "value">;
    isDisabled?: boolean;
  }) {
    const { expsProvider, styleName, label } = props;

    const sc = useStyleComponent();
    const studioCtx = sc.studioCtx();
    const exp = sc.exp();

    const value = exp.get(styleName);

    const indicators = sc.definedIndicators(styleName);

    const { isDisabled } = shouldBeDisabled({
      props,
      indicators,
    });

    return (
      <div className="flex flex-col" style={{ overflow: "auto" }}>
        <DimTokenSpinner
          value={value}
          onChange={async (val) => {
            if (val) {
              await studioCtx.change(({ success }) => {
                exp.set(styleName, val);
                return success();
              });
            }
          }}
          disabled={isDisabled}
          studioCtx={studioCtx}
          tokenType={"Spacing"}
          minDropdownWidth={200}
          {...props.dimOpts}
        />
        {isDisabled ? (
          label
        ) : (
          <DraggableDimLabel
            styleNames={[styleName]}
            studioCtx={studioCtx}
            label={label}
            expsProvider={expsProvider}
            defaultUnit="px"
            fractionDigits={0}
            {...props.dimOpts}
            dragScale={"10"}
          />
        )}
      </div>
    );
  }
);

export const LabeledStyleColorItem = observer(function LabeledStyleColorItem(
  props: Omit<React.ComponentProps<typeof LabeledStyleItem>, "children"> & {
    colorOpts?: Omit<
      SetOptional<
        React.ComponentProps<typeof ColorButton>,
        "color" | "onChange"
      >,
      "sc"
    >;
    vsh?: VariantedStylesHelper;
  }
) {
  const sc = useStyleComponent();
  const { colorOpts = {}, vsh = new VariantedStylesHelper(), ...rest } = props;
  const styleName = ensureArray(props.styleName);
  const indicators = ensureArray(
    props.definedIndicator || sc.definedIndicators(...styleName)
  );
  const color =
    styleName.length > 1 || "color" in colorOpts
      ? colorOpts.color
      : sc.exp().get(styleName[0]);
  const onChange =
    styleName.length > 1 || colorOpts.onChange
      ? ensure(colorOpts.onChange, "Should have onChange handler")
      : (val) => sc.change(() => sc.exp().set(styleName[0], val));
  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props,
    label: rest.label,
    indicators,
  });
  return (
    <LabeledStyleItem
      {...rest}
      definedIndicator={indicators}
      isDisabled={isDisabled}
    >
      <ColorButton
        {...colorOpts}
        color={color}
        onChange={onChange}
        sc={sc.studioCtx()}
        valueSetState={getValueSetState(...indicators)}
        popupTitle={
          colorOpts.popupTitle ?? props.label ? (
            <div className="text-xlg strong tight-line-height">
              {props.label}
            </div>
          ) : undefined
        }
        isDisabled={isDisabled}
        disabledTooltip={disabledTooltip}
        vsh={vsh}
      />
    </LabeledStyleItem>
  );
});
export type StyleSelectOption = {
  value: string;
  label: React.ReactNode;
  isDisabled?: boolean;
};
export const LabeledStyleSelectItem = observer(function LabeledStyleSelectItem(
  props: Omit<React.ComponentProps<typeof LabeledStyleItem>, "children"> & {
    textRight?: boolean;
    selectOpts: {
      value?: string;
      onChange?: (val: string) => void;
      options: StyleSelectOption[];
      valueSetState?: ValueSetState;
    };
    "data-test-id"?: string;
  }
) {
  const { selectOpts, textRight = true, ...rest } = props;
  const { labelProps, fieldProps } = useLabel(props);
  const sc = useStyleComponent();
  const styleName = ensureArray(props.styleName);
  const indicators = ensureArray(
    props.definedIndicator || sc.definedIndicators(...styleName)
  );
  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props,
    label: rest.label,
    indicators,
  });
  const value =
    styleName.length > 1 || "value" in selectOpts
      ? selectOpts.value
      : sc.exp().get(styleName[0]);
  const onChange =
    styleName.length > 1 || selectOpts.onChange
      ? ensure(selectOpts.onChange, "Should have onChange handler")
      : (val) => sc.change(() => sc.exp().set(styleName[0], val));
  return (
    <LabeledStyleItem
      {...rest}
      labelAriaProps={labelProps}
      definedIndicator={indicators}
      isDisabled={isDisabled}
    >
      <StyleSelect
        value={value}
        textRight={textRight}
        onChange={(key) => onChange(key as string)}
        valueSetState={
          selectOpts.valueSetState ?? getValueSetState(...indicators)
        }
        {...fieldProps}
        data-test-id={props["data-test-id"]}
        isDisabled={isDisabled}
        disabledTooltip={disabledTooltip}
      >
        {selectOpts.options.map((option) => (
          <StyleSelect.Option
            key={option.value}
            value={option.value}
            isDisabled={option.isDisabled}
          >
            {option.label}
          </StyleSelect.Option>
        ))}
      </StyleSelect>
    </LabeledStyleItem>
  );
});

export const LabeledStyleComboBoxItem = observer(
  function LabeledStyleComboBoxItem(
    props: Omit<React.ComponentProps<typeof LabeledStyleItem>, "children"> & {
      textRight?: boolean;
      selectOpts: {
        value?: string;
        onChange?: (val: string) => void;
        showSearch?: boolean;
        options: {
          value: string;
          label: React.ReactNode;
          searchText?: string;
        }[];
      };
      "data-test-id"?: string;
    }
  ) {
    const { selectOpts, textRight = true, ...rest } = props;
    const { labelProps, fieldProps } = useLabel(props);
    const sc = useStyleComponent();
    const styleName = ensureArray(props.styleName);
    const indicators = ensureArray(
      props.definedIndicator || sc.definedIndicators(...styleName)
    );
    const { isDisabled, disabledTooltip } = shouldBeDisabled({
      props,
      label: rest.label,
      indicators,
    });
    const value =
      styleName.length > 1 || "value" in selectOpts
        ? selectOpts.value
        : sc.exp().get(styleName[0]);
    const onChange =
      styleName.length > 1 || selectOpts.onChange
        ? ensure(selectOpts.onChange, "Should have onChange handler")
        : (val) => sc.change(() => sc.exp().set(styleName[0], val));
    return (
      <LabeledStyleItem
        {...rest}
        labelAriaProps={labelProps}
        definedIndicator={indicators}
        isDisabled={isDisabled}
      >
        <MaybeWrap
          cond={!!isDisabled && !!disabledTooltip}
          wrapper={(elt) => <Tooltip title={disabledTooltip}>{elt}</Tooltip>}
        >
          <Select
            className={cx({
              "flex-fill textboxlike": true,
              "text-right": textRight,
              "textbox--unset":
                !mergedIndicatorSource(indicators).includes("set"),
            })}
            value={value}
            onChange={onChange}
            showSearch={selectOpts.showSearch}
            filterOption={(val, opt) =>
              !!(
                opt &&
                (
                  opt.searchText ||
                  (opt.label as string) ||
                  (opt.value as string)
                )
                  .toLowerCase()
                  .includes(val.toLowerCase())
              )
            }
            suffixIcon={<Icon icon={TriangleBottomIcon} />}
            options={selectOpts.options}
            dropdownClassName=""
            data-test-id={props["data-test-id"]}
            {...(fieldProps ?? {})}
            disabled={isDisabled}
          />
        </MaybeWrap>
      </LabeledStyleItem>
    );
  }
);

export const LabeledFontFamilySelector = observer(
  function LabeledFontFamilySelector(
    props: Omit<React.ComponentProps<typeof LabeledStyleItem>, "children"> & {
      selectOpts: {
        value?: string;
        onChange?: (val: string) => void;
        vsh?: VariantedStylesHelper;
      };
      "data-test-id"?: string;
    }
  ) {
    const { selectOpts, "data-test-id": dataTestId, ...rest } = props;
    const { labelProps } = useLabel(props);
    const sc = useStyleComponent();
    const styleName = ensureArray(props.styleName);
    const indicators = ensureArray(
      props.definedIndicator || sc.definedIndicators(...styleName)
    );
    const { isDisabled, disabledTooltip } = shouldBeDisabled({
      props,
      label: rest.label,
      indicators,
    });
    const value =
      styleName.length > 1 || "value" in selectOpts
        ? selectOpts.value
        : sc.exp().get(styleName[0]);
    const onChange =
      styleName.length > 1 || selectOpts.onChange
        ? ensure(selectOpts.onChange, "Should have onChange handler")
        : (val) => sc.change(() => sc.exp().set(styleName[0], val));
    return (
      <LabeledStyleItem
        {...rest}
        labelAriaProps={labelProps}
        definedIndicator={indicators}
        isDisabled={isDisabled}
      >
        <MaybeWrap
          cond={!!isDisabled && !!disabledTooltip}
          wrapper={(elt) => <Tooltip title={disabledTooltip}>{elt}</Tooltip>}
        >
          <FontFamilySelector
            studioCtx={sc.studioCtx()}
            selectOpts={{
              value: value,
              onChange: onChange,
              disabled: isDisabled,
              textboxUnset: !mergedIndicatorSource(indicators).includes("set"),
              vsh: selectOpts.vsh,
            }}
            data-test-id={dataTestId}
          />
        </MaybeWrap>
      </LabeledStyleItem>
    );
  }
);

export const LabeledStyleCheckboxItem = observer(
  function LabeledStyleCheckboxItem(
    props: Omit<React.ComponentProps<typeof LabeledStyleItem>, "children"> & {
      value: boolean;
      onChange: (isSelected: boolean) => void;
      "data-plasmic-prop"?: string;
    }
  ) {
    const { label, value, onChange, tooltip, ...rest } = props;
    const sc = useStyleComponent();
    const styleName = ensureArray(props.styleName);
    const indicators = ensureArray(
      props.definedIndicator || sc.definedIndicators(...styleName)
    );
    const { isDisabled, disabledTooltip } = shouldBeDisabled({
      props,
      label: props.label,
      indicators,
    });
    return (
      <LabeledStyleItem
        {...rest}
        definedIndicator={indicators}
        isDisabled={isDisabled}
      >
        <StyleCheckbox
          isChecked={value}
          onChange={onChange}
          valueSetState={getValueSetState(...indicators)}
          tooltip={tooltip}
          isDisabled={isDisabled}
          disabledTooltip={disabledTooltip}
          data-plasmic-prop={props["data-plasmic-prop"]}
        >
          {label}
        </StyleCheckbox>
      </LabeledStyleItem>
    );
  }
);

export const LabeledStyleSwitchItem = observer(function LabeledStyleSwitchItem(
  props: Omit<React.ComponentProps<typeof LabeledStyleItem>, "children"> & {
    value: boolean;
    onChange: (isSelected: boolean) => void;
    "data-plasmic-prop"?: string;
  }
) {
  const { label, value, onChange, tooltip, ...rest } = props;
  const { labelProps, fieldProps } = useLabel(props);
  const sc = useStyleComponent();
  const styleName = ensureArray(props.styleName);
  const indicators = ensureArray(
    props.definedIndicator || sc.definedIndicators(...styleName)
  );
  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props,
    label: props.label,
    indicators,
  });
  return (
    <LabeledStyleItem
      {...rest}
      label={label}
      definedIndicator={indicators}
      isDisabled={isDisabled}
      labelAriaProps={labelProps}
    >
      <StyleSwitch
        isChecked={value}
        onChange={onChange}
        valueSetState={undefined}
        tooltip={tooltip}
        isDisabled={isDisabled}
        disabledTooltip={disabledTooltip}
        data-plasmic-prop={props["data-plasmic-prop"]}
        {...fieldProps}
      >
        {null}
      </StyleSwitch>
    </LabeledStyleItem>
  );
});

export const LabeledToggleButtonGroup = observer(LabeledToggleButtonGroup_);

function LabeledToggleButtonGroup_(
  props: React.ComponentProps<typeof LabeledStyleItem> & {
    value?: string;
    onChange?: (value: string) => void;
    styleType?: PlasmicStyleToggleButtonGroup__VariantsArgs["styleType"];
    autoWidth?: boolean;
  }
) {
  const { children, styleType, className, autoWidth, ...rest } = props;
  const sc = useStyleComponent();
  const styleName = ensureArray(props.styleName);
  const indicators = ensureArray(
    props.definedIndicator || sc.definedIndicators(...styleName)
  );
  const value =
    styleName.length > 1 || "value" in props
      ? props.value
      : sc.exp().get(styleName[0]);
  const onChange =
    styleName.length > 1 || props.onChange
      ? ensure(props.onChange, "Should have onChange handler")
      : (val: string) => sc.change(() => sc.exp().set(styleName[0], val));
  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props,
    label: props.label,
    indicators,
  });
  return (
    <LabeledStyleItem
      {...rest}
      className={cn("no-outline", className)}
      definedIndicator={indicators}
      isDisabled={isDisabled}
      indicatorClassName={cn(
        "labeled-item__defined-container--tight",
        props.indicatorClassName
      )}
    >
      <StyleToggleButtonGroup
        value={value}
        onChange={onChange}
        valueSetState={getValueSetState(...indicators)}
        styleType={styleType}
        isDisabled={isDisabled}
        disabledTooltip={disabledTooltip}
        autoWidth={autoWidth}
      >
        {children}
      </StyleToggleButtonGroup>
    </LabeledStyleItem>
  );
}

export function TargetBlockedTooltip(props: {
  displayName?: React.ReactNode;
  combo: VariantCombo;
  studioCtx?: StudioCtx;
}) {
  const { displayName, combo } = props;
  return (
    <>
      <p>
        The {displayName ? <strong>{displayName}</strong> : null} is overwritten
        in variant{" "}
        <strong>
          {combo
            .map((variant) =>
              makeVariantName({ variant, site: props.studioCtx?.site })
            )
            .join(" + ")}
        </strong>
        .
      </p>
      <p>
        To edit, switch to editing that variant (by activating it in the
        floating toolbar).
      </p>
      <p>
        Or to remove the override, in the right sidebar, right-click{" "}
        {displayName === "text" ? (
          <>"Content" and select "Clear text."</>
        ) : (
          <>the property and remove it.</>
        )}
      </p>
    </>
  );
}

export function shouldBeDisabled(opts: {
  props: {
    isDisabled?: boolean;
    disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  };
  label?: React.ReactNode;
  indicators: DefinedIndicatorType[];
  studioCtx?: StudioCtx;
}) {
  if (opts.props.isDisabled) {
    return {
      isDisabled: true,
      disabledTooltip: opts.props.disabledTooltip,
    };
  }
  const targetBlockingCombo = getTargetBlockingCombo(opts.indicators);
  if (targetBlockingCombo) {
    return {
      isDisabled: true,
      disabledTooltip: (
        <TargetBlockedTooltip
          displayName={opts.label}
          combo={targetBlockingCombo}
          studioCtx={opts.studioCtx}
        />
      ),
    };
  } else {
    return {
      isDisabled: undefined,
      disabledTooltip: null,
    };
  }
}

export function InvariantablePropTooltip(props: { propName: string }) {
  const { propName } = props;
  return (
    <>
      <p>
        The <strong>{propName}</strong> is invariantable so it should only be
        modified in the <strong>Base</strong> variant.
      </p>
      <p>
        To edit, switch to editing that variant (by activating it in the
        floating toolbar).
      </p>
    </>
  );
}

export const FullRow = React.forwardRef(function FullRow(
  props: {
    className?: string;
    twinCols?: boolean;
    hidden?: boolean;
    autoHeight?: boolean;
    children: ReactNode;
  },
  outerRef: React.Ref<HTMLDivElement>
) {
  return (
    <div
      className={cx({
        "panel-row": true,
        [props.className || ""]: true,
        "panel-row--autoHeight": props.autoHeight,
      })}
      ref={outerRef}
      style={{
        ...(props.twinCols && Array.isArray(props.children)
          ? {
              display: "grid",
              gridTemplateColumns: "1fr ".repeat(props.children.length),
              gridColumnGap: 24,
            }
          : {}),
        ...(props.hidden ? { visibility: "hidden" } : {}),
      }}
    >
      {props.children}
    </div>
  );
});

export const LabeledItemRow = React.forwardRef(function LabeledItemRow(
  props: React.ComponentProps<typeof LabeledItem>,
  outerRef: React.Ref<HTMLDivElement>
) {
  return (
    <FullRow ref={outerRef}>
      <LabeledItem {...props} />
    </FullRow>
  );
});

export function LabeledStyleItemRow(
  props: React.ComponentProps<typeof LabeledStyleItem> & {
    rowProps?: { className?: string };
  }
) {
  return (
    <FullRow {...props.rowProps}>
      <LabeledStyleItem {...props} />
    </FullRow>
  );
}

export function LabeledStyleDimItemRow(
  props: React.ComponentProps<typeof LabeledStyleDimItem>
) {
  return (
    <FullRow>
      <LabeledStyleDimItem {...props} />
    </FullRow>
  );
}

export function LabeledStyleColorItemRow(
  props: React.ComponentProps<typeof LabeledStyleColorItem>
) {
  return (
    <FullRow>
      <LabeledStyleColorItem {...props} />
    </FullRow>
  );
}

export function LabeledStyleSelectItemRow(
  props: React.ComponentProps<typeof LabeledStyleSelectItem>
) {
  return (
    <FullRow>
      <LabeledStyleSelectItem {...props} />
    </FullRow>
  );
}

export function LabeledStyleCheckboxItemRow(
  props: React.ComponentProps<typeof LabeledStyleCheckboxItem>
) {
  return (
    <FullRow>
      <LabeledStyleCheckboxItem {...props} />
    </FullRow>
  );
}

export function LabeledToggleButtonGroupItemRow(
  props: React.ComponentProps<typeof LabeledToggleButtonGroup>
) {
  return (
    <FullRow>
      <LabeledToggleButtonGroup {...props} />
    </FullRow>
  );
}

export function SectionSeparator(props: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`SectionSeparator ${props.className}`}
      style={props.style}
    />
  );
}

export function NamedPanelHeader(props: {
  icon: React.ReactNode;
  style?: CSSProperties;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
  suffix?: React.ReactNode;
  subtitle?: React.ReactNode;
  subcontrols?: React.ReactNode;
  description?: string;
}) {
  const [readMore, setReadMore] = React.useState(false);
  return (
    <div style={{ width: "100%", ...props.style }}>
      <div className="flex flex-vcenter flex-fill">
        {props.icon}
        <div className="spacer-sm" />
        <SimpleTextbox
          defaultValue={props.value}
          onValueChange={(name) => props.onChange(name)}
          placeholder={props.placeholder}
          fontSize="xlarge"
          fontStyle="bold"
          className="flex-fill"
          data-test-class="simple-text-box"
        />
        {props.suffix && (
          <>
            <div className="spacer-sm" />
            {props.suffix}
          </>
        )}
      </div>
      {props.subtitle && (
        <div className="flex flex-vcenter dimfg regular">
          <div className="spacer-icon-sm" />
          <div className="spacer-m" />
          <div className="flex-fill text-ellipsis">{props.subtitle}</div>
          {props.subcontrols && (
            <div className="ml-sm no-line-height">{props.subcontrols}</div>
          )}
        </div>
      )}
      {props.description && (
        <div
          onClick={() => {
            setReadMore(!readMore);
          }}
          className="flex flex-vcenter text-set regular mt-lg"
        >
          <div className="spacer-icon-sm" />
          <div className="spacer-m" />
          <StandardMarkdown className={readMore ? undefined : "text-one-line"}>
            {props.description}
          </StandardMarkdown>
        </div>
      )}
    </div>
  );
}

export type ValueSetState = "isUnset" | "isInherited" | "isSet";
export function getValueSetState(
  ...indicators: DefinedIndicatorType[]
): ValueSetState | undefined {
  const source = mergedIndicatorSource(indicators);
  if (source.includes("set") || source === "invariantable") {
    return "isSet";
  } else if (source === "otherVariants" || source === "mixin") {
    return "isInherited";
  } else if (
    source === "none" ||
    source === "theme" ||
    source === "slot" ||
    source === "derived"
  ) {
    return "isUnset";
  } else {
    return undefined;
  }
}

export function isSetOrInherited(state: ValueSetState | undefined): boolean {
  return state === "isSet" || state === "isInherited";
}

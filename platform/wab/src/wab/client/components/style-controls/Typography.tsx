import {
  FullRow,
  getValueSetState,
  isSetOrInherited,
  LabeledFontFamilySelector,
  LabeledStyleColorItemRow,
  LabeledStyleDimItem,
  LabeledStyleSelectItem,
  LabeledStyleSwitchItem,
  LabeledToggleButtonGroup,
  StyleSelectOption,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { MaybeCollapsibleRowsRenderer } from "@/wab/client/components/sidebar/SidebarSection";
import {
  StyleComponent,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import { Icon } from "@/wab/client/components/widgets/Icon";
import AlignCenterIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__AlignCenter";
import AlignLeftIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__AlignLeft";
import AlignRightIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__AlignRight";
import CapitalizeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Capitalize";
import ClipIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Clip";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import ItalicsFalseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ItalicsFalse";
import ItalicsTrueIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ItalicsTrue";
import JustifyIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Justify";
import LowerIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Lower";
import StrikeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Strike";
import UnderIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Under";
import UpperIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Upper";
import DotsHorizontalIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__DotsHorizontal";
import {
  fontWeightOptions,
  isValidFontWeight,
} from "@/wab/client/typography-utils";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import { derefTokenRefs, tokenTypeDimOpts } from "@/wab/commons/StyleToken";
import { ensure, filterMapTruthy, maybe } from "@/wab/shared/common";
import { siteFinalStyleTokensAllDeps } from "@/wab/shared/core/site-style-tokens";
import { fontWeightNumber, parseCssNumericNew } from "@/wab/shared/css";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { notification } from "antd";
import { observer } from "mobx-react";
import * as React from "react";
import { ReactElement } from "react";

interface TypographyContentProps {
  onChange: (cssPropName: string, newValue: string) => void;
  unset: (cssPropName: string) => void;
  showMore?: boolean;
  showMoreButton?: ReactElement;
  renderMaybeCollapsibleRows: MaybeCollapsibleRowsRenderer;
  inheritableOnly: boolean;
  vsh?: VariantedStylesHelper;
  warnOnRelativeUnits?: boolean;
  readOnly?: boolean;
}

export const Typography = observer(_Typography);

function mkFontWeightOptions(
  sc: StyleComponent,
  currentFontWeight: string | undefined
): StyleSelectOption[] {
  const exp = sc.exp();

  // For Google fonts, where only certain variants are valid,
  // only show those variants
  const fontFamily = exp.get("font-family");
  const spec = sc
    .studioCtx()
    .fontManager.availFonts()
    .find((font) => font.fontFamily === fontFamily);

  return filterMapTruthy(fontWeightOptions, (option) =>
    isValidFontWeight(option.value, spec)
      ? option
      : option.value == currentFontWeight
      ? // font-weight is set to a value that is not supported by this font. In
        // this case, we want to show the current value for font-weight in the
        // options, but disabled.
        { ...option, isDisabled: true }
      : false
  );
}

function _Typography({
  renderMaybeCollapsibleRows,
  inheritableOnly,
  readOnly,
  ...props
}: TypographyContentProps) {
  const sc = useStyleComponent();
  const exp = sc.exp();
  const vsh =
    props.vsh ?? makeVariantedStylesHelperFromCurrentCtx(sc.studioCtx());

  const currentFontWeight = maybe(
    exp.get("font-weight"),
    (x) => `${fontWeightNumber(x)}`
  );

  return (
    <>
      <LabeledStyleColorItemRow
        label="Color"
        styleName="color"
        vsh={vsh}
        data-test-id="color-selector"
      />
      <FullRow>
        <LabeledFontFamilySelector
          label="Font"
          styleName="font-family"
          selectOpts={{
            onChange: (val) => props.onChange("font-family", val),
            vsh,
          }}
          data-test-id="font-family-selector"
          isDisabled={readOnly}
        />
      </FullRow>
      <FullRow>
        <LabeledStyleSelectItem
          styleName={"font-weight"}
          tooltip={`Font weight (boldness)`}
          label={"Weight"}
          textRight={false}
          selectOpts={{
            value: currentFontWeight,
            onChange: (val) => props.onChange("font-weight", `${val}`),
            options: mkFontWeightOptions(sc, currentFontWeight),
          }}
          isDisabled={readOnly}
        />
      </FullRow>
      <FullRow>
        <LabeledStyleDimItem
          label="Size"
          styleName="font-size"
          dimOpts={{
            ...tokenTypeDimOpts("FontSize"),
            "data-test-id": "font-size",
            dragScale: "1",
            min: 0,
            onChange: (val) => {
              sc.change(() => {
                if (val === undefined) {
                  sc.exp().clear("font-size");
                } else {
                  sc.exp().set("font-size", val);
                }
              });

              if (props.warnOnRelativeUnits) {
                if (val) {
                  const derefedVal = derefTokenRefs(
                    siteFinalStyleTokensAllDeps(sc.studioCtx().site),
                    val
                  );
                  const parsed = parseCssNumericNew(derefedVal);
                  if (
                    parsed?.units &&
                    ["em", "%", "rem"].includes(parsed.units)
                  ) {
                    notification.warn({
                      message:
                        "Font size is set in relative units (em, %, rem). This may cause unexpected results when font size is inherited.",
                    });
                  }
                }
              }
            },
          }}
          tokenType={"FontSize"}
          vsh={vsh}
          isDisabled={readOnly}
        />
      </FullRow>
      <FullRow>
        <LabeledToggleButtonGroup
          styleName="text-align"
          label="Align"
          autoWidth
          isDisabled={readOnly}
        >
          <StyleToggleButton value="left" tooltip="Align left">
            <Icon icon={AlignLeftIcon} />
          </StyleToggleButton>
          <StyleToggleButton value="center" tooltip="Align center">
            <Icon icon={AlignCenterIcon} />
          </StyleToggleButton>
          <StyleToggleButton value="right" tooltip="Align right">
            <Icon icon={AlignRightIcon} />
          </StyleToggleButton>
          <StyleToggleButton value="justify" tooltip="Justify">
            <Icon icon={JustifyIcon} />
          </StyleToggleButton>
        </LabeledToggleButtonGroup>
      </FullRow>
      <FullRow>
        <LabeledToggleButtonGroup
          styleName="font-style"
          label="Style"
          autoWidth
          isDisabled={readOnly}
        >
          <StyleToggleButton value="normal">
            <Icon icon={ItalicsFalseIcon} />
          </StyleToggleButton>
          <StyleToggleButton value="italic">
            <Icon icon={ItalicsTrueIcon} />
          </StyleToggleButton>
        </LabeledToggleButtonGroup>
      </FullRow>
      {!inheritableOnly && (
        <FullRow>
          <LabeledToggleButtonGroup
            styleName="text-decoration-line"
            label="Decorate"
            autoWidth
            isDisabled={readOnly}
            data-test-id="text-decoration-selector"
          >
            <StyleToggleButton value="underline">
              <Icon icon={UnderIcon} />
            </StyleToggleButton>
            <StyleToggleButton value="line-through">
              <Icon icon={StrikeIcon} />
            </StyleToggleButton>
            <StyleToggleButton value="none">
              <Icon icon={CloseIcon} />
            </StyleToggleButton>
          </LabeledToggleButtonGroup>
        </FullRow>
      )}
      {renderMaybeCollapsibleRows([
        {
          collapsible: !isSetOrInherited(
            getValueSetState(
              ...sc.definedIndicators("line-height", "letter-spacing")
            )
          ),
          content: (
            <>
              <FullRow>
                <LabeledStyleDimItem
                  styleName={"line-height"}
                  label={"Line height"}
                  dimOpts={{
                    ...tokenTypeDimOpts("LineHeight"),
                    dragScale: "0.1",
                  }}
                  tokenType={"LineHeight"}
                  vsh={vsh}
                  isDisabled={readOnly}
                />
              </FullRow>
              <FullRow>
                <LabeledStyleDimItem
                  label={"Letter spacing"}
                  styleName={"letter-spacing"}
                  dimOpts={{
                    ...tokenTypeDimOpts("Spacing"),
                    extraOptions: ["normal"],
                    dragScale: "1",
                  }}
                  isDisabled={readOnly}
                />
              </FullRow>
            </>
          ),
        },
        {
          collapsible: !isSetOrInherited(
            getValueSetState(
              ...sc.definedIndicators("user-select", "text-transform")
            )
          ),
          content: (
            <>
              <FullRow>
                <LabeledStyleSwitchItem
                  label="Selectable"
                  styleName="user-select"
                  value={exp.get("user-select") === "text"}
                  onChange={(val) => {
                    props.onChange("user-select", val ? "text" : "none");
                  }}
                  isDisabled={readOnly}
                />
              </FullRow>
              <FullRow>
                <LabeledToggleButtonGroup
                  label={"Text transform"}
                  styleName="text-transform"
                  autoWidth
                  isDisabled={readOnly}
                >
                  <StyleToggleButton value="uppercase">
                    <Icon icon={UpperIcon} />
                  </StyleToggleButton>
                  <StyleToggleButton value="capitalize">
                    <Icon icon={CapitalizeIcon} />
                  </StyleToggleButton>
                  <StyleToggleButton value="lowercase">
                    <Icon icon={LowerIcon} />
                  </StyleToggleButton>
                  <StyleToggleButton value="none">
                    <Icon icon={CloseIcon} />
                  </StyleToggleButton>
                </LabeledToggleButtonGroup>
              </FullRow>
            </>
          ),
        },
        {
          collapsible: !isSetOrInherited(
            getValueSetState(...sc.definedIndicators("white-space"))
          ),
          content: (
            <>
              <FullRow>
                <LabeledStyleSwitchItem
                  label="Line wrap"
                  styleName="white-space"
                  value={exp.get("white-space") !== "nowrap"}
                  onChange={(val) => {
                    props.onChange("white-space", val ? "pre-wrap" : "nowrap");
                    if (val) {
                      props.unset("text-overflow");
                      props.unset("overflow");
                    }
                  }}
                  isDisabled={readOnly}
                />
              </FullRow>

              <FullRow>
                <LabeledToggleButtonGroup
                  label="Overflow"
                  styleName="text-overflow"
                  isDisabled={readOnly || exp.get("white-space") !== "nowrap"}
                  disabledTooltip="Line wrap needs to be turned off to set the text overflow options"
                  value={
                    exp.has("text-overflow")
                      ? exp.get("text-overflow")
                      : "overflow"
                  }
                  onChange={(val) =>
                    sc.change(() => {
                      if (val === "overflow") {
                        props.unset("text-overflow");
                        props.unset("overflow");
                      } else {
                        props.onChange(
                          "text-overflow",
                          ensure(
                            val,
                            "Unexpected undefined text-overflow value"
                          )
                        );
                        props.onChange("overflow", "hidden");
                      }
                    })
                  }
                  autoWidth
                >
                  <StyleToggleButton value="ellipsis">
                    <Icon icon={DotsHorizontalIcon} />
                  </StyleToggleButton>
                  <StyleToggleButton value="clip">
                    <Icon icon={ClipIcon} />
                  </StyleToggleButton>
                  {/*
                    overflow" is not an actual value for text-overflow.
                    rather it's used to signal to unset "text-overflow" and "overflow"
                  */}
                  <StyleToggleButton value="overflow">
                    <Icon icon={CloseIcon} />
                  </StyleToggleButton>
                </LabeledToggleButtonGroup>
              </FullRow>
            </>
          ),
        },
      ])}
    </>
  );
}

import { isKnownImageAssetRef } from "@/wab/classes";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import S from "@/wab/client/components/sidebar-tabs/SizeSection.module.scss";
import {
  FullRow,
  getValueSetState,
  isSetOrInherited,
  LabeledItemRow,
  LabeledStyleDimItem,
  LabeledStyleDimItemRow,
  LabeledStyleSwitchItem,
  SectionSeparator,
  shouldBeDisabled,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import StyleCheckbox from "@/wab/client/components/style-controls/StyleCheckbox";
import {
  ExpsProvider,
  FlexControlHelper,
  StyleComponent,
  StyleComponentProps,
  StylePanelSection,
  TplExpsProvider,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { Icon as IconComponent } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import { DimManip } from "@/wab/client/DimManip";
import {
  default as PlasmicIcon__Stretch,
  default as StretchIcon,
} from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Stretch";
import {
  default as PlasmicIcon__Wrap,
  default as WrapIcon,
} from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Wrap";
import WidthFullBleedIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WidthFullBleed";
import WidthStandardStretchIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WidthStandardStretch";
import WidthWideIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WidthWide";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import { assert, spawn, withoutNils } from "@/wab/common";
import { TokenType, tokenTypeDimOpts } from "@/wab/commons/StyleToken";
import { isPageComponent } from "@/wab/components";
import { getLengthUnits } from "@/wab/css";
import {
  CONTENT_LAYOUT_FULL_BLEED,
  CONTENT_LAYOUT_WIDE,
} from "@/wab/shared/core/style-props";
import { parseDataUrl, SVG_MEDIA_TYPE } from "@/wab/shared/data-urls";
import { isContentLayoutTpl } from "@/wab/shared/layoututils";
import {
  getPageFrameSizeType,
  isTplAutoSizable,
  isTplResizable,
  setPageSizeType,
} from "@/wab/shared/sizingutils";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { capitalizeFirst } from "@/wab/strs";
import { isComponentRoot, isTplComponent, isTplImage } from "@/wab/tpls";
import { Alert, Menu } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import React from "react";

interface SizePanelSectionState {
  showMore: boolean;
}

class SizeSection_ extends StyleComponent<
  StyleComponentProps,
  SizePanelSectionState
> {
  constructor(props: StyleComponentProps) {
    super(props);
    this.state = {
      showMore: false,
    };
  }

  render() {
    const dimOpts = { ...tokenTypeDimOpts(TokenType.Spacing), min: 0 };
    const vsh =
      this.props.vsh ??
      makeVariantedStylesHelperFromCurrentCtx(this.studioCtx());

    const isMinMaxWidthSet = isSetOrInherited(
      getValueSetState(...this.definedIndicators("min-width", "max-width"))
    );

    const isMinMaxHeightSet = isSetOrInherited(
      getValueSetState(...this.definedIndicators("min-width", "max-width"))
    );

    const tpl =
      this.props.expsProvider instanceof TplExpsProvider
        ? this.props.expsProvider.tpl
        : undefined;
    const deepLayoutParent = tpl
      ? $$$(tpl).layoutParent({ throughSlot: true }).maybeOneTpl()
      : undefined;
    const isDeepContentLayoutChild =
      !!deepLayoutParent && isContentLayoutTpl(deepLayoutParent);
    const isDeepContentLayout =
      !!tpl && isContentLayoutTpl(tpl, { deep: true });

    return (
      <StylePanelSection
        expsProvider={this.props.expsProvider}
        styleProps={[
          "width",
          "height",
          "min-width",
          "min-height",
          "max-width",
          "max-height",
          "flex-grow",
          "flex-shrink",
          "flex-basis",
        ]}
        title={"Size"}
        hasMore
        data-test-id="size-section"
      >
        {(renderMaybeCollapsibleRows) => (
          <div>
            {isSvg(this.props.expsProvider) && (
              <Alert
                className="mb-sm"
                type="warning"
                showIcon={true}
                message={
                  <div>
                    SVGs have no default size, so setting width to hug or auto
                    will cause it to stretch to fill the parent container.
                  </div>
                }
              />
            )}
            {renderMaybeCollapsibleRows([
              {
                collapsible: false,
                content: (
                  <FullRow>
                    <SizeControl
                      prop="width"
                      expsProvider={this.props.expsProvider}
                      vsh={vsh}
                      // TODO: experimenting with nested content
                      // layout sections that can be resized
                      // isDisabled={
                      //   isDeepContentLayout && isDeepContentLayoutChild
                      // }
                      // disabledTooltip={
                      //   isDeepContentLayout && isDeepContentLayoutChild
                      //     ? "Nested page sections are always full-bleed"
                      //     : undefined
                      // }
                    />
                  </FullRow>
                ),
              },
              {
                collapsible: !isSetOrInherited(
                  getValueSetState(...this.definedIndicators("min-width"))
                ),
                content: (
                  <FullRow>
                    <LabeledStyleDimItem
                      label="Min Width"
                      styleName={`min-width`}
                      dimOpts={{
                        ...tokenTypeDimOpts(TokenType.Spacing),
                        min: 0,
                        extraOptions: ["auto"],
                      }}
                      tokenType={TokenType.Spacing}
                      vsh={vsh}
                    />
                  </FullRow>
                ),
              },
              {
                collapsible: !isSetOrInherited(
                  getValueSetState(...this.definedIndicators("max-width"))
                ),
                content: (
                  <FullRow>
                    <LabeledStyleDimItem
                      label="Max Width"
                      styleName={`max-width`}
                      dimOpts={{
                        ...tokenTypeDimOpts(TokenType.Spacing),
                        min: 0,
                        extraOptions: ["auto"],
                      }}
                      tokenType={TokenType.Spacing}
                      vsh={vsh}
                    />
                  </FullRow>
                ),
              },
              {
                collapsible: false,
                content: (
                  <>
                    <SectionSeparator className="mv-m" />
                    <FullRow>
                      <SizeControl
                        prop="height"
                        expsProvider={this.props.expsProvider}
                        vsh={vsh}
                      />
                    </FullRow>
                  </>
                ),
              },
              {
                collapsible: !isSetOrInherited(
                  getValueSetState(...this.definedIndicators("min-height"))
                ),
                content: (
                  <FullRow>
                    <LabeledStyleDimItem
                      label="Min Height"
                      styleName={`min-height`}
                      dimOpts={{
                        ...tokenTypeDimOpts(TokenType.Spacing),
                        min: 0,
                        extraOptions: ["none"],
                      }}
                      tokenType={TokenType.Spacing}
                      vsh={vsh}
                    />
                  </FullRow>
                ),
              },
              {
                collapsible: !isSetOrInherited(
                  getValueSetState(...this.definedIndicators("max-height"))
                ),
                content: (
                  <FullRow>
                    <LabeledStyleDimItem
                      label="Max Height"
                      styleName={`max-height`}
                      dimOpts={{
                        ...tokenTypeDimOpts(TokenType.Spacing),
                        min: 0,
                        extraOptions: ["none"],
                      }}
                      tokenType={TokenType.Spacing}
                      vsh={vsh}
                    />
                  </FullRow>
                ),
              },
              {
                collapsible:
                  !isSetOrInherited(
                    getValueSetState(
                      ...this.definedIndicators("flex-grow", "flex-shrink")
                    )
                  ) &&
                  !isSetOrInherited(
                    getValueSetState(...this.definedIndicators("flex-basis"))
                  ),
                content: <SectionSeparator className="mv-m" />,
              },
              {
                collapsible: !isSetOrInherited(
                  getValueSetState(
                    ...this.definedIndicators("flex-grow", "flex-shrink")
                  )
                ),
                content: (
                  <FlexGrowControls expsProvider={this.props.expsProvider} />
                ),
              },
              {
                collapsible: !isSetOrInherited(
                  getValueSetState(...this.definedIndicators("flex-basis"))
                ),
                content: (
                  <LabeledStyleDimItemRow
                    label="Flex basis"
                    styleName="flex-basis"
                    dimOpts={{
                      ...dimOpts,
                      extraOptions: ["auto"],
                    }}
                    tokenType={TokenType.Spacing}
                    vsh={vsh}
                    definedIndicator={this.definedIndicators("flex-basis")}
                  />
                ),
              },
            ])}
          </div>
        )}
      </StylePanelSection>
    );
  }
}

export const SizeSection = observer(SizeSection_);

export const SizeWidthOnlySection = observer(function SizeWidthOnlySection(
  props: StyleComponentProps
) {
  const { expsProvider } = props;
  const studioCtx = expsProvider.studioCtx;
  const vsh = props.vsh ?? makeVariantedStylesHelperFromCurrentCtx(studioCtx);
  return (
    <StylePanelSection
      expsProvider={expsProvider}
      styleProps={["width"]}
      title={"Size"}
      data-test-id="size-width-section"
    >
      <FullRow>
        <SizeControl prop="width" expsProvider={expsProvider} vsh={vsh} />
      </FullRow>
    </StylePanelSection>
  );
});

const SizeControl = observer(function SizeRow(props: {
  prop: "width" | "height";
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode;
}) {
  const {
    prop,
    expsProvider,
    isDisabled,
    disabledTooltip,
    vsh = new VariantedStylesHelper(),
  } = props;
  const value = expsProvider.mergedExp().get(prop);
  const tpl =
    expsProvider instanceof TplExpsProvider ? expsProvider.tpl : undefined;
  const canSetSpecialSizes = !!tpl;

  const sc = expsProvider.studioCtx;

  let isAutoSizable = true;
  let isResizable = true;
  let isRoot = false;
  let isDeepContentLayoutChild = false;
  if (tpl) {
    const vtm = (expsProvider as TplExpsProvider).viewCtx.variantTplMgr();
    isResizable = isTplResizable(tpl, vtm)[prop];
    isAutoSizable = isTplAutoSizable(tpl, vtm, prop);
    isRoot = isComponentRoot(tpl);
    const deepLayoutParent = tpl
      ? $$$(tpl).layoutParent({ throughSlot: true }).maybeOneTpl()
      : undefined;
    isDeepContentLayoutChild =
      (!!deepLayoutParent && isContentLayoutTpl(deepLayoutParent)) || isRoot;
  }

  const stretchLabel =
    prop === "width" && isDeepContentLayoutChild && !isRoot
      ? "Standard width"
      : "Stretch";
  const fullBleedLabel = isRoot ? "Stretch (full bleed)" : "Full bleed";
  const wideLabel = isRoot ? "Stretch (wide)" : "Wide";
  const extraOptions = canSetSpecialSizes
    ? withoutNils([
        {
          value: "wrap",
          disabled: !isAutoSizable || value === "wrap",
          cleanLabel: "hug content",
          label: (
            <div className={S.extraOptionWrapper}>
              <IconComponent
                icon={WrapIcon}
                style={{
                  transform: prop === "height" ? "rotate(-90deg)" : undefined,
                }}
              />
              Hug content
            </div>
          ),
        },
        {
          value: "stretch",
          disabled: value === "stretch",
          cleanLabel: stretchLabel,
          label: (
            <div className={S.extraOptionWrapper}>
              <IconComponent
                icon={
                  prop === "width" && isDeepContentLayoutChild
                    ? WidthStandardStretchIcon
                    : StretchIcon
                }
                style={{
                  transform: prop === "height" ? "rotate(-90deg)" : undefined,
                }}
              />
              {stretchLabel}
            </div>
          ),
        },
        ...(prop === "width" && isDeepContentLayoutChild
          ? [
              {
                value: CONTENT_LAYOUT_WIDE,
                disabled: !isAutoSizable || value === CONTENT_LAYOUT_WIDE,
                cleanLabel: wideLabel,
                label: (
                  <div className={S.extraOptionWrapper}>
                    <IconComponent icon={WidthWideIcon} />
                    {wideLabel}
                  </div>
                ),
              },
              {
                value: CONTENT_LAYOUT_FULL_BLEED,
                disabled: !isAutoSizable || value === CONTENT_LAYOUT_FULL_BLEED,
                cleanLabel: fullBleedLabel,
                label: (
                  <div className={S.extraOptionWrapper}>
                    <IconComponent icon={WidthFullBleedIcon} />
                    {fullBleedLabel}
                  </div>
                ),
              },
            ]
          : []),
        {
          value: "max-content",
          hide: true,
        },
        isTplComponent(tpl)
          ? {
              value: "default",
              label: "Default",
            }
          : undefined,
      ])
    : ([] as any[]);

  const setProp = (val: string | undefined) => {
    spawn(
      sc.changeUnsafe(() => {
        const exp = expsProvider.targetExp();
        if (val == null) {
          exp.clear(prop);
        } else {
          exp.set(prop, val);
          if (isDeepContentLayoutChild && prop === "width" && val === "wrap") {
            // If setting to hug content, then as content layout child,
            // we also need to set justify-self, otherwise by default,
            // the parent will be stretching us
            exp.set("justify-self", "flex-start");
          }
        }
      })
    );
  };

  return (
    <LabeledStyleDimItem
      label={capitalizeFirst(prop)}
      className={S.dimField}
      styleName={prop}
      initialMenuItems={() =>
        new DimManip(
          expsProvider.studioCtx,
          expsProvider.forDom(),
          expsProvider.mergedExp,
          prop
        ).renderConvertMenuItems()
      }
      disabledTooltip={disabledTooltip}
      rightExtras={
        !isDisabled && (
          <div className={S.toggleIcons}>
            {value !== "stretch" && (
              <IconButton
                size="small"
                type="clear"
                tooltip={
                  isDeepContentLayoutChild && prop === "width"
                    ? "Stretch standard"
                    : "Stretch"
                }
                onClick={() => setProp("stretch")}
                className={cn(S.toggleSizingIcon, {
                  [S.toggleSizingIcon__height]: prop === "height",
                })}
              >
                <IconComponent
                  icon={
                    isDeepContentLayoutChild && prop === "width"
                      ? WidthStandardStretchIcon
                      : PlasmicIcon__Stretch
                  }
                />
              </IconButton>
            )}
            {value !== "wrap" && value !== "auto" && (
              <IconButton
                size="small"
                type="clear"
                tooltip={"Hug content"}
                onClick={() => setProp("wrap")}
                className={cn(S.toggleSizingIcon, {
                  [S.toggleSizingIcon__height]: prop === "height",
                })}
              >
                <IconComponent icon={PlasmicIcon__Wrap} />
              </IconButton>
            )}
            {prop === "width" && isDeepContentLayoutChild && !isRoot && (
              <>
                {value !== CONTENT_LAYOUT_WIDE && (
                  <IconButton
                    size="small"
                    type="clear"
                    tooltip={"Stretch wide"}
                    onClick={() => setProp(CONTENT_LAYOUT_WIDE)}
                    className={S.toggleSizingIcon}
                  >
                    <IconComponent icon={WidthWideIcon} />
                  </IconButton>
                )}
                {value !== CONTENT_LAYOUT_FULL_BLEED && (
                  <IconButton
                    size="small"
                    type="clear"
                    tooltip={"Stretch full bleed"}
                    onClick={() => setProp(CONTENT_LAYOUT_FULL_BLEED)}
                    className={S.toggleSizingIcon}
                  >
                    <IconComponent icon={WidthFullBleedIcon} />
                  </IconButton>
                )}
              </>
            )}
          </div>
        )
      }
      dimOpts={{
        disabled: isDisabled || !isResizable,
        extraOptions,
        value: toDisplay(value, stretchLabel, isRoot),
        onChange: (val) => setProp(val),
        min: 0,
        // Cannot specify a root in %
        allowedUnits: isRoot
          ? getLengthUnits("px").filter((x) => x !== "%")
          : getLengthUnits("px"),
        hideArrow: true,
      }}
      tokenType={TokenType.Spacing}
      vsh={vsh}
      isDisabled={isDisabled}
      hideIndicator={isDisabled}
    />
  );
});

const FlexGrowControls = observer(function FlexGrowControls(props: {
  expsProvider: ExpsProvider;
}) {
  const styleComponent = useStyleComponent();

  const { isDisabled } = shouldBeDisabled({
    props: {},
    indicators: styleComponent.definedIndicators("flex-grow", "flex-shrink"),
  });

  const { expsProvider } = props;
  const h = new FlexControlHelper(expsProvider);

  // We always show the flex shrink/grow controls for root or mixin.
  // Else, only auto-positioned flex children
  //
  // TODO: reactivate this after fixing the inference of parent's flex config
  //  https://gerrit.aws.plasmic.app/c/plasmic/+/4694/comment/ed34b3b7_ff78ae90/
  //
  // if (!h.isComponentRoot && !h.isMixin && !h.isAutoInFlexParent()) {
  //   return null;
  // }

  const parentContainerType = h.getParentContainerType();

  const exp = () => expsProvider.mergedExp();

  const getFlexShrinkVal = (prop: "flex-shrink") => {
    if (exp().has(prop)) {
      return exp().get(prop);
    }

    return expsProvider.studioCtx.appCtx.appConfig.usePlasmicImg &&
      expsProvider instanceof TplExpsProvider &&
      isTplImage(expsProvider.tpl)
      ? false
      : true;
  };

  // Now we know we are in a flex parent that is auto-positioned

  const renderSizing = (
    prop: "flex-grow" | "flex-shrink",
    title: string,
    tooltip: string
  ) => {
    const val = prop == "flex-grow" ? exp().get(prop) : getFlexShrinkVal(prop);
    const isNonzero = +val > 0;

    return (
      <LabeledStyleSwitchItem
        tooltip={tooltip}
        label={title}
        styleName={prop}
        value={isNonzero}
        data-plasmic-prop={prop}
        onChange={(checked) => {
          if (isDisabled) {
            return;
          }
          spawn(
            expsProvider.studioCtx.changeUnsafe(() => {
              exp().set(prop, checked ? "1" : "0");
            })
          );
        }}
      />
    );
  };

  return (
    <>
      <FullRow>
        {renderSizing("flex-grow", "Grow", "Grow to fill available space")}
      </FullRow>
      <FullRow>
        {renderSizing("flex-shrink", "Shrink", "Shrink if not enough space")}
      </FullRow>
    </>
  );
});

function toDisplay(val: string, stretchLabel: string, isRoot: boolean) {
  if (val === "wrap") {
    val = "Hug content";
  } else if (val === CONTENT_LAYOUT_FULL_BLEED) {
    val = "Full bleed";
    if (isRoot) {
      val = `Stretch (${val.toLowerCase()})`;
    }
  } else if (val === CONTENT_LAYOUT_WIDE) {
    val = "Wide";
    if (isRoot) {
      val = `Stretch (${val.toLowerCase()})`;
    }
  } else if (val === "stretch") {
    val = stretchLabel;
  }
  return val;
}

function fromDisplay(val: string, stretchLabel: string) {
  if (val === "Hug content") {
    val = "wrap";
  } else if (val === "Full bleed") {
    val = CONTENT_LAYOUT_FULL_BLEED;
  } else if (val === "Wide width") {
    val = CONTENT_LAYOUT_WIDE;
  } else if (val === stretchLabel) {
    val = "stretch";
  }
  return val;
}

export const PageSizePanelSection = observer(
  function PageSizePanelSection(props: { expsProvider: ExpsProvider }) {
    const { expsProvider } = props;
    assert(
      expsProvider instanceof TplExpsProvider,
      "ExpsProvider should be TplExpsProvider"
    );
    const component = expsProvider.viewCtx.currentComponent();
    const arenaFrame = expsProvider.viewCtx.arenaFrame();
    assert(
      isPageComponent(component),
      "Section should only be shown to Page Components"
    );
    const sizeType = getPageFrameSizeType(arenaFrame);
    return (
      <SidebarSection title="Size">
        {
          // Using LabeleditemRow instead of LabeledStyleCheckboxItem
          // because we are carefully managing the height style, unlike
          // a normal height style prop; we don't want users to be able
          // to unset it, and the usual defined indicators also are
          // not helpful.
        }
        <WithContextMenu
          overlay={() => (
            <Menu>
              {sizeType === "wrap" ? (
                <Menu.Item
                  onClick={() =>
                    expsProvider.studioCtx.changeUnsafe(() => {
                      setPageSizeType(component, "stretch");
                    })
                  }
                >
                  Let page height fill the browser window
                </Menu.Item>
              ) : (
                <Menu.Item
                  onClick={() =>
                    expsProvider.studioCtx.changeUnsafe(() => {
                      setPageSizeType(component, "wrap");
                    })
                  }
                >
                  Let page height hug content instead
                </Menu.Item>
              )}
            </Menu>
          )}
        >
          <div>
            {sizeType === "wrap"
              ? "Page height hugs page content"
              : "Page height fills up the browser window"}
          </div>
        </WithContextMenu>
        {sizeType !== "wrap" && (
          <LabeledItemRow>
            <StyleCheckbox
              isChecked={sizeType === "fixed"}
              onChange={(val) =>
                expsProvider.studioCtx.changeUnsafe(() => {
                  setPageSizeType(component, val ? "fixed" : "stretch");
                })
              }
              valueSetState={sizeType === "fixed" ? "isSet" : undefined}
              tooltip={
                <>
                  If your page has scrollable containers inside, you can fix the
                  page height to the window height, so that the window does not
                  scroll.
                </>
              }
            >
              Fix page height to window height
            </StyleCheckbox>
          </LabeledItemRow>
        )}
      </SidebarSection>
    );
  }
);

export const StretchyComponentSizePanelSection = observer(
  function StretchyComponentSizePanelSection(props: {
    expsProvider: ExpsProvider;
  }) {
    const { expsProvider } = props;
    assert(
      expsProvider instanceof TplExpsProvider,
      "ExpsProvider should be TplExpsProvider"
    );

    return (
      <SidebarSection title="Size">
        <div>Stretchy components take up the entire artboard.</div>
        <FullRow>
          <SizeControl
            prop="width"
            expsProvider={props.expsProvider}
            isDisabled={true}
            disabledTooltip={"Cannot modify width in stretch view mode"}
          />
        </FullRow>
        <FullRow>
          <SizeControl prop="height" expsProvider={props.expsProvider} />
        </FullRow>
      </SidebarSection>
    );
  }
);

function isSvg(expsProvider: ExpsProvider) {
  const tpl =
    expsProvider instanceof TplExpsProvider ? expsProvider.tpl : undefined;
  let isSvgSrc = false;
  if (tpl) {
    const vtm = (expsProvider as TplExpsProvider).viewCtx.variantTplMgr();
    const effectiveVs = vtm.effectiveTargetVariantSetting(tpl);

    const expr = effectiveVs.attrs["src"];
    if (isKnownImageAssetRef(expr) && expr.asset.dataUri) {
      const parsed = parseDataUrl(expr.asset.dataUri);
      isSvgSrc =
        expr.asset.dataUri.search(/\.svg/) !== -1 ||
        (parsed && parsed.mediaType === SVG_MEDIA_TYPE);
    }
  }
  return isSvgSrc;
}

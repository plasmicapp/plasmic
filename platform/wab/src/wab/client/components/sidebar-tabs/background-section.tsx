import { EllipseControl } from "@/wab/client/components/EllipseControl";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  FullRow,
  LabeledItem,
  LabeledItemRow,
  shouldBeDisabled,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { AngleDial } from "@/wab/client/components/style-controls/AngleDial";
import { ColorStops } from "@/wab/client/components/style-controls/ColorStops";
import { ImageAssetPreviewAndPicker } from "@/wab/client/components/style-controls/ImageSelector";
import { PosControls2 } from "@/wab/client/components/style-controls/PosControls";
import {
  ExpsProvider,
  StylePanelSection,
  TabbedStylePanelSection,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import { StyleWrapper } from "@/wab/client/components/style-controls/StyleWrapper";
import { UnloggedDragCatcher } from "@/wab/client/components/style-controls/UnloggedDragCatcher";
import * as widgets from "@/wab/client/components/widgets";
import { ColorPicker } from "@/wab/client/components/widgets/ColorPicker";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import ContainIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Contain";
import CoverIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Cover";
import ImageBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageBlock";
import LinearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Linear";
import RadialIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Radial";
import RepeatGridIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__RepeatGrid";
import RepeatHIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__RepeatH";
import PaintBucketFillIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__PaintBucketFill";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import {
  isTokenRef,
  replaceAllTokenRefs,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { arrayMoveIndex } from "@/wab/shared/collections";
import {
  assert,
  ensure,
  maybe,
  removeAt,
  spawn,
  switchType,
  unexpected,
  uniqueKey,
} from "@/wab/shared/common";
import {
  BackgroundLayer,
  ColorFill,
  ImageBackground,
  LinearGradient,
  NoneBackground,
  RadialGradient,
  Stop,
  bgClipTextTag,
  mkBackgroundLayer,
} from "@/wab/shared/core/bg-styles";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import {
  mkImageAssetRef,
  tryParseImageAssetRef,
} from "@/wab/shared/core/image-assets";
import {
  TokenValueResolver,
  siteFinalColorTokens,
  siteFinalStyleTokensAllDeps,
} from "@/wab/shared/core/site-style-tokens";
import { allMixins } from "@/wab/shared/core/sites";
import { CssVarResolver } from "@/wab/shared/core/styles";
import * as css from "@/wab/shared/css";
import { parseCss } from "@/wab/shared/css";
import {
  LENGTH_PERCENTAGE_UNITS,
  PERCENTAGE_UNITS,
} from "@/wab/shared/css/types";
import { isStandardSide, oppSides } from "@/wab/shared/geom";
import { Site, isKnownImageAsset } from "@/wab/shared/model/classes";
import { userImgUrl } from "@/wab/shared/urls";
import Chroma from "@/wab/shared/utils/color-utils";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import { basename } from "path";
import React, { useState } from "react";

export const resolvedBackgroundImageCss = (
  bgImg: BackgroundLayer["image"],
  clientTokenResolver: TokenValueResolver,
  site: Site,
  vsh?: VariantedStylesHelper
) => {
  let cssValue = bgImg.showCss();

  // First try resolving with client token resolver.
  // Client token resolver is needed for registered style tokens that have a selector.
  cssValue = replaceAllTokenRefs(cssValue, (tokenId) => {
    const token = siteFinalColorTokens(site, {
      includeDeps: "all",
    }).find((t) => t.uuid === tokenId);
    if (token) {
      return clientTokenResolver(token, vsh);
    } else {
      return undefined;
    }
  });

  const resolver = new CssVarResolver(
    siteFinalStyleTokensAllDeps(site),
    allMixins(site, { includeDeps: "all" }),
    site.imageAssets,
    site.activeTheme,
    {},
    vsh
  );
  return resolver.resolveTokenRefs(cssValue);
};

function mkEmptyLayer() {
  return new BackgroundLayer({ image: new NoneBackground() });
}

interface BackgroundProps {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
  animatableOnly?: boolean;
}

export const BackgroundSection = observer(function BackgroundSection(
  props: BackgroundProps
) {
  const { expsProvider, animatableOnly } = props;
  const { studioCtx } = expsProvider;
  const exp = expsProvider.mergedExp();
  const bg = parseCss(exp.getRaw("background") ?? "", {
    startRule: "background",
  });
  bg.filterNoneLayers(); // Case of `background: none`

  const [inspected, setInspected] = useState<number>();
  const sc = useStyleComponent();
  const clientTokenResolver = useClientTokenResolver();

  const vsh = props.vsh ?? makeVariantedStylesHelperFromCurrentCtx(studioCtx);

  const updateLayers = () => {
    assert(
      bg.layers.every((l) => !l.preferBackgroundColorOverColorFill),
      "No background layer can have a preferBackgroundColorOverColorFill"
    );
    spawn(
      studioCtx.changeUnsafe(() => {
        if (bg.layers.length > 0) {
          exp.set("background", bg.showCss());
        } else {
          // Create an empty layer as we might inherit from other variant
          // or mixin.
          exp.set("background", mkEmptyLayer().showCss());
        }
      })
    );
  };

  const moveLayer = (fromIndex: number, toIndex: number) => {
    bg.layers = arrayMoveIndex(bg.layers, fromIndex, toIndex);
    updateLayers();
  };

  const removeLayer = (index: number) => {
    removeAt(bg.layers, index);
    updateLayers();
  };

  const inspectedLayer = maybe(inspected, (i) => bg.layers[i]);

  const addBackgroundLayer = (type: "image" | "linear" | "radial" | "fill") => {
    const layer = mkBackgroundLayer(
      parseCss(defaultValuesByBgType[type], {
        startRule: "backgroundImage",
      }),
      type === "image"
        ? {
            size: "cover",
            position: css.showBgPos({
              top: "50%",
              left: "50%",
            }),
          }
        : undefined
    );
    bg.layers.unshift(layer);
    updateLayers();
    setInspected(0);
  };

  const { isDisabled } = shouldBeDisabled({
    props: {},
    indicators: sc.definedIndicators("background"),
  });

  const isSet = bg.layers.length > 0;

  return (
    <StylePanelSection
      key={String(isSet)}
      expsProvider={expsProvider}
      title={"Backgrounds"}
      styleProps={["background"]}
      controls={
        <>
          <IconButton
            tooltip="Add background color"
            onClick={() => addBackgroundLayer("fill")}
            disabled={isDisabled}
          >
            <Icon icon={PaintBucketFillIcon} />
          </IconButton>
          {!animatableOnly && (
            <>
              <IconButton
                tooltip="Add background image"
                onClick={() => addBackgroundLayer("image")}
                disabled={isDisabled}
              >
                <Icon icon={ImageBlockIcon} />
              </IconButton>
              <IconButton
                tooltip="Add linear gradient background"
                onClick={() => addBackgroundLayer("linear")}
                disabled={isDisabled}
              >
                <Icon icon={LinearIcon} />
              </IconButton>
              <IconButton
                tooltip="Add radial gradient background"
                onClick={() => addBackgroundLayer("radial")}
                disabled={isDisabled}
              >
                <Icon icon={RadialIcon} />
              </IconButton>
            </>
          )}
        </>
      }
    >
      {isSet && (
        <div>
          <SidebarModal
            show={!!inspectedLayer}
            onClose={() => setInspected(undefined)}
          >
            {inspected != null && inspectedLayer && (
              <BackgroundLayerPanel
                layer={inspectedLayer}
                expsProvider={expsProvider}
                onUpdated={(layer) => {
                  bg.layers[inspected] = layer;
                  updateLayers();
                }}
                vsh={vsh}
                animatableOnly={animatableOnly}
              />
            )}
          </SidebarModal>
          <>
            <StyleWrapper
              styleName={["background"]}
              displayStyleName="background"
              showDefinedIndicator={false}
              className="flex-fill"
            >
              <widgets.ListBox
                {...(isDisabled
                  ? {}
                  : {
                      onReorder: (from, to) => moveLayer(from, to),
                    })}
              >
                {bg.layers.map(
                  (layer: BackgroundLayer, index: /*TWZ*/ number) => {
                    const mainContentText = switchType(layer.image)
                      .when(ImageBackground, (img: ImageBackground) => {
                        const asset = tryParseImageAssetRef(
                          img.url,
                          studioCtx.site.imageAssets
                        );
                        if (asset) {
                          return asset.name;
                        } else if (img.url.startsWith("data:")) {
                          return "Uploaded file";
                        } else {
                          return basename(img.url);
                        }
                      })
                      .when(ColorFill, (fill: ColorFill) =>
                        isTokenRef(fill.color)
                          ? tryParseTokenRef(
                              fill.color,
                              siteFinalColorTokens(studioCtx.site, {
                                includeDeps: "all",
                              })
                            )?.name || "Color token"
                          : Chroma.stringify(fill.color)
                      )
                      .when(LinearGradient, () => "Linear gradient")
                      .when(RadialGradient, () => "Radial gradient")
                      .when(NoneBackground, () => "Invalid layer")
                      .result();
                    return (
                      <widgets.ListBoxItem
                        index={index}
                        key={uniqueKey(layer)}
                        {...(isDisabled
                          ? {}
                          : {
                              onClick: () => setInspected(index),
                            })}
                        onRemove={() => removeLayer(index)}
                        thumbnail={
                          <div className={"img-thumb__checkers"}>
                            <div
                              className={"img-thumb img-thumb-border"}
                              style={{
                                backgroundImage: resolvedBackgroundImageCss(
                                  layer.image,
                                  clientTokenResolver,
                                  studioCtx.site,
                                  vsh
                                ),
                              }}
                            />
                          </div>
                        }
                        mainContent={
                          <div className={"bg-layer__label"}>
                            <Tooltip
                              title={mainContentText}
                              mouseEnterDelay={0.5}
                            >
                              {mainContentText}
                            </Tooltip>
                          </div>
                        }
                        gridThumbnail
                      />
                    );
                  }
                )}
              </widgets.ListBox>
            </StyleWrapper>
          </>
        </div>
      )}
    </StylePanelSection>
  );
});

interface BackgroundLayerPanelProps {
  layer: BackgroundLayer;
  expsProvider: ExpsProvider;
  onUpdated: (layer: BackgroundLayer) => void;
  vsh: VariantedStylesHelper;
  animatableOnly?: boolean;
}

const BackgroundLayerPanel = observer(function BackgroundLayerPanel({
  expsProvider,
  layer,
  onUpdated,
  vsh,
  animatableOnly,
}: BackgroundLayerPanelProps) {
  const { studioCtx } = expsProvider;
  const [cachedValuesByBgType] = React.useState({});

  /**
   * General-purpose dumping ground for cached values.  E.g. when user sets a
   * custom size, switches away, then switches back - we want to restore the
   * custom size they had set.
   */
  const [cachedValues] = React.useState({});

  const updateImg = (
    img: ImageBackground | ColorFill | LinearGradient | RadialGradient,
    f: () => void
  ) => {
    f();
    layer.image = img;
    onUpdated(layer);
  };

  const modelType = switchType(layer.image)
    .when(ImageBackground, () => "image")
    .when(ColorFill, () => "fill")
    .when(LinearGradient, () => "linear")
    .when(RadialGradient, () => "radial")
    .when(NoneBackground, () => "none")
    .result();

  cachedValuesByBgType[modelType] = layer.image.showCss();

  const imageBackgroundPanel = (img: /*TWZ*/ ImageBackground) => {
    // Can only use picture type for background-image
    const imageAssets = studioCtx.site.imageAssets.filter(
      (x) => x.type === ImageAssetType.Picture
    );

    return (
      <SidebarSection title={"Image"}>
        <ImageAssetPreviewAndPicker
          className="flex-fill flex-col"
          value={tryParseImageAssetRef(img.url, imageAssets) || img.url}
          onPicked={(picked) => {
            const newUrl = isKnownImageAsset(picked)
              ? mkImageAssetRef(picked)
              : picked;
            updateImg(new ImageBackground({ url: newUrl }), () => {});
          }}
          type={ImageAssetType.Picture}
          studioCtx={studioCtx}
        />
      </SidebarSection>
    );
  };

  const colorFillPanel = (col: ColorFill) => {
    return (
      <SidebarSection title={"Fill color"}>
        <ColorPicker
          autoFocus
          color={col.color}
          onChange={(color) => {
            if (layer.image instanceof ColorFill) {
              updateImg(col, () => {
                return (col.color = color);
              });
            }
          }}
          vsh={vsh}
        />
      </SidebarSection>
    );
  };

  // TODO does repeating actually have any effect if the color stops are always in %?
  const linearGradientPanel = (lin: LinearGradient) => {
    return (
      <SidebarSection title={"Linear"} key="Linear">
        <LabeledItemRow label={"Angle"}>
          <DimTokenSpinner
            value={`${lin.angle}deg`}
            onChange={(val) => {
              updateImg(lin, () => {
                const { num, units } = ensure(
                  css.parseCssNumericNew(val || "0"),
                  "Must be a valid numeric value"
                );
                lin.angle = num;
              });
            }}
            allowedUnits={["deg"]}
            allowFunctions={false}
          />
          <div
            className={"ml-sm mr-sm overflow-hidden"}
            style={{ marginTop: -10, marginBottom: 0 }}
          >
            <AngleDial
              angle={lin.angle}
              onChange={(val: number) => {
                return updateImg(lin, () => {
                  return (lin.angle = val);
                });
              }}
            />
          </div>
        </LabeledItemRow>

        <ColorStops
          repeating={lin.repeating}
          stops={lin.stops}
          studioCtx={studioCtx}
          onChange={(stops: Stop[]) => {
            return updateImg(lin, () => {
              return (lin.stops = stops);
            });
          }}
          vsh={vsh}
        />
      </SidebarSection>
    );
  };

  const radialGradientPanel = (rad: RadialGradient) => {
    const CustomDimSpinner = ({
      value,
      onChange,
    }: {
      onChange: (val?: string) => any;
      value: string;
    }) => {
      return (
        <DimTokenSpinner
          value={value}
          onChange={onChange}
          allowedUnits={PERCENTAGE_UNITS}
          noClear={true}
          allowFunctions={false}
        />
      );
    };
    return (
      <SidebarSection title={"Radial"} key="Radial">
        <FullRow>
          <div className={"vcenter flex-even"}>
            <UnloggedDragCatcher sc={studioCtx}>
              <EllipseControl
                ellipse={{
                  cx: rad.cx.getNumericValue(),
                  cy: rad.cy.getNumericValue(),
                  rx: rad.rx.getNumericValue(),
                  ry: rad.ry.getNumericValue(),
                }}
                onChange={({ cx, cy, rx, ry }) => {
                  return updateImg(rad, () => {
                    rad.cx.value = `${cx}`;
                    rad.cy.value = `${cy}`;
                    rad.rx.value = `${rx}`;
                    return (rad.ry.value = `${ry}`);
                  });
                }}
              />
            </UnloggedDragCatcher>
          </div>

          <div className={"vcenter flex-even"}>
            <LabeledItemRow label="Left" labelSize="small">
              {CustomDimSpinner({
                value: rad.cx.showCss(),
                onChange: (val) =>
                  updateImg(rad, () => rad.cx.setValue(val || "center")),
              })}
            </LabeledItemRow>
            <LabeledItemRow label="Top" labelSize="small">
              {CustomDimSpinner({
                value: rad.cy.showCss(),
                onChange: (val) =>
                  updateImg(rad, () => rad.cy.setValue(val || "center")),
              })}
            </LabeledItemRow>
            <LabeledItemRow label="Width" labelSize="small">
              {CustomDimSpinner({
                value: rad.rx.showCss(),
                onChange: (val) =>
                  updateImg(rad, () => rad.rx.setValue(val || "")),
              })}
            </LabeledItemRow>
            <LabeledItemRow label="Height" labelSize="small">
              {CustomDimSpinner({
                value: rad.ry.showCss(),
                onChange: (val) =>
                  updateImg(rad, () => rad.ry.setValue(val || "")),
              })}
            </LabeledItemRow>
          </div>
        </FullRow>
        <ColorStops
          repeating={rad.repeating}
          stops={rad.stops}
          studioCtx={studioCtx}
          onChange={(stops) => {
            return updateImg(rad, () => (rad.stops = stops));
          }}
          vsh={vsh}
        />
      </SidebarSection>
    );
  };

  const tabContent = switchType(layer.image)
    .when(ImageBackground, (model: /*TWZ*/ ImageBackground) =>
      imageBackgroundPanel(model)
    )
    .when(ColorFill, (model: /*TWZ*/ ColorFill) => colorFillPanel(model))
    .when(LinearGradient, (model: /*TWZ*/ LinearGradient) =>
      linearGradientPanel(model)
    )
    .when(RadialGradient, (model: /*TWZ*/ RadialGradient) =>
      radialGradientPanel(model)
    )
    .when(NoneBackground, (model) => unexpected())
    .result();

  const change = (f: () => void) => {
    f();
    onUpdated(layer);
  };

  const sizeSection = () => {
    const bgSize = () =>
      ensure(
        css.parseSize(
          layer.size ?? css.getCssInitial("background-size", "div")
        ),
        "Background size must be a valid numeric value"
      );
    const isCustomSize = !["cover", "contain"].includes(layer.size as string);
    return (
      <TabbedStylePanelSection
        key={String(isCustomSize)}
        expsProvider={expsProvider}
        title={"Size"}
        styleProps={[]}
        emptyBody={!isCustomSize}
        onSwitch={(val) =>
          change(() => {
            layer.size = (() => {
              switch (val) {
                case "contain":
                case "cover":
                  return val;
                case "custom":
                  return (
                    cachedValues["background-size"] ??
                    css.getCssInitial("background-size", "div")
                  );
                default:
                  return unexpected();
              }
            })();
          })
        }
        activeKey={(() => {
          const sizeVal = layer.size;
          switch (sizeVal) {
            case "contain":
            case "cover":
              return sizeVal;
            default:
              cachedValues["background-size"] = sizeVal;
              return "custom";
          }
        })()}
        tabs={[
          {
            key: "custom",
            label: "Custom",
            icon: null,
          },
          {
            key: "cover",
            label: "Cover",
            icon: (
              <Tooltip title="Cover">
                <Icon icon={CoverIcon} />
              </Tooltip>
            ),
            iconOnly: true,
          },
          {
            key: "contain",
            label: "Contain",
            icon: <Icon icon={ContainIcon} />,
            iconOnly: true,
          },
        ]}
      >
        {isCustomSize && (
          <div className="panel-block">
            <FullRow twinCols>
              <LabeledItem label="Width" labelSize="small">
                <DimTokenSpinner
                  value={maybe(bgSize(), (x: string[]) => x[0]) || ""}
                  onChange={(val) =>
                    change(() => {
                      layer.size = css.showWidthHeight(
                        val ?? "auto",
                        bgSize()[1]
                      );
                    })
                  }
                  extraOptions={["auto"]}
                  minDropdownWidth={200}
                  hideArrow
                  allowedUnits={LENGTH_PERCENTAGE_UNITS}
                  allowFunctions
                />
              </LabeledItem>
              <LabeledItem label="Height" labelSize="small">
                <DimTokenSpinner
                  value={maybe(bgSize(), (x: string[]) => x[1]) || ""}
                  onChange={(val) =>
                    change(() => {
                      layer.size = css.showWidthHeight(
                        bgSize()[0],
                        val ?? "auto"
                      );
                    })
                  }
                  extraOptions={["auto"]}
                  minDropdownWidth={200}
                  hideArrow
                  allowedUnits={LENGTH_PERCENTAGE_UNITS}
                  allowFunctions
                />
              </LabeledItem>
            </FullRow>
          </div>
        )}
      </TabbedStylePanelSection>
    );
  };

  const positionSection = () => {
    const bgPos = css.parseBgPos(
      layer.position ?? css.getCssInitial("background-position", "div")
    );
    return (
      <SidebarSection title={"Position"}>
        <div className={"panel-block"}>
          <FullRow>
            <PosControls2
              expsProvider={expsProvider}
              posProp={"background"}
              exp={{
                get: (side: string) => bgPos[side] || "auto",
                has: (side: string) => Boolean(layer.position && bgPos[side]),
                set: (side: string, value: string) => {
                  // PosControls2 is a component being used in both positioning and background-positioning
                  // For normal positioning is considering valid to have both sides set to something different than
                  // auto, which makes a change for the height/width to be auto, which is invalid in the context
                  // of background-positioning. So we simply ignore those updates.
                  if (!isStandardSide(side)) {
                    return;
                  }
                  change(() => {
                    bgPos[side] = value;
                    delete bgPos[oppSides[side]];
                    layer.position = css.showBgPos(bgPos);
                  });
                },
              }}
            />
          </FullRow>
        </div>
      </SidebarSection>
    );
  };

  const repeatSection = () => {
    const bgRep = layer.repeat;
    return (
      <SidebarSection
        title="Repeat"
        controls={
          <StyleToggleButtonGroup
            value={bgRep}
            onChange={(val) =>
              change(() => {
                layer.repeat = val;
              })
            }
          >
            <StyleToggleButton value="repeat">
              <Icon icon={RepeatGridIcon} />
            </StyleToggleButton>
            <StyleToggleButton value="repeat-x">
              <Icon icon={RepeatHIcon} />
            </StyleToggleButton>
            <StyleToggleButton value="repeat-y">
              <Icon icon={RepeatHIcon} className="rotated-90" />
            </StyleToggleButton>
            <StyleToggleButton value="no-repeat">
              <Icon icon={CloseIcon} />
            </StyleToggleButton>
          </StyleToggleButtonGroup>
        }
      />
    );
  };

  const miscSection = () => {
    return (
      <SidebarSection>
        <LabeledItemRow label={"Clipping"}>
          <StyleSelect
            value={
              (layer.clip === bgClipTextTag ? "text" : layer.clip) ||
              css.getCssInitial("background-clip", "div")
            }
            onChange={(val) => change(() => (layer.clip = val ?? undefined))}
            valueSetState={layer.clip ? "isSet" : "isUnset"}
          >
            <StyleSelect.Option value="border-box">
              Within border (default)
            </StyleSelect.Option>
            <StyleSelect.Option value="padding-box">
              Within padding
            </StyleSelect.Option>
            <StyleSelect.Option value="content-box">
              Within content
            </StyleSelect.Option>
            <StyleSelect.Option value="text">Clip to text</StyleSelect.Option>
          </StyleSelect>
        </LabeledItemRow>

        <LabeledItemRow label={"Scrolling"}>
          <StyleSelect
            value={
              layer.attachment ||
              css.getCssInitial("background-attachment", "div")
            }
            onChange={(val) =>
              change(() => (layer.attachment = val ?? undefined))
            }
            valueSetState={layer.attachment ? "isSet" : "isUnset"}
          >
            <StyleSelect.Option value="scroll">
              Scroll with page (default)
            </StyleSelect.Option>
            <StyleSelect.Option value="fixed">Fixed to page</StyleSelect.Option>
            <StyleSelect.Option value="local">
              Scroll with content
            </StyleSelect.Option>
          </StyleSelect>
        </LabeledItemRow>

        <LabeledItemRow label={"Origin"}>
          <StyleSelect
            value={
              layer.origin || css.getCssInitial("background-origin", "div")
            }
            onChange={(val) => change(() => (layer.origin = val ?? undefined))}
            valueSetState={layer.origin ? "isSet" : "isUnset"}
          >
            <StyleSelect.Option value="padding-box">
              Within padding (default)
            </StyleSelect.Option>
            <StyleSelect.Option value="border-box">
              Within border
            </StyleSelect.Option>
            <StyleSelect.Option value="content-box">
              Within content
            </StyleSelect.Option>
          </StyleSelect>
        </LabeledItemRow>
      </SidebarSection>
    );
  };

  return (
    <div>
      {!animatableOnly && (
        <FullRow className="panel-content">
          <StyleToggleButtonGroup
            value={modelType}
            onChange={(bgType) => {
              updateImg(
                ensure(
                  parseCss(
                    cachedValuesByBgType[
                      ensure(bgType, "Must not be undefined")
                    ] ??
                      defaultValuesByBgType[
                        ensure(bgType, "Must not be undefined")
                      ],
                    { startRule: "backgroundImage" }
                  ),
                  "backgroundImage shouldn't be null"
                ),
                () => {}
              );
            }}
          >
            <StyleToggleButton className="flex-fill" value="fill">
              <Icon icon={PaintBucketFillIcon} />
            </StyleToggleButton>
            <StyleToggleButton className="flex-fill" value="image">
              <Icon icon={ImageBlockIcon} />
            </StyleToggleButton>
            <StyleToggleButton className="flex-fill" value="linear">
              <Icon icon={LinearIcon} />
            </StyleToggleButton>
            <StyleToggleButton className="flex-fill" value="radial">
              <Icon icon={RadialIcon} />
            </StyleToggleButton>
          </StyleToggleButtonGroup>
        </FullRow>
      )}
      {tabContent}
      {modelType !== "fill" && (
        <>
          {sizeSection()}
          {positionSection()}
          {repeatSection()}
          {miscSection()}
        </>
      )}
    </div>
  );
});

const defaultValuesByBgType = {
  image: `url("${userImgUrl()}")`,
  linear: "linear-gradient(0deg, #CE9FFF 0%, #56B9FF 100%)",
  radial:
    "radial-gradient(ellipse 40% 60% at 20% 20%, #CE9FFF 0%, #56B9FF 100%)",
  fill: `linear-gradient(#ffffff, #ffffff)`,
};

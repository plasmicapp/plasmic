import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import {
  ImageAssetOpts,
  maybeUploadImage,
  readAndSanitizeSvgXmlAsImage,
  ResizableImage,
} from "@/wab/client/dom-utils";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  isWIBaseVariantSettings,
  WIAnimationSequence,
  WIElement,
  WIScreenVariant,
  WIStyleVariant,
  WIVariant,
} from "@/wab/client/web-importer/types";
import { unwrap } from "@/wab/commons/failable-utils";
import { toVarName } from "@/wab/shared/codegen/util";
import { assertNever, mkShortId, withoutNils } from "@/wab/shared/common";
import { code } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { getTagAttrForImageAsset } from "@/wab/shared/core/image-assets";
import { getResponsiveStrategy } from "@/wab/shared/core/sites";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { TplTagType } from "@/wab/shared/core/tpls";
import { camelCssPropsToKebab } from "@/wab/shared/css";
import {
  AnimationProperty,
  CssAnimation,
  isAnimationProperty,
  parseCssAnimationsFromStyles,
} from "@/wab/shared/css/animations";
import {
  Animation,
  AnimationSequence,
  ImageAssetRef,
  isKnownTplTag,
  KeyFrame,
  RawText,
  Site,
  TplNode,
  TplTag,
} from "@/wab/shared/model/classes";
import { ResponsiveStrategy } from "@/wab/shared/responsiveness";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import {
  ensureVariantSetting,
  getBaseVariant,
  getOrderedScreenVariantSpecs,
  getPrivateStyleVariantsForTag,
  VariantCombo,
  VariantGroupType,
} from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import L from "lodash";

const WI_IMPORTER_HEADER = "__wab_plasmic_wi_importer;";

export async function pasteFromWebImporter(
  text,
  pasteArgs: PasteArgs
): Promise<PasteResult> {
  if (!text.startsWith(WI_IMPORTER_HEADER)) {
    return {
      handled: false,
    };
  }

  const wiTree = JSON.parse(
    text.substring(WI_IMPORTER_HEADER.length)
  ) as WIElement;

  return processWebImporterTree(wiTree, [], pasteArgs);
}

export async function processWebImporterTree(
  wiTree: WIElement,
  animationSequences: WIAnimationSequence[],
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);
  const tplMgr = viewCtx.tplMgr();
  const vtm = viewCtx.variantTplMgr();
  const result = await wiTreeToTpl(wiTree, viewCtx, vtm);
  if (!result) {
    return { handled: false };
  }

  const { tpl, tplImageAssetMap, tplVariantSettingsData } = result;

  return {
    handled: true,
    success: unwrap(
      await studioCtx.change(({ success }) => {
        // Process Animation Sequences (keyframes)
        wiAnimationSequenceToSiteAnimationSequence(animationSequences, {
          site: studioCtx.site,
        });

        // Process tpl tree
        const owningComponent = viewCtx.currentTplComponent().component;

        // Process all variant settings data to apply styles
        for (const [tplNode, vsData] of tplVariantSettingsData.entries()) {
          for (const vs of vsData) {
            const { variantCombo, safeStyles, unsafeStyles, wiAnimations } = vs;

            const animations = wiAnimations
              ? wiAnimationsToSiteAnimations(
                  wiAnimations,
                  { site: studioCtx }.site
                )
              : null;

            // Process style variants by creating private style variants
            const processedVariantCombo = withoutNils(
              variantCombo.map((wiVariant) => {
                switch (wiVariant.type) {
                  case "base": {
                    return getBaseVariant(owningComponent);
                  }
                  case VariantGroupType.GlobalScreen: {
                    return findMatchingScreenVariant(viewCtx.site, wiVariant);
                  }
                  case "style": {
                    // Currently, in HTML parser, we support for private style variants that only works on TplTag i.e
                    // Element states doesn't apply on TplComponent and TplSlot.
                    if (!isKnownTplTag(tplNode)) {
                      return null;
                    }

                    const selectors = wiVariant.selectors.map((s) => `:${s}`);
                    const existingPrivateStyleVariant =
                      getPrivateStyleVariantsForTag(
                        owningComponent,
                        tplNode,
                        selectors
                      )[0];

                    return (
                      existingPrivateStyleVariant ||
                      tplMgr.createPrivateStyleVariant(
                        owningComponent,
                        tplNode,
                        selectors
                      )
                    );
                  }
                }
              })
            );

            applyVariantStyles(
              vtm,
              tplNode,
              processedVariantCombo,
              safeStyles,
              unsafeStyles,
              animations
            );
          }
        }

        // if we have any image/svg tpls we need to create their respective assets and update their attrs accordingly
        for (const [assetTpl, assetData] of tplImageAssetMap) {
          const { asset } = studioCtx
            .siteOps()
            .createImageAsset(assetData.image, assetData.options);

          const vs = ensureVariantSetting(assetTpl, []);
          const assetAttrs = L.assign({
            [getTagAttrForImageAsset(asset.type as ImageAssetType)]:
              new ImageAssetRef({ asset }),
          });
          L.merge(vs.attrs, assetAttrs);
        }

        return success(
          viewCtx.viewOps.pasteNode(
            tpl,
            cursorClientPt,
            undefined,
            insertRelLoc
          )
        );
      })
    ),
  };
}

type TplVariantSettingsData = {
  variantCombo: WIVariant[];
  safeStyles: Record<string, string>;
  unsafeStyles: Record<string, string>;
  wiAnimations: CssAnimation[] | null;
};

function applyVariantStyles(
  vtm: VariantTplMgr,
  tpl: TplNode,
  variantCombo: VariantCombo,
  safeStyles: Record<string, string>,
  unsafeStyles: Record<string, string>,
  animations: Animation[] | null
) {
  const vs = vtm.ensureVariantSetting(tpl, variantCombo);
  RSH(vs.rs, tpl).merge(safeStyles);

  if (Object.keys(unsafeStyles).length > 0) {
    vs.attrs["style"] = code(JSON.stringify(unsafeStyles));
  }

  vs.rs.animations = animations;
}

function findMatchingScreenVariant(
  site: Site,
  screenVariantInCombo: WIScreenVariant
) {
  const activeScreenGroup = site.activeScreenVariantGroup;
  const orderedScreenVariants = activeScreenGroup
    ? getOrderedScreenVariantSpecs(site, activeScreenGroup)
    : [];

  for (const orderScreenVariant of orderedScreenVariants) {
    const { variant: screenVariant, screenSpec } = orderScreenVariant;
    if (!screenVariant.mediaQuery) {
      continue;
    }

    const strategy = getResponsiveStrategy(site);
    const screenWidthToMatch =
      strategy === ResponsiveStrategy.mobileFirst
        ? screenSpec.minWidth
        : screenSpec.maxWidth;

    if (
      screenWidthToMatch &&
      screenWidthToMatch === screenVariantInCombo.width
    ) {
      return screenVariant;
    }
  }
  return null;
}

async function wiTreeToTpl(wiTree: WIElement, vc: ViewCtx, vtm: VariantTplMgr) {
  const site = vc.studioCtx.site;
  const tplImageAssetMap = new Map<
    TplTag,
    {
      image: ResizableImage;
      options: ImageAssetOpts;
    }
  >();
  const tplVariantSettingsData = new Map<TplNode, TplVariantSettingsData[]>();

  function collectWIVariantData(node: WIElement, tpl: TplNode) {
    const defaultStyles: Record<string, string> =
      node.type === "text"
        ? {}
        : {
            display: "flex",
            flexDirection: "column",
          };

    if (node.type === "svg") {
      defaultStyles["width"] = node.width;
      defaultStyles["height"] = node.height;
      if (node.fillColor) {
        defaultStyles["color"] = node.fillColor;
      }
    }

    // Find base variant settings
    const baseVariantSetting = node.variantSettings.find(
      isWIBaseVariantSettings
    );

    const baseStyles = {
      ...defaultStyles,
      ...(baseVariantSetting?.safeStyles || {}),
    };
    const {
      animationStyles: baseAnimationStyles,
      remainingStyles: safeBaseStyles,
    } = splitStylesByAnimations(baseStyles);
    const baseAnimations = parseCssAnimationsFromStyles(baseAnimationStyles);

    const unsafeBaseStyles = {
      ...(baseVariantSetting?.unsafeStyles || {}),
    };

    // Initialize variant settings data for this TPL
    const tplVariantSettings: TplVariantSettingsData[] = [];
    // Add base variant
    tplVariantSettings.push({
      variantCombo: [{ type: "base" }],
      safeStyles: safeBaseStyles,
      unsafeStyles: unsafeBaseStyles,
      wiAnimations: baseAnimations,
    });

    // Process non-base variants
    for (const variantSetting of node.variantSettings) {
      // Skip base variant (already processed)
      if (isWIBaseVariantSettings(variantSetting)) {
        continue;
      }

      const { animationStyles, remainingStyles: vsSafeStyles } =
        splitStylesByAnimations(variantSetting.safeStyles);
      const animations = parseCssAnimationsFromStyles(animationStyles);

      const tplVSData: TplVariantSettingsData = {
        variantCombo: [],
        safeStyles: vsSafeStyles,
        unsafeStyles: { ...unsafeBaseStyles, ...variantSetting.unsafeStyles },
        wiAnimations: animations,
      };

      // Find screen and style variants in combo
      const screenVariantInCombo = variantSetting.variantCombo.find(
        (v) => v.type === VariantGroupType.GlobalScreen
      ) as WIScreenVariant | undefined;

      if (screenVariantInCombo) {
        const matchingScreenVariant = findMatchingScreenVariant(
          site,
          screenVariantInCombo
        );
        if (matchingScreenVariant) {
          tplVSData.variantCombo.push(screenVariantInCombo);
        }
      }

      const styleVariantInCombo = variantSetting.variantCombo.find(
        (v) => v.type === "style"
      ) as WIStyleVariant | undefined;

      if (styleVariantInCombo) {
        tplVSData.variantCombo.push(styleVariantInCombo);
      }

      // Make sure we have at-least one valid variant.
      if (tplVSData.variantCombo.length > 0) {
        tplVariantSettings.push(tplVSData);
      }
    }

    tplVariantSettingsData.set(tpl, tplVariantSettings);
  }

  async function rec(node: WIElement) {
    if (node.type === "text") {
      const tpl = vtm.mkTplTagX(node.tag, {
        type: TplTagType.Text,
      });
      const vs = vtm.ensureBaseVariantSetting(tpl);
      vs.text = new RawText({
        markers: [],
        text: node.text,
      });
      collectWIVariantData(node, tpl);
      return tpl;
    }

    if (node.type === "svg") {
      const svgImage = await readAndSanitizeSvgXmlAsImage(
        vc.appCtx,
        node.outerHtml
      );

      if (svgImage) {
        const { imageResult, opts } = await maybeUploadImage(
          vc.appCtx,
          svgImage,
          undefined,
          undefined
        );
        if (!imageResult || !opts) {
          return null;
        }

        const tpl = vc.variantTplMgr().mkTplImage({
          type: opts.type,
          iconColor: opts.iconColor,
        });
        collectWIVariantData(node, tpl);

        // We will store each image to it's corresponding tpl so we can process it
        // later to upload image and attach asset to this tpl in 'processWebImporterTree',
        // We cannot do that here because this function is expected to be called outside 'studioCtx.change' and
        // creating an asset here would cause a model change to occur.
        tplImageAssetMap.set(tpl, {
          image: imageResult,
          options: opts,
        });

        return tpl;
      }
      return null;
    }

    if (node.type === "component") {
      const component = site.components.find((c) => c.name === node.component);
      if (component) {
        const tplComponent = vtm.mkTplComponentX({
          component,
        });
        collectWIVariantData(node, tplComponent);
        return tplComponent;
      }
      return null;
    }

    if (node.tag === "img") {
      const getSrc = () => {
        if (node.attrs.srcset) {
          const options = node.attrs.srcset.split("\n");
          const src = options[options.length - 1].split(" ")[0];
          return src;
        }
        return node.attrs.src;
      };

      const tpl = vtm.mkTplImage({
        attrs: {
          src: code(JSON.stringify(getSrc())),
        },
        type: ImageAssetType.Picture,
      });
      collectWIVariantData(node, tpl);
      return tpl;
    }

    if (node.type === "container") {
      const tpl = vtm.mkTplTagX(
        node.tag,
        {
          name: node.attrs["__name"],
          type: TplTagType.Other,
        },
        withoutNils(
          await Promise.all(
            node.children.map(async (child) => await rec(child))
          )
        )
      );

      collectWIVariantData(node, tpl);

      return tpl;
    }

    assertNever(node);
  }

  const tpl = await rec(wiTree);

  if (!tpl) {
    return null;
  }

  return {
    tpl,
    tplImageAssetMap,
    tplVariantSettingsData,
  };
}

function wiAnimationSequenceToSiteAnimationSequence(
  animationSequences: WIAnimationSequence[],
  opts: { site: Site }
) {
  const { site } = opts;

  for (const sequence of animationSequences) {
    const sequenceVarName = toVarName(sequence.name);

    const existingSequence = site.animationSequences.find(
      (existing) => toVarName(existing.name) === sequenceVarName
    );

    // We will skip creating any existing sequence so that it doesn't pollute the list of animation sequences
    // when user paste the same html multiple times.
    if (existingSequence) {
      continue;
    }

    const keyframes = sequence.keyframes.map((wiKeyframe) => {
      return new KeyFrame({
        percentage: wiKeyframe.percentage,
        // We will only utilize the safe styles here. We need to think about the unsafe styles since we don't have any
        // better way to display them in MixinControls/AnimationSequenceControls. We can have a new custom style attribute section
        // to store unsafe styles or arbitrary css. Since it doesn't exist yet.
        rs: mkRuleSet({ values: camelCssPropsToKebab(wiKeyframe.safeStyles) }),
      });
    });

    const newSequence = new AnimationSequence({
      name: sequence.name,
      uuid: mkShortId(),
      keyframes,
    });

    site.animationSequences.push(newSequence);
  }
}

function wiAnimationsToSiteAnimations(
  wiAnimations: CssAnimation[],
  opts: { site: Site }
) {
  const { site } = opts;
  const animations: Animation[] = [];

  for (const wiAnim of wiAnimations) {
    const animationSequence = site.animationSequences.find(
      (seq) => toVarName(seq.name) === toVarName(wiAnim.name)
    );

    if (!animationSequence) {
      continue;
    }

    animations.push(
      new Animation({
        sequence: animationSequence,
        timingFunction: wiAnim.timingFunction,
        duration: wiAnim.duration,
        delay: wiAnim.delay,
        iterationCount: wiAnim.iterationCount,
        direction: wiAnim.direction,
        fillMode: wiAnim.fillMode,
        playState: wiAnim.playState,
      })
    );
  }
  return animations;
}

function splitStylesByAnimations(styles: Record<string, string>): {
  animationStyles: Record<AnimationProperty, string>;
  remainingStyles: Record<string, string>;
} {
  const remainingStyles: Record<string, string> = {};
  const animationStyles: Record<string, string> = {};

  // Separate animation properties from other styles
  for (const [key, value] of Object.entries(styles)) {
    if (isAnimationProperty(key)) {
      animationStyles[key] = value;
    } else {
      remainingStyles[key] = value;
    }
  }

  return { animationStyles, remainingStyles };
}

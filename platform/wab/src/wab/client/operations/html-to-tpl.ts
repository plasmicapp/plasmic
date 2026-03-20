import { AppCtx } from "@/wab/client/app-ctx";
import {
  ImageAssetOpts,
  maybeUploadImage,
  readAndSanitizeSvgXmlAsImage,
  ResizableImage,
} from "@/wab/client/dom-utils";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import {
  isWIBaseVariantSettings,
  WIAnimationSequence,
  WIElement,
  WIFragment,
  WIScreenVariant,
  WIStyleVariant,
  WIVariant,
} from "@/wab/client/web-importer/types";
import { paramToVarName, toVarName } from "@/wab/shared/codegen/util";
import { assertNever, mkShortId, withoutNils } from "@/wab/shared/common";
import { code, customCode } from "@/wab/shared/core/exprs";
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
  Component,
  CustomCode,
  ImageAssetRef,
  isKnownTplTag,
  KeyFrame,
  RawText,
  Site,
  TplNode,
  TplTag,
  VariantsRef,
} from "@/wab/shared/model/classes";
import {
  isAnyType,
  isBoolType,
  isNumType,
} from "@/wab/shared/model/model-util";
import { ResponsiveStrategy } from "@/wab/shared/responsiveness";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { isSlot } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  ensureVariantSetting,
  getBaseVariant,
  getOrderedScreenVariantSpecs,
  getPrivateStyleVariantsForTag,
  isStandaloneVariantGroup,
  VariantCombo,
  VariantGroupType,
} from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import L, { isArray, isObject } from "lodash";

export interface HtmlToTplResult {
  /** Tpl nodes ready to be inserted (multiple when root is a WIFragment) */
  tpls: TplNode[];
  /**
   * Finalize deferred changes that must happen inside studioCtx.change():
   * animation sequences, variant styles, and image asset attachment.
   */
  finalize: (opts: { component: Component; tplMgr: TplMgr }) => void;
}

/**
 * Convert an HTML string into a TplNode tree with all styles applied.
 *
 * @param html - The HTML string to convert.
 * @param opts - Site, VariantTplMgr, and AppCtx needed for conversion.
 * @returns `{ tpls, finalize }` where:
 *   - `tpls` is an array of fully built TplNode trees (multiple when root is a fragment).
 *   - `finalize(opts)` must be called inside `studioCtx.change()` to apply
 *     animation sequences, variant styles, and image assets to the Site.
 */
export async function htmlToTpl(
  html: string,
  opts: {
    site: Site;
    vtm: VariantTplMgr;
    appCtx: AppCtx;
  }
): Promise<HtmlToTplResult | null> {
  const { site, vtm, appCtx } = opts;

  const { wiTree, animationSequences } = await parseHtmlToWebImporterTree(
    html,
    site
  );

  if (!wiTree) {
    return null;
  }

  const result = await wiTreeToTpl(wiTree, { site, vtm, appCtx });
  if (!result) {
    return null;
  }

  const { tpls, tplImageAssetMap, tplVariantSettingsData } = result;

  return {
    tpls,
    finalize: (finalizeOpts) => {
      // Process Animation Sequences (keyframes)
      wiAnimationSequenceToSiteAnimationSequence(animationSequences, {
        site,
      });

      const owningComponent = finalizeOpts.component;

      // Process all variant settings data to apply styles
      for (const [tplNode, vsData] of tplVariantSettingsData.entries()) {
        for (const vs of vsData) {
          const { variantCombo, safeStyles, unsafeStyles, wiAnimations } = vs;

          const animations = wiAnimations
            ? wiAnimationsToSiteAnimations(wiAnimations, { site })
            : null;

          // Process style variants by creating private style variants
          const processedVariantCombo = withoutNils(
            variantCombo.map((wiVariant) => {
              switch (wiVariant.type) {
                case "base": {
                  return getBaseVariant(owningComponent);
                }
                case VariantGroupType.GlobalScreen: {
                  return findMatchingScreenVariant(site, wiVariant);
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
                    finalizeOpts.tplMgr.createPrivateStyleVariant(
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
        const { asset } = finalizeOpts.tplMgr.getOrCreateImageAsset(
          assetData.image,
          assetData.options
        );

        const vs = ensureVariantSetting(assetTpl, []);
        const assetAttrs = L.assign({
          [getTagAttrForImageAsset(asset.type as ImageAssetType)]:
            new ImageAssetRef({ asset }),
        });
        L.merge(vs.attrs, assetAttrs);
      }
    },
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

async function wiTreeToTpl(
  wiTree: WIElement,
  opts: { site: Site; vtm: VariantTplMgr; appCtx: AppCtx }
) {
  const { site, vtm, appCtx } = opts;
  const tplImageAssetMap = new Map<
    TplTag,
    {
      image: ResizableImage;
      options: ImageAssetOpts;
    }
  >();
  const tplVariantSettingsData = new Map<TplNode, TplVariantSettingsData[]>();

  function collectWIVariantData(
    node: Exclude<WIElement, WIFragment>,
    tpl: TplNode
  ) {
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

  async function rec(node: WIElement): Promise<TplNode[]> {
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
      return [tpl];
    }

    if (node.type === "svg") {
      const svgImage = await readAndSanitizeSvgXmlAsImage(
        appCtx,
        node.outerHtml
      );

      if (svgImage) {
        const { imageResult, opts: imageOpts } = await maybeUploadImage(
          appCtx,
          svgImage,
          undefined,
          undefined
        );
        if (!imageResult || !imageOpts) {
          return [];
        }

        const tpl = vtm.mkTplImage({
          type: imageOpts.type,
          iconColor: imageOpts.iconColor,
        });
        collectWIVariantData(node, tpl);

        // We will store each image to it's corresponding tpl so we can process it
        // later to upload image and attach asset to this tpl in 'processWebImporterTree',
        // We cannot do that here because this function is expected to be called outside 'studioCtx.change' and
        // creating an asset here would cause a model change to occur.
        tplImageAssetMap.set(tpl, {
          image: imageResult,
          options: imageOpts,
        });

        return [tpl];
      }
      return [];
    }

    if (node.type === "component") {
      const componentName = node.component;
      const component = site.components.find((c) => c.name === componentName);
      if (!component) {
        throw new Error(`Component not found with name ${componentName}`);
      }

      // Build args from props and slots
      const args: Record<string, any> = {};

      if (node.props) {
        for (const [propName, propValue] of Object.entries(node.props)) {
          const componentArg = getComponentArgFromHtmlProp(
            component,
            componentName,
            propName,
            propValue
          );

          const [paramName, argValue] = componentArg;
          args[paramName] = argValue;
        }
      }

      if (node.slots) {
        for (const [slotName, slotChildren] of Object.entries(node.slots)) {
          const param = component.params.find(
            (p) => paramToVarName(component, p) === toVarName(slotName)
          );
          if (!param) {
            throw new Error(
              `Slot ${slotName} doesn't exist in component ${componentName}`
            );
          }

          // Recursively convert slot children to TplNodes
          args[param.variable.name] = (
            await Promise.all(slotChildren.map((child) => rec(child)))
          ).flat();
        }
      }

      const tplComponent = vtm.mkTplComponentX({
        component,
        args,
      });
      collectWIVariantData(node, tplComponent);
      return [tplComponent];
    }

    // Fragment expands its children in place
    if (node.type === "fragment") {
      return (
        await Promise.all(node.children.map((child) => rec(child)))
      ).flat();
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
      return [tpl];
    }

    if (node.type === "container") {
      const tpl = vtm.mkTplTagX(
        node.tag,
        {
          name: node.attrs["__name"],
          type: TplTagType.Other,
        },
        (
          await Promise.all(
            node.children.map(async (child) => await rec(child))
          )
        ).flat()
      );

      collectWIVariantData(node, tpl);

      return [tpl];
    }

    assertNever(node);
  }

  const tpls = await rec(wiTree);

  if (tpls.length === 0) {
    return null;
  }

  return {
    tpls,
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

/**
 * Converts an HTML prop name and value to a component arg for the web importer.
 *
 * Throws on invalid prop name, slot params, or type mismatches.
 */
function getComponentArgFromHtmlProp(
  component: Component,
  componentName: string,
  propName: string,
  value: unknown
): [string, VariantsRef | CustomCode | string | number | boolean] {
  const name = toVarName(propName);
  const param = component.params.find(
    (p) => paramToVarName(component, p) === name
  );

  if (!param) {
    throw new Error(`Component "${componentName}" has no prop "${propName}"`);
  }

  if (isSlot(param)) {
    throw new Error(
      `Component "${componentName}" prop "${propName}" is a slot — pass slot content as children, not as a data-prop attribute`
    );
  }

  if (value === undefined) {
    throw new Error(
      `Component "${componentName}" prop "${propName}" has undefined value`
    );
  }

  // Variant group handling
  const variantGroup = component.variantGroups.find(
    (group) => group.param === param
  );
  if (variantGroup) {
    if (isStandaloneVariantGroup(variantGroup)) {
      if (value !== true) {
        throw new Error(
          `Component "${componentName}" prop "${propName}" is a standalone variant toggle and expects true, got ${JSON.stringify(
            value
          )}`
        );
      }
      return [
        param.variable.name,
        new VariantsRef({ variants: [variantGroup.variants[0]] }),
      ];
    } else {
      const variant = variantGroup.variants.find(
        (v) => toVarName(v.name) === toVarName(`${value}`)
      );
      if (!variant) {
        throw new Error(
          `Component "${componentName}" prop "${propName}" has no variant matching "${value}"`
        );
      }
      return [param.variable.name, new VariantsRef({ variants: [variant] })];
    }
  }

  if (isBoolType(param.type)) {
    if (typeof value !== "boolean") {
      throw new Error(
        `Component "${componentName}" prop "${propName}" expects a boolean but got ${JSON.stringify(
          value
        )}`
      );
    }

    return [param.variable.name, code(JSON.stringify(value))];
  }

  if (isNumType(param.type)) {
    if (typeof value !== "number") {
      throw new Error(
        `Component "${componentName}" prop "${propName}" expects a number but got ${JSON.stringify(
          value
        )}`
      );
    }
    return [param.variable.name, code(JSON.stringify(value))];
  }

  // Complex types (object/array/null/any-type) in customCode(JSON.stringify)
  if (
    isAnyType(param.type) ||
    isArray(value) ||
    isObject(value) ||
    value === null
  ) {
    return [param.variable.name, customCode(JSON.stringify(value))];
  }

  return [param.variable.name, code(JSON.stringify(value))];
}

import { AppCtx } from "@/wab/client/app-ctx";
import {
  ImageAssetOpts,
  maybeUploadImage,
  readAndSanitizeSvgXmlAsImage,
  ResizableImage,
} from "@/wab/client/dom-utils";
import {
  WIError,
  WIImportFailedError,
  WITplRef,
} from "@/wab/client/web-importer/errors";
import { parseHtmlToWebImporterTree } from "@/wab/client/web-importer/html-parser";
import {
  isWIBaseVariantSettings,
  WIAnimationSequence,
  WIBase,
  WIElement,
  WIFragment,
  WIScreenVariant,
  WIVariant,
} from "@/wab/client/web-importer/types";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { CodeComponentsRegistry } from "@/wab/shared/code-components/code-components";
import { paramToVarName, toVarName } from "@/wab/shared/codegen/util";
import { assert, assertNever, ensure, mkShortId } from "@/wab/shared/common";
import {
  interpolatedStringToCodeExpr,
  interpolatedStringToExpr,
  interpolatedStringToRichText,
} from "@/wab/shared/copilot/dynamic-value-input";
import { mkNormalizedRep } from "@/wab/shared/copilot/utils";
import {
  code,
  codeLit,
  customCode,
  InteractionConditionalMode,
} from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { getTagAttrForImageAsset } from "@/wab/shared/core/image-assets";
import {
  JsonValue,
  mkNameArg,
  mkParam,
  ParamExportType,
} from "@/wab/shared/core/lang";
import {
  allAnimationSequences,
  getResponsiveStrategy,
} from "@/wab/shared/core/sites";
import { validateStylesForTpl } from "@/wab/shared/core/style-props-tpl";
import {
  mkRuleSet,
  tryGetAnimationSequenceUuidFromCssVar,
} from "@/wab/shared/core/styles";
import {
  AttrsSpec,
  flattenTpls,
  mkSlot,
  TplTagType,
} from "@/wab/shared/core/tpls";
import { camelCssPropsToKebab } from "@/wab/shared/css";
import {
  AnimationProperty,
  CssAnimation,
  isAnimationProperty,
  parseCssAnimationsFromStyles,
} from "@/wab/shared/css/animations";
import { isDynamicValue } from "@/wab/shared/dynamic-bindings";
import { EvaluationError } from "@/wab/shared/eval/expression-parser";
import {
  Animation,
  AnimationSequence,
  Component,
  CustomCode,
  EventHandler,
  Expr,
  FunctionExpr,
  ImageAssetRef,
  Interaction,
  isKnownDateRangeStrings,
  isKnownDateString,
  isKnownTplComponent,
  isKnownTplSlot,
  isKnownTplTag,
  KeyFrame,
  ObjectPath,
  Param,
  Site,
  TplNode,
  TplTag,
  Variant,
  VariantsRef,
} from "@/wab/shared/model/classes";
import {
  isAnyType,
  isChoiceType,
  isMultiChoiceType,
  typeFactory,
  wabToTsType,
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
  toVariantComboKey,
  VariantCombo,
  VariantGroupType,
} from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { setTplVisibility, TplVisibility } from "@/wab/shared/visibility-utils";
import { deserializePlasmicComponentAttrs } from "@/wab/shared/web-exporter/component-utils";
import L, { isArray } from "lodash";
import { err, ok, Result } from "neverthrow";

export interface HtmlToTplResult {
  /** Tpl nodes ready to be inserted (multiple when root is a WIFragment) */
  tpls: TplNode[];
  /** Partial web-importer errors collected while parsing HTML. */
  errors: WIError[];
  /**
   * Finalize deferred changes that must happen inside studioCtx.change():
   * animation sequences, variant styles, and image asset attachment.
   * Returns WIErrors if any; such as unknown animations, unmatched screen variants etc.
   */
  finalize: (opts: {
    component: Component;
    tplMgr: TplMgr;
    ccRegistry: CodeComponentsRegistry;
  }) => WIError[];
}

/**
 * Convert an HTML string into a TplNode tree with all styles applied.
 *
 * @param html - The HTML string to convert.
 * @param opts - Site, VariantTplMgr, and AppCtx needed for conversion.
 * @returns
 *   - `tpls` is an array of fully built TplNode trees (multiple when root is a fragment).
 *   - `finalize(opts)` must be called inside `studioCtx.change()` to apply
 *     animation sequences, variant styles, and image assets to the Site.
 *   - WIImportFailedError when there is nothing to insert.
 */
export async function htmlToTpl(
  html: string,
  opts: {
    site: Site;
    vtm: VariantTplMgr;
    appCtx: AppCtx;
  }
): Promise<Result<HtmlToTplResult, WIImportFailedError>> {
  const { site, vtm, appCtx } = opts;

  const parseResult = await parseHtmlToWebImporterTree(html, site);
  if (parseResult.isErr()) {
    return err(parseResult.error);
  }
  const { wiTree, animationSequences, errors: parseErrors } = parseResult.value;

  const errors: WIError[] = [...parseErrors];

  const {
    tpls,
    tplImageAssetMap,
    tplVariantSettingsData,
    tplRepeatData,
    tplVisibilityData,
  } = await wiTreeToTpl(wiTree, { site, vtm, appCtx, errors });

  if (tpls.length === 0) {
    return err(
      new WIImportFailedError(
        "nothing-to-insert",
        errors,
        "No elements could be built from the HTML snippet"
      )
    );
  }

  return ok({
    tpls,
    errors,
    finalize: (finalizeOpts) => {
      const htmlToTplErrors: WIError[] = [];

      // Process Animation Sequences (keyframes)
      upsertAnimationSequences(animationSequences, { site });

      const owningComponent = finalizeOpts.component;

      // Process all variant settings data to apply styles
      for (const [tplNode, vsData] of tplVariantSettingsData.entries()) {
        for (const vs of vsData) {
          const { variantCombo, safeStyles, unsafeStyles, wiAnimations } = vs;

          let animations: Animation[] | null = null;
          if (wiAnimations) {
            const resolved = wiAnimationsToSiteAnimations(wiAnimations, {
              site,
            });
            htmlToTplErrors.push(...resolved.errors);
            animations = resolved.animations;
          }

          // Resolve every WIVariant in the combo up front. If any member
          // cannot be resolved, applying the styles to the remaining (weaker)
          // combo would mistarget them e.g. hover styles from a missing media query
          // landing on every screen size — so the whole variant setting is
          // skipped and reported instead.
          const unresolved: WIError[] = [];
          for (const wiVariant of variantCombo) {
            if (
              wiVariant.type === VariantGroupType.GlobalScreen &&
              !findMatchingScreenVariant(site, wiVariant)
            ) {
              unresolved.push({
                code: "unmatched-screen-variant",
                width: wiVariant.width,
              });
            } else if (wiVariant.type === "style" && !isKnownTplTag(tplNode)) {
              // Element states only work on TplTag; they don't apply on
              // TplComponent and TplSlot.
              unresolved.push({
                code: "unsupported-style-variant",
                tpl: tplRef(tplNode),
                selectors: wiVariant.selectors,
              });
            }
          }
          if (unresolved.length > 0) {
            htmlToTplErrors.push(...unresolved);
            continue;
          }

          const processedVariantCombo: VariantCombo = variantCombo.map(
            (wiVariant): Variant => {
              switch (wiVariant.type) {
                case "base": {
                  return getBaseVariant(owningComponent);
                }
                case VariantGroupType.GlobalScreen: {
                  return ensure(
                    findMatchingScreenVariant(site, wiVariant),
                    "screen variant resolvability checked above"
                  );
                }
                case "style": {
                  assert(
                    isKnownTplTag(tplNode),
                    "style variant applicability checked above"
                  );
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
            }
          );

          applyVariantStyles(
            vtm,
            tplNode,
            processedVariantCombo,
            safeStyles,
            unsafeStyles,
            animations,
            finalizeOpts.ccRegistry,
            htmlToTplErrors
          );
        }
      }

      const baseCombo = [getBaseVariant(owningComponent)];

      // Apply data-repeat onto the base variant setting. Run in finalize/studioCtx.change,
      // since assigning dataRep outside change() serializes the value but the canvas env
      // does not register the repeat locals (currentItem/currentIndex).
      for (const [tplNode, rep] of tplRepeatData.entries()) {
        vtm.ensureBaseVariantSetting(tplNode).dataRep = mkNormalizedRep(
          rep.collection,
          rep.itemName,
          rep.indexName
        );
      }

      // Apply inline visibility (data-visibility / data-visible-if). Done in finalize
      // (after style merge) because setTplVisibility writes a RuleSet flag
      // (PLASMIC_DISPLAY_NONE) that must not be  overwritten by the WI style merge.
      for (const [tplNode, vis] of tplVisibilityData.entries()) {
        setTplVisibility(tplNode, baseCombo, vis.visibility);
        if (vis.visibility === TplVisibility.CustomExpr && vis.dataCond) {
          // Overwrite the placeholder dataCond that setTplVisibility set with
          // the real condition expression.
          ensureVariantSetting(tplNode, baseCombo).dataCond = vis.dataCond;
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

      return htmlToTplErrors;
    },
  });
}

// Attrs handled via dedicated paths instead of vs.attrs. Exported so copilot
// tools can reuse the same exclusion list.
export const htmlAttrsIgnoredByTpl = new Set([
  "class", // RuleSet styles
  "className", // RuleSet styles
  "style", // RuleSet styles (split to safe/unsafe)
  "data-plasmic-name", // Tpl name
  "data-plasmic-component", // Plasmic metadata
  "data-plasmic-project", // Plasmic metadata (imported-project disambiguation)
  "data-props", // Plasmic metadata
  "slot", // web-components attr with no Plasmic meaning
  "src", // image asset
  "srcset", // image asset
  "data-repeat", // repetition collection (dataRep)
  "data-repeat-item", // repetition item local-var name
  "data-repeat-index", // repetition index local-var name
  "data-visible-if", // dynamic visibility condition (dataCond)
  "data-visibility", // static visibility state (displayNone / notRendered)
]);

/** Matches both lowercase HTML (`onclick`) and camelCase React (`onClick`). */
export function isHtmlEventHandlerAttr(name: string) {
  return /^on[a-zA-Z]/.test(name);
}

/**
 * Camelcase the first letter of an HTML event-handler attribute, e.g. `onclick` -> `onClick`.
 * Compound names like `onmousedown` become `onMousedown` (not `onMouseDown`); codegen
 * only requires `startsWith("on")` so they still get picked up as handlers.
 */
export function toReactEventAttr(name: string) {
  if (/^on[A-Z]/.test(name)) {
    return name;
  }
  return "on" + name.charAt(2).toUpperCase() + name.slice(3);
}

/**
 * Wrap a JS string from an HTML event-handler attribute into an `EventHandler` expr
 * containing a single customFunction interaction.
 */
export function mkEventHandlerExprFromHtmlAttrValue(
  jsCode: string
): EventHandler {
  const eventHandler = new EventHandler({ interactions: [] });
  const interaction = new Interaction({
    interactionName: "Run code",
    actionName: "customFunction",
    condExpr: null,
    conditionalMode: InteractionConditionalMode.Always,
    args: [
      mkNameArg({
        name: "customFunction",
        expr: new FunctionExpr({
          bodyExpr: customCode(jsCode),
          argNames: [],
        }),
      }),
    ],
    parent: eventHandler,
    uuid: mkShortId(),
  });
  eventHandler.interactions.push(interaction);
  return eventHandler;
}

type TplVariantSettingsData = {
  variantCombo: WIVariant[];
  safeStyles: Record<string, string>;
  unsafeStyles: Record<string, string>;
  wiAnimations: CssAnimation[] | null;
};

type TplVisibilityData = {
  visibility: TplVisibility;
  /** Present only for TplVisibility.CustomExpr (the data-visible-if condition). */
  dataCond?: ObjectPath | CustomCode;
};

type TplRepeatData = {
  collection: ObjectPath | CustomCode;
  itemName?: string;
  indexName?: string;
};

function tplRef(tpl: TplNode): WITplRef {
  return {
    type: isKnownTplComponent(tpl)
      ? "TplComponent"
      : isKnownTplSlot(tpl)
      ? "TplSlot"
      : "TplTag",
    uuid: tpl.uuid,
  };
}

function applyVariantStyles(
  vtm: VariantTplMgr,
  tpl: TplNode,
  variantCombo: VariantCombo,
  safeStyles: Record<string, string>,
  unsafeStyles: Record<string, string>,
  animations: Animation[] | null,
  ccRegistry: CodeComponentsRegistry,
  htmlToTplErrors: WIError[]
) {
  const vs = vtm.ensureVariantSetting(tpl, variantCombo);
  // Only styles Studio allows on this tpl may enter the RuleSet; the rest are
  // dropped and reported in errors.
  const { valid, invalid } = validateStylesForTpl(
    safeStyles,
    tpl,
    vtm.effectiveRsh(tpl, variantCombo),
    ccRegistry
  );
  RSH(vs.rs, tpl).merge(valid);
  const invalidProps = Object.keys(invalid);
  if (invalidProps.length > 0) {
    htmlToTplErrors.push({
      code: "styles-not-applicable",
      tpl: tplRef(tpl),
      props: invalidProps,
      variantDesc: toVariantComboKey(variantCombo),
    });
  }

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
  opts: {
    site: Site;
    vtm: VariantTplMgr;
    appCtx: AppCtx;
    errors: WIError[];
  }
) {
  const { site, vtm, appCtx, errors } = opts;
  const tplImageAssetMap = new Map<
    TplTag,
    {
      image: ResizableImage;
      options: ImageAssetOpts;
    }
  >();
  const tplVariantSettingsData = new Map<TplNode, TplVariantSettingsData[]>();
  // Repetition (data-repeat) and visibility (data-visibility / data-visible-if),
  // are both applied in finalize.
  const tplRepeatData = new Map<TplNode, TplRepeatData>();
  const tplVisibilityData = new Map<TplNode, TplVisibilityData>();

  function collectDataRepeat(node: WIBase, tpl: TplNode) {
    const collectionStr = node.attrs["data-repeat"];
    if (collectionStr === undefined) {
      return;
    }
    tplRepeatData.set(tpl, {
      collection: interpolatedStringToCodeExpr(collectionStr),
      itemName: node.attrs["data-repeat-item"],
      indexName: node.attrs["data-repeat-index"],
    });
  }
  function collectVisibility(node: WIBase, tpl: TplNode) {
    const visibleIf = node.attrs["data-visible-if"];
    if (visibleIf !== undefined) {
      tplVisibilityData.set(tpl, {
        visibility: TplVisibility.CustomExpr,
        dataCond: interpolatedStringToCodeExpr(visibleIf),
      });
      return;
    }
    const visibility = node.attrs["data-visibility"];
    if (visibility === "displayNone") {
      tplVisibilityData.set(tpl, { visibility: TplVisibility.DisplayNone });
    } else if (visibility === "notRendered") {
      tplVisibilityData.set(tpl, { visibility: TplVisibility.NotRendered });
    } else if (visibility !== undefined && visibility !== "visible") {
      throw new EvaluationError(
        `Invalid data-visibility value ${JSON.stringify(
          visibility
        )}. Expected "visible", "displayNone", or "notRendered"; use data-visible-if for a dynamic condition.`
      );
    }
  }

  /** Collect repetition + visibility bindings authored via `data-*` attributes. */
  function collectStructuralBindings(node: WIBase, tpl: TplNode) {
    collectDataRepeat(node, tpl);
    collectVisibility(node, tpl);
  }

  function collectWIVariantData(
    node: Exclude<WIElement, WIFragment>,
    tpl: TplNode
  ) {
    // Container layout defaults don't apply to text and slots nodes.
    const defaultStyles: Record<string, string> =
      node.type === "text" ||
      node.type === "slot-target" ||
      node.type === "component"
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

      // Keep the full combo unresolved here, finalize resolves it all-or-nothing.
      if (variantSetting.variantCombo.length > 0) {
        tplVariantSettings.push({
          variantCombo: variantSetting.variantCombo,
          safeStyles: vsSafeStyles,
          unsafeStyles: { ...unsafeBaseStyles, ...variantSetting.unsafeStyles },
          wiAnimations: animations,
        });
      }
    }

    tplVariantSettingsData.set(tpl, tplVariantSettings);
  }

  function htmlAttrsToTplAttrs(node: WIBase): AttrsSpec {
    const result: AttrsSpec = {};
    for (const [key, value] of Object.entries(node.attrs)) {
      if (htmlAttrsIgnoredByTpl.has(key)) {
        continue;
      }
      if (isHtmlEventHandlerAttr(key)) {
        if (!value.trim()) {
          continue;
        }
        result[toReactEventAttr(key)] =
          mkEventHandlerExprFromHtmlAttrValue(value);
        continue;
      }
      result[key] = isDynamicValue(value)
        ? interpolatedStringToExpr(value)
        : value;
    }
    return result;
  }

  async function rec(node: WIElement): Promise<TplNode[]> {
    // Fragment expands its children in place
    if (node.type === "fragment") {
      return (
        await Promise.all(node.children.map((child) => rec(child)))
      ).flat();
    }

    const tplName = node.attrs["data-plasmic-name"];
    const nodePath = node.path;
    if (node.type === "text") {
      const tpl = vtm.mkTplTagX(node.tag, {
        attrs: htmlAttrsToTplAttrs(node),
        name: tplName,
        type: TplTagType.Text,
      });
      const vs = vtm.ensureBaseVariantSetting(tpl);
      vs.text = interpolatedStringToRichText(node.text);
      collectWIVariantData(node, tpl);
      collectStructuralBindings(node, tpl);
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
          errors.push({ code: "svg-upload-failed", path: nodePath });
          return [];
        }

        const tpl = vtm.mkTplImage({
          type: imageOpts.type,
          iconColor: imageOpts.iconColor,
          name: tplName,
        });
        collectWIVariantData(node, tpl);
        collectStructuralBindings(node, tpl);

        // We will store each image to it's corresponding tpl so we can process it
        // later to upload image and attach asset to this tpl in 'finalize',
        // We cannot do that here because this function is expected to be called outside 'studioCtx.change' and
        // creating an asset here would cause a model change to occur.
        tplImageAssetMap.set(tpl, {
          image: imageResult,
          options: imageOpts,
        });

        return [tpl];
      }
      errors.push({ code: "svg-upload-failed", path: nodePath });
      return [];
    }

    if (node.type === "component") {
      const componentName = node.component;
      const component = deserializePlasmicComponentAttrs(site, {
        "data-plasmic-component": componentName,
        "data-plasmic-project": node.depProjectId as ProjectId | undefined,
      });
      if (!component) {
        errors.push({
          code: "unknown-component",
          path: nodePath,
          component: componentName,
          ...(node.depProjectId && { projectId: node.depProjectId }),
        });
        return [];
      }

      // Build args from props and slots
      const args: Record<string, any> = {};

      if (node.props) {
        for (const [propName, propValue] of Object.entries(node.props)) {
          // An invalid prop drops just that prop; the instance still inserts.
          getComponentArgFromHtmlProp(
            component,
            componentName,
            propName,
            propValue,
            nodePath
          ).match(
            ([param, argValue]) => {
              args[param.variable.name] = argValue;
            },
            (error) => errors.push(error)
          );
        }
      }

      if (node.slots) {
        for (const [slotName, slotChildren] of Object.entries(node.slots)) {
          const param = component.params.find(
            (p) => paramToVarName(component, p) === toVarName(slotName)
          );
          if (!param) {
            errors.push({
              code: "unknown-slot",
              path: nodePath,
              component: componentName,
              slot: slotName,
            });
            continue;
          }

          // Recursively convert slot children to TplNodes
          args[param.variable.name] = (
            await Promise.all(slotChildren.map((child) => rec(child)))
          ).flat();
        }
      }

      const tplComponent = vtm.mkTplComponentX({
        component,
        name: tplName,
        args,
      });
      collectWIVariantData(node, tplComponent);
      collectStructuralBindings(node, tplComponent);
      return [tplComponent];
    }

    if (node.type === "slot-target") {
      const defaultChildren = (
        await Promise.all(node.defaultChildren.map((child) => rec(child)))
      ).flat();

      // Slot default contents only carry base variant settings, so keep
      // only the base entries collected for the slot's descendants.
      for (const child of defaultChildren) {
        for (const tpl of flattenTpls(child)) {
          const vsData = tplVariantSettingsData.get(tpl);
          if (vsData) {
            tplVariantSettingsData.set(
              tpl,
              vsData.filter((vs) =>
                vs.variantCombo.every((v) => v.type === "base")
              )
            );
          }
        }
      }

      // The param is created detached: the owning component isn't known at
      // build time, so whoever attaches the TplSlot to a component must
      // register a real slot param for it, keeping only the name from this
      // placeholder.
      const param = mkParam({
        name: node.name,
        type: typeFactory.renderable(),
        exportType: ParamExportType.External,
        paramType: "slot",
      });
      const slot = mkSlot(param, defaultChildren);
      vtm.ensureBaseVariantSetting(slot);
      collectWIVariantData(node, slot);
      return [slot];
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

      const src = getSrc();
      const tpl = vtm.mkTplImage({
        attrs: {
          ...htmlAttrsToTplAttrs(node),
          src: isDynamicValue(src)
            ? interpolatedStringToExpr(src)
            : code(JSON.stringify(src)),
        },
        type: ImageAssetType.Picture,
        name: tplName,
      });
      collectWIVariantData(node, tpl);
      collectStructuralBindings(node, tpl);
      return [tpl];
    }

    if (node.type === "container") {
      const tpl = vtm.mkTplTagX(
        node.tag,
        {
          attrs: htmlAttrsToTplAttrs(node),
          name: tplName,
          type: TplTagType.Other,
        },
        (
          await Promise.all(
            node.children.map(async (child) => await rec(child))
          )
        ).flat()
      );

      collectWIVariantData(node, tpl);
      collectStructuralBindings(node, tpl);

      return [tpl];
    }

    assertNever(node);
  }

  const tpls = await rec(wiTree);

  return {
    tpls,
    tplImageAssetMap,
    tplVariantSettingsData,
    tplRepeatData,
    tplVisibilityData,
  };
}

/**
 * Upsert WIAnimationSequences into the site. If a sequence with the same
 * name already exists, its keyframes are replaced
 * with the new ones. Otherwise a new AnimationSequence is created.
 */
export function upsertAnimationSequences(
  animationSequences: WIAnimationSequence[],
  opts: { site: Site }
): AnimationSequence[] {
  const { site } = opts;
  const result: AnimationSequence[] = [];

  for (const sequence of animationSequences) {
    const keyframes = sequence.keyframes.map(
      (wiKeyframe) =>
        new KeyFrame({
          percentage: wiKeyframe.percentage,
          // We will only utilize the safe styles here. We need to think about the unsafe styles since we don't have any
          // better way to display them in MixinControls/AnimationSequenceControls. We can have a new custom style attribute section
          // to store unsafe styles or arbitrary css. Since it doesn't exist yet.
          rs: mkRuleSet({
            values: camelCssPropsToKebab(wiKeyframe.safeStyles),
          }),
        })
    );

    const sequenceVarName = toVarName(sequence.name);
    const existingSequence = site.animationSequences.find(
      (existing) => toVarName(existing.name) === sequenceVarName
    );

    if (existingSequence) {
      // Replace the keyframes on the existing sequence so any references
      // to it (Animation.sequence on tpl RuleSets) keep pointing to the
      // same AnimationSequence object.
      existingSequence.keyframes = keyframes;
      result.push(existingSequence);
    } else {
      const newSequence = new AnimationSequence({
        name: sequence.name,
        uuid: mkShortId(),
        keyframes,
      });
      site.animationSequences.push(newSequence);
      result.push(newSequence);
    }
  }

  return result;
}

/**
 * Resolve a list of CssAnimation entries (from parsed `animation` shorthand).
 * CssAnimations whose name doesn't match any existing
 * AnimationSequence are dropped.
 */
export function wiAnimationsToSiteAnimations(
  wiAnimations: CssAnimation[],
  opts: { site: Site }
): { animations: Animation[]; errors: WIError[] } {
  const { site } = opts;
  const animations: Animation[] = [];
  const errors: WIError[] = [];

  for (const wiAnim of wiAnimations) {
    const animSeqUuid = tryGetAnimationSequenceUuidFromCssVar(wiAnim.name);
    const animationSequences = allAnimationSequences(site, {
      includeDeps: "direct",
    });
    const animationSequence = animationSequences.find(
      (seq) =>
        seq.uuid === animSeqUuid ||
        toVarName(seq.name) === toVarName(wiAnim.name)
    );

    if (!animationSequence) {
      errors.push({ code: "unknown-animation", animation: wiAnim.name });
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
  return { animations, errors };
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
 * Converts an HTML prop name and value (in the serialized data-props format)
 * to the matching component Param and arg Expr.
 *
 * Err (an `invalid-component-prop` WIError) on invalid prop name, slot params, or type mismatches.
 */
export function getComponentArgFromHtmlProp(
  component: Component,
  componentName: string,
  propName: string,
  value: unknown,
  path?: string
): Result<[Param, Expr], WIError> {
  const fail = (reason: string) =>
    err<[Param, Expr], WIError>({
      code: "invalid-component-prop",
      component: componentName,
      prop: propName,
      reason,
      ...(path && { path }),
    });
  const name = toVarName(propName);
  const param = component.params.find(
    (p) => paramToVarName(component, p) === name
  );

  if (!param) {
    return fail("no such prop exists on the component");
  }

  if (isSlot(param)) {
    return fail(
      "it is a slot — pass slot content as children, not as a data-prop attribute"
    );
  }

  if (value === undefined) {
    return fail("value is undefined");
  }

  // Variant group handling
  const variantGroup = component.variantGroups.find(
    (group) => group.param === param
  );
  if (variantGroup) {
    if (isStandaloneVariantGroup(variantGroup)) {
      if (value !== true) {
        return fail(
          `it is a standalone variant toggle and expects true, got ${JSON.stringify(
            value
          )}`
        );
      }
      return ok([
        param,
        new VariantsRef({ variants: [variantGroup.variants[0]] }),
      ]);
    } else if (variantGroup.multi) {
      const values = isArray(value) ? value : [value];
      const variants: Variant[] = [];
      for (const v of values) {
        const variant = variantGroup.variants.find(
          (vv) => toVarName(vv.name) === toVarName(`${v}`)
        );
        if (!variant) {
          return fail(`no variant matching ${JSON.stringify(`${v}`)}`);
        }
        variants.push(variant);
      }
      return ok([param, new VariantsRef({ variants })]);
    } else {
      const variant = variantGroup.variants.find(
        (v) => toVarName(v.name) === toVarName(`${value}`)
      );
      if (!variant) {
        return fail(`no variant matching ${JSON.stringify(`${value}`)}`);
      }
      return ok([param, new VariantsRef({ variants: [variant] })]);
    }
  }

  // A string with `{{ jsExpr }}` is a dynamic data binding, valid for any
  // (non-variant-group) param type regardless of its declared type.
  if (typeof value === "string" && isDynamicValue(value)) {
    return ok([param, interpolatedStringToExpr(value)]);
  }

  // Primitive-valued types (bool, num, text/img/href/target).
  const tsType = wabToTsType(param.type);
  if (tsType === "boolean" || tsType === "number" || tsType === "string") {
    if (typeof value !== tsType) {
      return fail(`expects a ${tsType} but got ${JSON.stringify(value)}`);
    }
    return ok([param, code(JSON.stringify(value))]);
  }

  if (isChoiceType(param.type)) {
    const options = param.type.options.map((opt) =>
      typeof opt === "object" ? opt.value : opt
    );
    if (!options.some((opt) => opt === value)) {
      return fail(
        `must be one of ${JSON.stringify(options)} but got ${JSON.stringify(
          value
        )}`
      );
    }
    return ok([param, code(JSON.stringify(value))]);
  }

  if (isMultiChoiceType(param.type)) {
    const options = param.type.options.map((opt) =>
      typeof opt === "object" ? opt.value : opt
    );
    if (!Array.isArray(value)) {
      return fail(`expects an array but got ${JSON.stringify(value)}`);
    }
    const invalidValues = value.filter(
      (v) => !options.some((opt) => opt === v)
    );
    if (invalidValues.length > 0) {
      return fail(
        `values must be from ${JSON.stringify(
          options
        )} but got invalid values: ${JSON.stringify(invalidValues)}`
      );
    }
    return ok([param, code(JSON.stringify(value))]);
  }

  // dateString carries a single ISO date string.
  if (isKnownDateString(param.type)) {
    if (typeof value !== "string") {
      return fail(`expects a date string but got ${JSON.stringify(value)}`);
    }
    return ok([param, code(JSON.stringify(value))]);
  }

  // dateRangeStrings carries a [from, to] pair of ISO date strings; either
  // end may be null for an open range.
  if (isKnownDateRangeStrings(param.type)) {
    if (
      !isArray(value) ||
      value.length != 2 ||
      value.some((v) => typeof v !== "string" && v !== null)
    ) {
      return fail(
        `expects an array of [from, to] date strings but got ${JSON.stringify(
          value
        )}`
      );
    }
    return ok([param, codeLit(value as JsonValue)]);
  }

  // Untyped ('any') props accept arbitrary JSON (objects, arrays, null, and
  // scalars). Stored as an unparenthesized code literal (codeLit), the same
  // form the studio prop editor stores, so tryExtractJson can read it back
  // when serializing the instance.
  if (isAnyType(param.type)) {
    return ok([param, codeLit(value as JsonValue)]);
  }

  return fail(`prop type "${param.type.name}" is not supported yet`);
}

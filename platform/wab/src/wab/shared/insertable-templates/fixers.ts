import {
  TokenType,
  derefToken,
  derefTokenRefs,
  hasTokenRefs,
  maybeDerefToken,
  mkTokenRef,
  replaceAllTokenRefs,
} from "@/wab/commons/StyleToken";
import {
  RSH,
  RuleSetHelpers,
  joinCssValues,
  splitCssValue,
} from "@/wab/shared/RuleSetHelpers";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  isBaseVariant,
  isGlobalVariant,
  isScreenVariant,
} from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  arrayEqIgnoreOrder,
  assert,
  remove,
  switchType,
  unexpected,
  withoutNils,
} from "@/wab/shared/common";
import {
  isCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { code, isFallbackableExpr } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { mkImageAssetRef } from "@/wab/shared/core/image-assets";
import {
  TplTextTag,
  findVariantSettingsUnderTpl,
  flattenTpls,
  isTplComponent,
  isTplSlot,
  isTplTextBlock,
  walkTpls,
} from "@/wab/shared/core/tpls";
import { InsertableTemplateTokenResolution } from "@/wab/shared/devflags";
import { getEffectiveVariantSettingForInsertable } from "@/wab/shared/effective-variant-setting";
import {
  inlineMixins,
  inlineTokens,
} from "@/wab/shared/insertable-templates/inliners";
import { TargetVariants } from "@/wab/shared/insertable-templates/types";
import {
  Component,
  CompositeExpr,
  CustomCode,
  EventHandler,
  Expr,
  ImageAsset,
  ImageAssetRef,
  ObjectPath,
  PageHref,
  RenderExpr,
  RuleSet,
  Site,
  StyleExpr,
  StyleToken,
  TemplatedString,
  TplNode,
  VarRef,
  Variant,
  VariantSetting,
  VariantedValue,
  VariantsRef,
  VirtualRenderExpr,
  isKnownCustomCode,
  isKnownExprText,
  isKnownObjectPath,
  isKnownTemplatedString,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import { isString } from "lodash";

export function ensureTplWithBaseAndScreenVariants(
  tpl: TplNode,
  targetBaseVariant: Variant,
  screenVariant: Variant | undefined
) {
  // Create a new array, since we can mutate tpl.vsettings
  for (const vs of [...tpl.vsettings]) {
    // Fix the variant references
    if (isBaseVariant(vs.variants)) {
      vs.variants = [targetBaseVariant];
    } else if (screenVariant && vs.variants.find((v) => isScreenVariant(v))) {
      // Replace the screen variant reference
      vs.variants = [screenVariant];
    } else {
      // Remove non-base/screen variant settings
      remove(tpl.vsettings, vs);
      console.warn(
        `Node ${tpl.uuid} has a non-base/screen variant. Please remove this from the source project.`
      );
    }
  }

  if (tpl.vsettings.length > 2) {
    console.warn(
      "Tpl node has more than 2 variant settings. Removing extra variant settings",
      tpl
    );
    tpl.vsettings.splice(2);
  }
}

export function fixGlobalVariants(
  tpl: TplNode,
  vs: VariantSetting,
  opts: {
    screenVariant: Variant | undefined;
  }
) {
  if (vs.variants.some((v) => isGlobalVariant(v))) {
    vs.variants = withoutNils(
      vs.variants.map((v) => {
        if (isScreenVariant(v) && opts.screenVariant) {
          return opts.screenVariant;
        } else if (isGlobalVariant(v)) {
          return undefined;
        } else {
          return v;
        }
      })
    );

    // If we end up with a empty variants list,
    // or one with duplicates, then we remove from the list of vsettings
    if (
      vs.variants.length === 0 ||
      tpl.vsettings.some(
        (vs2) => vs2 !== vs && arrayEqIgnoreOrder(vs2.variants, vs.variants)
      )
    ) {
      remove(tpl.vsettings, vs);
    }
  }
}

export function ensureNonGlobalVariants(
  tpl: TplNode,
  opts: {
    screenVariant: Variant | undefined;
  }
) {
  for (const vs of [...tpl.vsettings]) {
    fixGlobalVariants(tpl, vs, opts);
  }
}

type TplVSettingFixer = (tpl: TplNode, vs: VariantSetting) => void;

export const fixBackgroundImage = (
  tpl: TplNode,
  vs: VariantSetting,
  allImageAssetsDict: Record<string, ImageAsset>,
  addImageAsset: (e: ImageAsset) => ImageAsset | undefined
) => {
  // We have to handle background images in the templates by either adding the asset or deleting
  // the reference, so that it doesn't appear as a empty layer in the background section.
  const rsh = RSH(vs.rs, tpl);
  const background = rsh.getRaw("background");
  if (background) {
    const backgrounds = splitCssValue("background", background);
    rsh.set(
      "background",
      joinCssValues(
        "background",
        withoutNils(
          backgrounds.map((bg) => {
            if (!bg.startsWith("var(--image-")) {
              return bg;
            }
            const elements = bg.split(" ");
            const uuid = elements[0] // the image variable is always the first
              .substring("var(--image-".length)
              .slice(0, -1);
            const asset = allImageAssetsDict[uuid];
            if (asset) {
              const addedAsset = addImageAsset(asset);
              if (addedAsset) {
                return [mkImageAssetRef(addedAsset), ...elements.slice(1)].join(
                  " "
                );
              }
            }
            return null;
          })
        )
      )
    );
  }
};

export function makeImageAssetImporter(
  site: Site
): (_: ImageAsset) => ImageAsset | undefined {
  const tplMgr = new TplMgr({ site });

  const oldToNew = new Map<ImageAsset, ImageAsset>();
  const getNewImageAsset = (asset: ImageAsset) => {
    if (!asset.dataUri) {
      return undefined;
    }

    if (oldToNew.has(asset)) {
      return oldToNew.get(asset)!;
    }
    const newAsset = tplMgr.addImageAsset({
      name:
        asset.name ?? (asset.type === ImageAssetType.Icon ? "icon" : "image"),
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      dataUri: asset.dataUri,
      type:
        asset.type === ImageAssetType.Icon
          ? ImageAssetType.Icon
          : ImageAssetType.Picture,
      aspectRatio: asset.aspectRatio ?? undefined,
    });
    oldToNew.set(asset, newAsset);
    return newAsset;
  };

  return getNewImageAsset;
}

export function makeImageAssetFixer(
  site: Site,
  allImageAssetsDict: Record<string, ImageAsset>
) {
  const getNewImageAsset = makeImageAssetImporter(site);
  const tplAssetFixer = (tpl: TplNode, vs: VariantSetting) => {
    fixBackgroundImage(tpl, vs, allImageAssetsDict, getNewImageAsset);
  };

  return {
    getNewImageAsset,
    tplAssetFixer,
  };
}

export function mkInsertableTokenImporter(
  sourceSite: Site,
  targetSite: Site,
  sourceTokens: StyleToken[],
  targetTokens: StyleToken[],
  tokenResolution: InsertableTemplateTokenResolution | undefined,
  screenVariant: Variant | undefined,
  onFontSeen: (font: string) => void
) {
  const oldToNewToken = new Map<StyleToken, StyleToken>();

  function getOrAddToken(oldTokens: StyleToken[], oldToken: StyleToken) {
    if (oldToNewToken.has(oldToken)) {
      return oldToNewToken.get(oldToken)!;
    }

    // `targetTokens` won't consider tokens that have been added by `getOrAddToken`
    // but this is expected as if it would have a similarity from tokens that have
    // been added, it would be an inconsistency in the template
    const similarToken = targetTokens.find((targetToken) => {
      if (targetToken.type !== oldToken.type) {
        return false;
      }
      const isSameName = targetToken.name === oldToken.name;

      if (
        tokenResolution === "reuse-by-name" ||
        tokenResolution === "retain-by-name"
      ) {
        return isSameName;
      }

      const isSameValue =
        derefToken(targetTokens, targetToken) ===
        derefToken(oldTokens, oldToken);

      if (
        tokenResolution === "reuse-by-value" ||
        tokenResolution === "retain-by-value"
      ) {
        return isSameValue;
      }

      // We fallback to reuse-by-value-and-name
      return isSameValue && isSameName;
    });

    if (similarToken) {
      oldToNewToken.set(oldToken, similarToken);
      return similarToken;
    }

    const tplMgr = new TplMgr({ site: targetSite });
    const newToken = tplMgr.addToken({
      name: tplMgr.getUniqueTokenName(oldToken.name),
      tokenType: oldToken.type as TokenType,
      value: maybeDerefToken(targetTokens, oldTokens, oldToken),
    });

    if (screenVariant) {
      // We get a single varianted value that we can keep for the screenVariant
      const variantedValues = oldToken.variantedValues.find((v) => {
        return v.variants.length === 1 && isScreenVariant(v.variants[0]);
      });
      if (variantedValues) {
        newToken.variantedValues.push(
          new VariantedValue({
            value: derefToken(
              oldTokens,
              oldToken,
              new VariantedStylesHelper(sourceSite, variantedValues.variants)
            ),
            variants: [screenVariant],
          })
        );
      }
    }

    oldToNewToken.set(oldToken, newToken);
    return newToken;
  }

  function fixTokensInTplTree(tplTree: TplNode) {
    if (!tokenResolution || tokenResolution === "inline") {
      inlineTokens(tplTree, sourceTokens, onFontSeen);
      return;
    }

    function getNewMaybeTokenRefValue(value: string) {
      if (!hasTokenRefs(value)) {
        return value;
      }

      return replaceAllTokenRefs(value, (tokenId) => {
        const oldToken = sourceTokens.find((t) => t.uuid === tokenId);
        if (!oldToken) {
          return undefined;
        }
        return mkTokenRef(getOrAddToken(sourceTokens, oldToken));
      });
    }

    const vsAndTpls = [...findVariantSettingsUnderTpl(tplTree)];
    for (const [vs, tpl] of vsAndTpls) {
      const forTag = isKnownTplTag(tpl) ? tpl.tag : "div";
      const rsHelper = new RuleSetHelpers(vs.rs, forTag);

      // Iterate over all Rules to resolve token refs
      for (const prop of rsHelper.props()) {
        const val = rsHelper.getRaw(prop);
        if (val) {
          const newVal = getNewMaybeTokenRefValue(val);
          rsHelper.set(prop, newVal);
          if (prop === "font-family") {
            onFontSeen(
              derefTokenRefs(
                [...targetTokens, ...oldToNewToken.values()],
                newVal
              )
            );
          }
        }
      }
    }
  }

  return fixTokensInTplTree;
}

/**
 * Checks that the tplTree is a valid insertable template
 * - For now, just checks that there are no TplSlots and TplComponents
 * @param tplTree
 */
export function assertValidInsertable(
  tplTree: TplNode,
  allowComponents: boolean
): void {
  walkTpls(tplTree, {
    pre(tpl, path) {
      if (isTplSlot(tpl)) {
        console.warn("Path:");
        console.warn(path);
        assert(false, "Insertable templates cannot have TplSlots");
      } else if (isTplComponent(tpl) && !allowComponents) {
        if (
          !(isPlumeComponent(tpl.component) || isCodeComponent(tpl.component))
        ) {
          console.warn("Path:");
          console.warn(path);
          assert(false, "Insertable templates cannot have TplComponents");
        }
      }
      return true;
    },
  });
}

export const fixTextTplStyles = (
  tpl: TplTextTag,
  vs: VariantSetting,
  sourceComp: Component,
  sourceSite: Site
) => {
  const fixedRsh = new RuleSetHelpers(
    new RuleSet({
      values: {},
      mixins: [],
    }),
    tpl.tag
  );

  if (isBaseVariant(vs.variants)) {
    const effectiveVs = getEffectiveVariantSettingForInsertable(
      tpl,
      vs.variants,
      sourceComp,
      sourceSite
    );
    const effectiveRsh = effectiveVs.rshWithThemeSlot();
    for (const prop of effectiveRsh.props()) {
      fixedRsh.set(prop, effectiveRsh.get(prop));
    }
  } else {
    // In case we are not dealing with the base variant we just use the directly setted props
    fixedRsh.mergeRs(vs.rs);
  }

  const targetRsh = new RuleSetHelpers(vs.rs, tpl.tag);
  targetRsh.mergeRs(fixedRsh.rs());
};

export function mkTextTplStyleFixer(sourceComp: Component, sourceSite: Site) {
  return (tpl: TplNode, vs: VariantSetting) => {
    if (isTplTextBlock(tpl)) {
      fixTextTplStyles(tpl, vs, sourceComp, sourceSite);
    }
  };
}

type ValidVariantsFilter = (tpl: TplNode, tv: TargetVariants) => void;

type ContextHelpers = {
  resolveTokens: (tplTree: TplNode) => void;
  getNewImageAsset: (asset: ImageAsset) => ImageAsset | undefined;
  tplAssetFixer: TplVSettingFixer;
  fixTextTplStyles: TplVSettingFixer;
};

function isInvalidTextOrDynamicExpression(
  expr: CustomCode | ObjectPath | TemplatedString,
  invalidExprNames: string[]
) {
  // We've to figure it out if the expression is invalid or not, this can happen
  // to owned trees, which try to reference data source operations which have been
  // removed from the component.
  // In unowned trees, we have to consider data source operations, state, and props
  // Checking if the expression contain $ and any invalid name is a good enough
  // heuristic to determine if the expression is invalid
  const isInvalidText = (text: string) =>
    text.includes("$") && invalidExprNames.some((n) => text.includes(n));

  if (isKnownCustomCode(expr)) {
    return isInvalidText(expr.code);
  }
  if (isKnownObjectPath(expr)) {
    const path = expr.path.join(".");
    return isInvalidText(path);
  }
  if (isKnownTemplatedString(expr)) {
    return expr.text.some((t) => {
      if (isString(t)) {
        return false;
      }
      return isInvalidTextOrDynamicExpression(t, invalidExprNames);
    });
  }
  unexpected("Invalid expression type");
}

interface ExprFixerCtx {
  isOwned: boolean;
  invalidExprNames: string[];
}

function getFixedExpr(
  ctx: ExprFixerCtx,
  expr: Expr,
  helpers: Pick<ContextHelpers, "getNewImageAsset">
) {
  const { isOwned, invalidExprNames } = ctx;

  if (isOwned) {
    // If we are dealing with an owned tree, we just need to fix image assets references to be sure
    // that they are included in the new site
    return switchType(expr)
      .when([ImageAssetRef], (_expr) => {
        const newAsset = helpers.getNewImageAsset(_expr.asset);
        if (newAsset) {
          return new ImageAssetRef({ asset: newAsset });
        }
        return null;
      })
      .when([PageHref], (_expr) => null)
      .elseUnsafe(() => expr);
  }

  return (
    switchType(expr)
      .when([CustomCode, ObjectPath, TemplatedString], (_expr) => {
        // should check for invalid names based on the component / context
        if (isInvalidTextOrDynamicExpression(_expr, invalidExprNames)) {
          return null;
        }

        // If there is a fallback, let's fix it
        if (isFallbackableExpr(_expr) && _expr.fallback) {
          _expr.fallback = getFixedExpr(ctx, _expr.fallback, helpers);
        }

        return expr;
      })
      // Should be fixed by the component importer `mkInsertableComponentImporter`
      .when([VirtualRenderExpr, RenderExpr], (_expr) => expr)
      // Should have been fixed the asset fixer `makeImageAssetFixer`
      .when([ImageAssetRef], (_expr) => {
        const newAsset = helpers.getNewImageAsset(_expr.asset);
        if (newAsset) {
          return new ImageAssetRef({ asset: newAsset });
        }
        return null;
      })
      .when([VarRef], (_expr) => null)
      // TODO: handle event handlers, this may depend on `isOwned`
      .when([EventHandler], (_expr) => {
        return null;
      })
      // TODO: handle style expr so that customizations to code components through
      // class are not lost
      .when([StyleExpr], (_expr) => null)
      // VariantsRef should have been fixed when the component was imported/swapped
      .when([VariantsRef], (_expr) => _expr)
      // TODO: possible to handle if it's possible to reference the same page in the target
      .when([PageHref], (_expr) => null)
      .when([CompositeExpr], (_expr) => {
        return new CompositeExpr({
          hostLiteral: _expr.hostLiteral,
          substitutions: Object.entries(_expr.substitutions ?? {}).reduce(
            (acc, [key, value]) => {
              const fixedValue = getFixedExpr(ctx, value, helpers);
              if (fixedValue) {
                acc[key] = fixedValue;
              }
              return acc;
            },
            {} as CompositeExpr["substitutions"]
          ),
        });
      })
      .elseUnsafe(() => null)
  );
}

export function fixTplTreeExprs(
  ctx: ExprFixerCtx,
  tpl: TplNode,
  vs: VariantSetting,
  helpers: Pick<ContextHelpers, "getNewImageAsset">
) {
  const { invalidExprNames } = ctx;

  for (const arg of [...vs.args]) {
    const fixedExpr = getFixedExpr(ctx, arg.expr, helpers);
    if (!fixedExpr) {
      remove(vs.args, arg);
    } else {
      arg.expr = fixedExpr;
    }
  }

  for (const attrName of Object.keys(vs.attrs)) {
    const attr = vs.attrs[attrName];
    const fixedExpr = getFixedExpr(ctx, attr, helpers);

    if (!fixedExpr) {
      delete vs.attrs[attrName];
    } else {
      vs.attrs[attrName] = fixedExpr;
    }
  }

  if (isKnownExprText(vs.text)) {
    if (isInvalidTextOrDynamicExpression(vs.text.expr, invalidExprNames)) {
      // We remove the full text, as we can't resolve it
      vs.text = null;
    }
  }

  if (vs.dataCond) {
    if (isInvalidTextOrDynamicExpression(vs.dataCond, invalidExprNames)) {
      // We may not be able to resolve the condition, just remove it
      delete vs.dataCond;
    }
  }

  if (vs.dataRep?.collection) {
    if (
      isInvalidTextOrDynamicExpression(vs.dataRep?.collection, invalidExprNames)
    ) {
      // We may not be able to resolve the collection, but we will keep a
      // a collection, so that the element still keeps a valid tree
      vs.dataRep.collection = code("[]");
    }
  }
}

export function fixComponentExprs(
  ctx: ExprFixerCtx,
  comp: Component,
  helpers: Pick<ContextHelpers, "getNewImageAsset">
) {
  for (const param of comp.params) {
    if (param.defaultExpr) {
      const newDefaultExpr = getFixedExpr(ctx, param.defaultExpr, helpers);
      if (newDefaultExpr) {
        param.defaultExpr = newDefaultExpr;
      } else {
        param.defaultExpr = null;
      }
    }

    if (param.previewExpr) {
      const newPreviewExpr = getFixedExpr(ctx, param.previewExpr, helpers);
      if (newPreviewExpr) {
        param.previewExpr = newPreviewExpr;
      } else {
        param.previewExpr = null;
      }
    }
  }
}

/**
So we need to ensure the following to have a valid tree:
- Inline mixins, currently importing mixins is not supported
- Resolve tokens, either by inlining them or by adding them to the target site
  * This is defined outside of this function
- Remove invalid vsettings
  * This varies depending whether the tree is owned or not
- Remove references to DataSourceOp
- Remove references to state
- Remove invalid references to PageHref
- Remove invalid assets references
- Remove any custom code expression with $
  - This is intended to ensure that we don't have any code expression that references owner
    component specific data. The condition is generic to cover most cases as $ctx, $state, $$, ...
 */
function traverseAndFixTree(
  tplTree: TplNode,
  targetVariants: TargetVariants,
  filter: ValidVariantsFilter,
  specificFixes: TplVSettingFixer,
  helpers: Omit<ContextHelpers, "fixTextTplStyles">
) {
  inlineMixins(tplTree);
  helpers.resolveTokens(tplTree);

  for (const tpl of flattenTpls(tplTree)) {
    filter(tpl, targetVariants);

    for (const vs of tpl.vsettings) {
      helpers.tplAssetFixer(tpl, vs);

      specificFixes(tpl, vs);
    }
  }
}

/**
A unowned tree is a tree that is going to be inserted into the project without the owner
component in the original project.
**/
export function ensureValidUnownedTree(
  tplTree: TplNode,
  targetVariants: TargetVariants,
  helpers: ContextHelpers,
  invalidExprNames: string[]
) {
  for (const [vs, tpl] of findVariantSettingsUnderTpl(tplTree)) {
    // We need to fix text styles here as we aren't sure about the inherited values
    // they may have, we can opt out of this too and let the target design affect
    // those style attributes. We do this beforehand so that we only fix tokens
    // after new styles have been applied
    helpers.fixTextTplStyles(tpl, vs);
  }

  traverseAndFixTree(
    tplTree,
    targetVariants,
    (tpl, tv) => {
      ensureTplWithBaseAndScreenVariants(tpl, tv.baseVariant, tv.screenVariant);
    },
    (tpl, vs) => {
      fixTplTreeExprs(
        {
          isOwned: false,
          invalidExprNames,
        },
        tpl,
        vs,
        helpers
      );
    },
    helpers
  );
}

export function getInvalidComponentNames(
  ownerComponent: Component,
  isOwned: boolean
) {
  return [
    ...ownerComponent.dataQueries.map((q) => toVarName(q.name)),
    // If the component is owned we don't need to remove the states and params
    // as they are going to be used in the tree, otherwise we need to remove them
    ...(isOwned
      ? []
      : [
          // TODO: Is it possible to improve the handling of nested states? Operations like
          // ($state.something).somethingElse are hard to handle
          ...ownerComponent.states.flatMap((s) => {
            const name = s.param.variable.name;
            return name.split(" ").map((n) => toVarName(n));
          }),
          ...ownerComponent.params.map((p) => toVarName(p.variable.name)),
        ]),
  ];
}

/**
A owned tree is a tree from a component that is being inserted into the project.
 */
export function ensureValidClonedComponent(
  ownerComponent: Component,
  targetVariants: TargetVariants,
  helpers: Omit<ContextHelpers, "fixTextTplStyles">
) {
  // Collect names of data queries to remove them from the component
  const invalidNames = getInvalidComponentNames(ownerComponent, true);
  // Remove data queries from the component as we properly bind them
  ownerComponent.dataQueries = [];

  // Fix the component expressions present in component params
  fixComponentExprs(
    {
      isOwned: true,
      invalidExprNames: invalidNames,
    },
    ownerComponent,
    helpers
  );

  // Fix issues in the tree
  traverseAndFixTree(
    ownerComponent.tplTree,
    targetVariants,
    // Variants filter
    (tpl, tv) => {
      ensureNonGlobalVariants(tpl, {
        screenVariant: tv.screenVariant,
      });
    },
    // Fixes for the tree
    (tpl, vs) => {
      fixTplTreeExprs(
        {
          isOwned: true,
          invalidExprNames: invalidNames,
        },
        tpl,
        vs,
        helpers
      );
    },
    helpers
  );
}

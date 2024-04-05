import {
  Component,
  CustomCode,
  ImageAsset,
  ImageAssetRef,
  isKnownCustomCode,
  isKnownExprText,
  isKnownImageAssetRef,
  isKnownObjectPath,
  isKnownTemplatedString,
  isKnownTplTag,
  ObjectPath,
  PageHref,
  RenderExpr,
  RuleSet,
  Site,
  StyleExpr,
  StyleToken,
  TemplatedString,
  TplNode,
  Variant,
  VariantedValue,
  VariantSetting,
  VariantsRef,
  VirtualRenderExpr,
} from "@/wab/classes";
import {
  arrayEqIgnoreOrder,
  assert,
  remove,
  switchType,
  unexpected,
  withoutNils,
} from "@/wab/common";
import {
  derefToken,
  derefTokenRefs,
  hasTokenRefs,
  mkTokenRef,
  replaceAllTokenRefs,
  resolveAllTokenRefs,
  TokenType,
} from "@/wab/commons/StyleToken";
import { isCodeComponent, isPlumeComponent } from "@/wab/components";
import { InsertableTemplateTokenResolution } from "@/wab/devflags";
import { code } from "@/wab/exprs";
import { ImageAssetType } from "@/wab/image-asset-type";
import { mkImageAssetRef } from "@/wab/image-assets";
import { getEffectiveVariantSettingForInsertable } from "@/wab/shared/effective-variant-setting";
import {
  inlineMixins,
  inlineTokens,
} from "@/wab/shared/insertable-templates/inliners";
import { TargetVariants } from "@/wab/shared/insertable-templates/types";
import {
  joinCssValues,
  RSH,
  RuleSetHelpers,
  splitCssValue,
} from "@/wab/shared/RuleSetHelpers";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  isBaseVariant,
  isGlobalVariant,
  isScreenVariant,
} from "@/wab/shared/Variants";
import {
  findVariantSettingsUnderTpl,
  flattenTpls,
  isTplComponent,
  isTplSlot,
  isTplTextBlock,
  TplTextTag,
  walkTpls,
} from "@/wab/tpls";
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

export function makeImageAssetFixer(
  site: Site,
  allImageAssetsDict: Record<string, ImageAsset>
): TplVSettingFixer {
  const tplMgr = new TplMgr({ site: site });

  const oldToNew = new Map<ImageAsset, ImageAsset>();
  const getImageAsset = (asset: ImageAsset) => {
    if (!asset.dataUri) {
      return undefined;
    }

    if (oldToNew.has(asset)) {
      return oldToNew.get(asset)!;
    }
    const newAsset = tplMgr.addImageAsset({
      name: asset.type === ImageAssetType.Icon ? "icon" : "image",
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

  return (tpl: TplNode, vs: VariantSetting) => {
    for (const [attr, expr] of [...Object.entries(vs.attrs)]) {
      if (isKnownImageAssetRef(expr)) {
        const newAsset = getImageAsset(expr.asset);
        if (newAsset) {
          vs.attrs[attr] = new ImageAssetRef({ asset: newAsset });
        } else {
          delete vs.attrs[attr];
        }
      }
    }

    for (const [prop, arg] of [...Object.entries(vs.args)]) {
      if (isKnownImageAssetRef(arg.expr)) {
        const newAsset = getImageAsset(arg.expr.asset);
        if (newAsset) {
          arg.expr = new ImageAssetRef({ asset: newAsset });
        } else {
          delete vs.args[prop];
        }
      }
    }

    fixBackgroundImage(tpl, vs, allImageAssetsDict, getImageAsset);
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
      value: derefToken(oldTokens, oldToken),
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
  allTokens: StyleToken[],
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

  for (const prop of fixedRsh.props()) {
    const val = fixedRsh.getRaw(prop);
    if (val) {
      fixedRsh.set(prop, resolveAllTokenRefs(val, allTokens));
    }
  }
  const targetRsh = new RuleSetHelpers(vs.rs, tpl.tag);
  targetRsh.mergeRs(fixedRsh.rs());
};

export function mkTextTplStyleFixer(
  oldTokens: StyleToken[],
  sourceComp: Component,
  sourceSite: Site
) {
  return (tpl: TplNode, vs: VariantSetting) => {
    if (isTplTextBlock(tpl)) {
      fixTextTplStyles(tpl, vs, oldTokens, sourceComp, sourceSite);
    }
  };
}

export function fixTplTreeExprs(tpl: TplNode, vs: VariantSetting) {
  function isInvalidTextOrDynamicExpression(
    expr: CustomCode | ObjectPath | TemplatedString
  ) {
    // TODO: handle props known through tpl.component
    if (isKnownCustomCode(expr)) {
      return expr.code.includes("$");
    }
    if (isKnownObjectPath(expr)) {
      return expr.path.join(".").includes("$");
    }
    if (isKnownTemplatedString(expr)) {
      return expr.text.some((t) => {
        if (isString(t)) {
          return false;
        }
        return isInvalidTextOrDynamicExpression(t);
      });
    }
    unexpected("Invalid expression type");
  }

  for (const arg of [...vs.args]) {
    const fixedExpr = switchType(arg.expr)
      .when([CustomCode, ObjectPath, TemplatedString], (expr) => {
        return isInvalidTextOrDynamicExpression(expr) ? null : expr;
      })
      // Should be fixed by the component importer `mkInsertableComponentImporter`
      .when([VirtualRenderExpr, RenderExpr], (expr) => expr)
      // Should have been fixed the asset fixer `makeImageAssetFixer`
      .when([ImageAssetRef], (expr) => expr)
      // TODO: handle style expr so that customizations to code components through
      // class are not lost
      .when([StyleExpr], (expr) => null)
      // TODO: handle variants ref, this may depend whether the tree is owned or not
      .when([VariantsRef], (expr) => null)
      // TODO: possible to handle if it's possible to reference the same page in the target
      .when([PageHref], (expr) => null)

      .elseUnsafe(() => null);
    if (!fixedExpr) {
      remove(vs.args, arg);
    } else {
      arg.expr = fixedExpr;
    }
  }

  for (const attrName of Object.keys(vs.attrs)) {
    const attr = vs.attrs[attrName];
    const fixedExpr = switchType(attr)
      .when([CustomCode, ObjectPath, TemplatedString], (expr) => {
        return isInvalidTextOrDynamicExpression(expr) ? null : expr;
      })
      .when([ImageAssetRef], (expr) => expr)
      .elseUnsafe(() => null);

    if (!fixedExpr) {
      delete vs.attrs[attrName];
    }
  }

  if (isKnownExprText(vs.text)) {
    if (isInvalidTextOrDynamicExpression(vs.text.expr)) {
      // We remove the full text, as we can't resolve it
      vs.text = null;
    }
  }

  if (vs.dataCond) {
    if (isInvalidTextOrDynamicExpression(vs.dataCond)) {
      // We may not be able to resolve the condition, just remove it
      delete vs.dataCond;
    }
  }

  if (vs.dataRep?.collection) {
    if (isInvalidTextOrDynamicExpression(vs.dataRep?.collection)) {
      // We may not be able to resolve the collection, but we will keep a
      // a collection, so that the element still keeps a valid tree
      vs.dataRep.collection = code("[]");
    }
  }
}

type ValidVariantsFilter = (tpl: TplNode, tv: TargetVariants) => void;

type ContextualizedFixers = {
  resolveTokens: (tplTree: TplNode) => void;
  fixAssets: TplVSettingFixer;
  fixTextTplStyles: TplVSettingFixer;
};

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
  fixers: Omit<ContextualizedFixers, "fixTextTplStyles">
) {
  inlineMixins(tplTree);
  fixers.resolveTokens(tplTree);

  for (const tpl of flattenTpls(tplTree)) {
    filter(tpl, targetVariants);

    for (const vs of tpl.vsettings) {
      fixers.fixAssets(tpl, vs);

      // This shouldn't be a generic fix
      fixTplTreeExprs(tpl, vs);

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
  fixers: ContextualizedFixers
) {
  traverseAndFixTree(
    tplTree,
    targetVariants,
    (tpl, tv) => {
      ensureTplWithBaseAndScreenVariants(tpl, tv.baseVariant, tv.screenVariant);
    },
    (tpl, vs) => {
      // We need to fix text styles here as we aren't sure about the inherited values
      // they may have, we can opt out of this too and let the target design affect
      // those style attributes
      fixers.fixTextTplStyles(tpl, vs);
    },
    fixers
  );
}

/**
A owned tree is a tree from a component that is being inserted into the project.
 */
export function ensureValidOwnedTree(
  tplTree: TplNode,
  targetVariants: TargetVariants,
  fixers: Omit<ContextualizedFixers, "fixTextTplStyles">
) {
  traverseAndFixTree(
    tplTree,
    targetVariants,
    (tpl, tv) => {
      ensureNonGlobalVariants(tpl, {
        screenVariant: tv.screenVariant,
      });
    },
    (tpl, vs) => {},
    fixers
  );
}

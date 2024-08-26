import { assert, unexpected } from "@/wab/shared/common";
import {
  isCodeComponent,
  isPageComponent,
  isPlainComponent,
} from "@/wab/shared/core/components";
import { getCssRulesFromRs } from "@/wab/shared/css";
import { isFallbackableExpr, tryExtractJson } from "@/wab/shared/core/exprs";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import {
  cleanPlainText,
  paramToVarName,
  toClassName,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  isTagInline,
  normalizeMarkers,
} from "@/wab/shared/core/rich-text-util";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
  Component,
  Expr,
  isKnownExprText,
  isKnownRawText,
  RichText,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";
import {
  makeVariantComboSorter,
  sortedVariantSettings,
  VariantComboSorter,
} from "@/wab/shared/variant-sort";
import {
  ensureValidCombo,
  getBaseVariant,
  isBaseVariant,
  tryGetBaseVariantSetting,
  VariantCombo,
} from "@/wab/shared/Variants";
import {
  flattenTpls,
  hasTextAncestor,
  isTplComponent,
  isTplNamable,
  isTplTag,
  isTplTextBlock,
  isTplVariantable,
  tplChildren,
  TplTextTag,
} from "@/wab/shared/core/tpls";
import { genTranslatableString } from "@plasmicapp/react-web";
import { isEmpty, sortBy, uniq } from "lodash";
import React from "react";

export type LocalizationKeyScheme = "content" | "hash" | "path";

export interface LocalizationConfig {
  keyScheme: LocalizationKeyScheme;
  tagPrefix: string | undefined;
}

export function createLocalizationHashKey(s: string) {
  // This only works on the server! But only the server needs to create hash keys
  const { createHash } = eval("require")("crypto");
  return createHash("md5").update(s).digest("hex");
}

export function genLocalizationStringsForProject(
  projectId: ProjectId,
  site: Site,
  opts: LocalizationConfig
): Record<string, string> {
  const localizedStrs: Record<string, string> = {};

  const components = site.components.filter(
    (c) => isPageComponent(c) || isPlainComponent(c)
  );

  for (const component of components) {
    const variantComboSorter = makeVariantComboSorter(site, component);
    if (!isCodeComponent(component)) {
      for (const param of component.params) {
        if (param.isLocalizable && param.defaultExpr) {
          const lit = tryExtractJson(param.defaultExpr);
          if (typeof lit === "string") {
            const key = makeLocalizationStringKey(
              lit,
              {
                type: "default-param-expr",
                projectId,
                site,
                component,
                attr: paramToVarName(component, param),
              },
              opts
            );
            localizedStrs[key] = lit;
          }
        }
      }
    }

    for (const tpl of flattenComponent(component)) {
      // Extract localizable text blocks
      if (
        isTplTextBlock(tpl) &&
        !hasTextAncestor(tpl) &&
        isLocalizableTextBlock(tpl)
      ) {
        // If this is a "root" tpl text block -- that is, it is the start
        // of a rich text block, and not an embedded text block in a
        // rich text block -- then generate the content as a localizable
        // string.
        const variantCombos = extractAllVariantCombosForText(component, tpl);
        for (const combo of variantCombos) {
          const str = genLocalizationString(
            site,
            tpl,
            combo,
            variantComboSorter,
            opts
          );
          const key = makeLocalizationStringKey(
            str,
            {
              type: "text",
              projectId,
              site,
              component,
              tpl,
              variantCombo: combo,
            },
            opts
          );
          localizedStrs[key] = str;
        }
      }

      const maybeLocalizeExpr = (
        attr: string,
        expr: Expr,
        combo: VariantCombo
      ) => {
        const lit = tryExtractJson(expr);
        if (typeof lit === "string") {
          const key = makeLocalizationStringKey(
            lit,
            {
              type: "attr",
              projectId,
              site,
              component,
              tpl,
              variantCombo: combo,
              attr,
            },
            opts
          );
          localizedStrs[key] = lit;
        }
        if (isFallbackableExpr(expr) && expr.fallback) {
          maybeLocalizeExpr(attr, expr.fallback, combo);
        }
      };

      // Extract localizable element attributes
      if (isTplTag(tpl)) {
        for (const vs of tpl.vsettings) {
          for (const [attr, expr] of Object.entries(vs.attrs)) {
            if (LOCALIZABLE_HTML_ATTRS.includes(attr)) {
              maybeLocalizeExpr(attr, expr, vs.variants);
            }
          }
        }
      }

      // Extract localizable component args
      if (isTplComponent(tpl)) {
        for (const vs of tpl.vsettings) {
          for (const arg of vs.args) {
            if (arg.param.isLocalizable) {
              maybeLocalizeExpr(
                paramToVarName(tpl.component, arg.param),
                arg.expr,
                vs.variants
              );
            }
          }
        }
        if (isCodeComponent(tpl.component)) {
          const baseVs = tryGetBaseVariantSetting(tpl);
          const baseVsArgParams = new Set(
            baseVs?.args.map((arg) => arg.param) ?? []
          );
          tpl.component.params.forEach((p) => {
            if (
              p.isLocalizable &&
              p.defaultExpr &&
              baseVs &&
              !baseVsArgParams.has(p)
            ) {
              maybeLocalizeExpr(
                paramToVarName(tpl.component, p),
                p.defaultExpr,
                baseVs.variants
              );
            }
          });
        }
      }
    }
  }

  return localizedStrs;
}

/**
 * For now, a tpl text block is only localizable if it doesn't use any
 * dynamic expression in any of its variants
 */
export function isLocalizableTextBlock(tpl: TplTextTag) {
  const rec = (node: TplNode): boolean => {
    if (isTplTextBlock(node)) {
      for (const vs of node.vsettings) {
        if (isKnownExprText(vs.text)) {
          return false;
        }
      }
      if (node.children.some((c) => !rec(c))) {
        return false;
      }
      return true;
    } else if (isTplTag(node)) {
      return node.children.every((c) => rec(c));
    } else {
      unexpected("Unexpected child of TplTextTag");
    }
  };
  return rec(tpl);
}

interface ParamDefaultExprSource {
  type: "default-param-expr";
  projectId: ProjectId;
  site: Site;
  component: Component;
  attr: string;
}

interface TplTextSource {
  type: "text";
  projectId: ProjectId;
  site: Site;
  component: Component;
  tpl: TplNode;
  variantCombo: VariantCombo;
}

interface TplAttrSource {
  type: "attr";
  projectId: ProjectId;
  site: Site;
  component: Component;
  tpl: TplNode;
  variantCombo: VariantCombo;
  attr: string;
}

export type LocalizableStringSource =
  | ParamDefaultExprSource
  | TplTextSource
  | TplAttrSource;

export function makeLocalizationStringKey(
  str: string,
  source: LocalizableStringSource,
  opts: LocalizationConfig
) {
  if (opts.keyScheme === "content") {
    return str;
  } else if (opts.keyScheme === "hash") {
    return createLocalizationHashKey(str);
  } else if (opts.keyScheme === "path") {
    const { projectId, component } = source;
    const parts = [projectId, toClassName(component.name)];

    if (source.type === "default-param-expr") {
      // Looks like PROJECT.COMPONENT.__defaults__.ATTR
      parts.push("__defaults__", toVarName(source.attr));
    } else {
      const { tpl, variantCombo } = source;

      // Use tpl.name, fallback to tpl.uuid
      const tplPart = (isTplNamable(tpl) ? tpl.name : undefined) ?? tpl.uuid;
      const comboPart = variantCombo
        .map((v) =>
          toVarName(
            v.selectors
              ? v.selectors.map((s) => toVarName(s)).join("&")
              : v.name
          )
        )
        .join("-");

      parts.push(tplPart);
      if (source.type === "text") {
        // Looks like PROJECT.COMPONENT.TPL.__text__.VARIANTS
        parts.push("__text__", comboPart);
      } else {
        // Looks like PROJECT.COMPONENT.TPL.ATTR.VARIANTS
        parts.push(toVarName(source.attr), comboPart);
      }
    }
    return parts.join(".");
  } else {
    unexpected();
  }
}

export function extractAllVariantCombosForText(
  component: Component,
  tpl: TplTextTag
) {
  const combos: VariantCombo[] = [];
  const getComboKey = (combo: VariantCombo) =>
    sortBy(combo.map((v) => v.uuid)).join(";");
  const usedComboKeys = new Set<string>();

  const maybeAddCombo = (combo: VariantCombo) => {
    const newCombo = ensureValidCombo(component, combo);
    const newComboKey = getComboKey(newCombo);
    if (!usedComboKeys.has(newComboKey)) {
      usedComboKeys.add(newComboKey);
      combos.push(newCombo);
    }
  };

  maybeAddCombo([getBaseVariant(component)]);

  flattenTpls(tpl)
    .flatMap((tpl2) => (isTplVariantable(tpl2) ? tpl2.vsettings : []))
    .forEach((vs) => {
      if (vs.text && !usedComboKeys.has(getComboKey(vs.variants))) {
        [...combos].forEach((combo) => {
          maybeAddCombo(uniq([...combo, ...vs.variants]));
        });
      }
    });
  return combos;
}

export function genLocalizationString(
  site: Site,
  tpl: TplTextTag,
  combo: VariantCombo,
  variantComboSorter: VariantComboSorter,
  opts: {
    tagPrefix: string | undefined;
  }
) {
  const elt = createDummyEltForTextBlock(site, tpl, combo, variantComboSorter);
  return genTranslatableString(elt, opts).str;
}

function createDummyEltForTextBlock(
  site: Site,
  textRoot: TplTextTag,
  combo: VariantCombo,
  variantComboSorter: VariantComboSorter
) {
  let keyCount = 0;
  const DummyReactComponent = (_props: { children?: React.ReactNode }) => null;

  const rec = (tpl: TplNode) => {
    if (isTplTextBlock(tpl)) {
      const activeVariants = new Set(combo);
      const activeVariantSettings = sortedVariantSettings(
        tpl.vsettings.filter((vs) =>
          vs.variants.every((v) => isBaseVariant(v) || activeVariants.has(v))
        ),
        variantComboSorter
      );
      const effectiveVS = new EffectiveVariantSetting(
        tpl,
        activeVariantSettings,
        site
      );
      if (tpl === textRoot) {
        return resolveRichTextToDummyElt(effectiveVS.text);
      }
      return (
        <DummyReactComponent key={keyCount++}>
          {resolveRichTextToDummyElt(effectiveVS.text)}
        </DummyReactComponent>
      );
    } else {
      if (isTplTag(tpl)) {
        return (
          <DummyReactComponent key={keyCount++}>
            {tplChildren(tpl).map(rec)}
          </DummyReactComponent>
        );
      }
      return <DummyReactComponent key={keyCount++} />;
    }
  };

  // Important: Strings and React tree's structure must match up
  // `resolveRichTextToJsx` :/
  const resolveRichTextToDummyElt = (text: RichText | null | undefined) => {
    if (!text) {
      return "";
    }

    if (isKnownExprText(text)) {
      // Expressions aren't localizable strings for now
      return <DummyReactComponent key={keyCount++} />;
    }

    assert(isKnownRawText(text), "Expected `text` to be of type `RawText`");

    if (text.markers.length === 0) {
      return cleanPlainText(text.text);
    }

    const normalizedMarkers = normalizeMarkers(text.markers, text.text.length);
    const children: React.ReactNode[] = [];
    for (let i = 0; i < normalizedMarkers.length; i++) {
      const marker = normalizedMarkers[i];
      if (marker.type === "nodeMarker") {
        children.push(rec(marker.tpl));
      } else {
        // We need the CSS rules to decide whether we wrap the text in a
        // component (or a span, in codegen) or not.
        const cssRules =
          marker.type === "styleMarker"
            ? getCssRulesFromRs(marker.rs, true)
            : {};
        const prevMarker = i > 0 ? normalizedMarkers[i - 1] : undefined;

        // We also need to make sure the generated strings are the same
        // as the ones from codegen.
        const plainText = cleanPlainText(
          text.text.substr(marker.position, marker.length),
          prevMarker?.type === "nodeMarker" &&
            isTplTag(prevMarker.tpl) &&
            !isTagInline(prevMarker.tpl.tag)
        );

        if (isEmpty(cssRules)) {
          children.push(
            <React.Fragment key={keyCount++}>{plainText}</React.Fragment>
          );
        } else {
          children.push(
            <DummyReactComponent key={keyCount++}>
              {plainText}
            </DummyReactComponent>
          );
        }
      }
    }

    return <React.Fragment>{...children}</React.Fragment>;
  };

  return rec(textRoot);
}

export const LOCALIZABLE_HTML_ATTRS = [
  "title",
  "alt",
  "placeholder",
  "aria-label",
  "aria-description",
];

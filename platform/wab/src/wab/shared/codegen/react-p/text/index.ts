// Important: If we change the generated strings we need to update
// `resolveRichTextToDummyElt` in `shared/localization.tsx` as well :/
import { ProjectId } from "@/wab/shared/ApiSchema";
import { VariantCombo, isBaseVariant } from "@/wab/shared/Variants";
import {
  makeDefaultStyleClassNameBase,
  makeWabHtmlTextClassName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { joinVariantVals } from "@/wab/shared/codegen/react-p/utils";
import {
  cleanPlainText,
  jsLiteral,
  jsString,
  plainTextToReact,
} from "@/wab/shared/codegen/util";
import { assert, ensure, tuple } from "@/wab/shared/common";
import { getCodeExpressionWithFallback } from "@/wab/shared/core/exprs";
import {
  isTagInline,
  normalizeMarkers,
} from "@/wab/shared/core/rich-text-util";
import { defaultStyleClassNames } from "@/wab/shared/core/styles";
import { TplTextTag, isTplTag } from "@/wab/shared/core/tpls";
import { getCssRulesFromRs } from "@/wab/shared/css";
import {
  LocalizationConfig,
  extractAllVariantCombosForText,
  genLocalizationString,
  isLocalizableTextBlock,
  makeLocalizationStringKey,
} from "@/wab/shared/localization";
import {
  RichText,
  VariantSetting,
  isKnownCustomCode,
  isKnownExprText,
  isKnownObjectPath,
  isKnownRawText,
} from "@/wab/shared/model/classes";
import L from "lodash";
import memoizeOne from "memoize-one";

function resolveRichTextToJsx(
  ctx: SerializerBaseContext,
  text: RichText | null | undefined
) {
  if (!text) {
    return { content: "", isDynamic: false };
  }

  if (isKnownExprText(text)) {
    assert(
      isKnownCustomCode(text.expr) || isKnownObjectPath(text.expr),
      "Expected CustomCode or ObjectPath expr"
    );
    const textCode = getCodeExpressionWithFallback(text.expr, ctx.exprCtx);
    const className =
      ctx.exportOpts.stylesOpts.scheme === "css-modules"
        ? `projectcss.${makeWabHtmlTextClassName(ctx.exportOpts)}`
        : jsLiteral(makeWabHtmlTextClassName(ctx.exportOpts));
    const code = text.html
      ? `<div className={${className}} dangerouslySetInnerHTML={{ __html: ${textCode} }} />`
      : `<React.Fragment>{${textCode}}</React.Fragment>`;
    return {
      content: code,
      isDynamic: true,
    };
  }

  assert(isKnownRawText(text), "Expected RawText expr");

  const richTextRoot = !ctx.insideRichTextBlock;

  if (text.markers.length === 0) {
    const content = ctx.exportOpts.whitespaceNormal
      ? `<React.Fragment>${plainTextToReact(text.text)}</React.Fragment>`
      : jsLiteral(cleanPlainText(text.text));
    return { content, isDynamic: false };
  }

  const normalizedMarkers = normalizeMarkers(text.markers, text.text.length);

  const spanClassName = defaultStyleClassNames(
    makeDefaultStyleClassNameBase(ctx.exportOpts),
    "span"
  ).join(" ");

  const children: string[] = [];
  ctx.insideRichTextBlock = true;

  for (let i = 0; i < normalizedMarkers.length; i++) {
    const marker = normalizedMarkers[i];
    if (marker.type === "nodeMarker") {
      children.push(`{${ctx.serializeTplNode(ctx, marker.tpl)}}`);
    } else {
      const cssRules =
        marker.type === "styleMarker" ? getCssRulesFromRs(marker.rs, true) : {};

      // If the previous marker was a block-level element, we must remove one
      // line break from the beginning of the text so `white-space: pre-wrap`
      // will not print an unwanted line break.
      const prevMarker = i > 0 ? normalizedMarkers[i - 1] : undefined;
      const textPart = text.text.substr(marker.position, marker.length);
      const removeInitialLineBreak =
        prevMarker?.type === "nodeMarker" &&
        isTplTag(prevMarker.tpl) &&
        !isTagInline(prevMarker.tpl.tag);
      const plainText = ctx.exportOpts.whitespaceNormal
        ? plainTextToReact(textPart, removeInitialLineBreak)
        : "{" +
          jsLiteral(cleanPlainText(textPart, removeInitialLineBreak)) +
          "}";

      if ("fontWeight" in cssRules) {
        // fontWeight is typed as a number
        cssRules["fontWeight"] = parseInt(cssRules["fontWeight"]) as any;
      }

      if (L.isEmpty(cssRules)) {
        children.push(`<React.Fragment>${plainText}</React.Fragment>`);
      } else {
        // We make sure these spans also have the default class names, so they properly
        // override any global styles for span.
        children.push(
          `<span className={"${spanClassName}"} style={${JSON.stringify(
            cssRules
          )}}>${plainText}</span>`
        );
      }
    }
  }
  if (richTextRoot) {
    ctx.insideRichTextBlock = false;
  }

  const content = `<React.Fragment>${children.join("")}</React.Fragment>`;
  return {
    content,
    isDynamic: false,
  };
}

function serializeLocalizationKey(ctx: SerializerBaseContext, tpl: TplTextTag) {
  const keyScheme = ctx.exportOpts.localization?.keyScheme ?? "content";
  if (keyScheme === "content") {
    return undefined;
  }

  const { site, component, variantComboSorter, variantComboChecker } = ctx;

  const combos = extractAllVariantCombosForText(component, tpl);

  const opts: LocalizationConfig = {
    keyScheme,
    tagPrefix: ctx.exportOpts.localization?.tagPrefix,
  };
  const comboValues: [string, VariantCombo][] = combos.map((combo) => [
    jsLiteral(
      makeLocalizationStringKey(
        genLocalizationString(site, tpl, combo, variantComboSorter, opts),
        {
          type: "text",
          projectId: ctx.projectConfig.projectId as ProjectId,
          site,
          component,
          tpl,
          variantCombo: combo,
        },
        opts
      )
    ),
    combo,
  ]);

  const baseValue = ensure(
    comboValues.find(([_str, combo]) => isBaseVariant(combo)),
    `There must be a base variant`
  )[0];

  const nonBaseValues = comboValues.filter(
    ([_str, combo]) => !isBaseVariant(combo)
  );

  return joinVariantVals(nonBaseValues, variantComboChecker, baseValue).value;
}

export function serializeTplTextBlockContent(
  ctx: SerializerBaseContext,
  node: TplTextTag,
  orderedVsettings: VariantSetting[]
) {
  const { variantComboChecker } = ctx;
  const textSettings = orderedVsettings.filter((vs) => !!vs.text);
  const useTranslation = ctx.projectFlags.usePlasmicTranslation;
  const transKey =
    useTranslation && isLocalizableTextBlock(node)
      ? memoizeOne(() => serializeLocalizationKey(ctx, node))
      : undefined;

  const rawStringAndVariants = textSettings.map((vs) => {
    const res = resolveRichTextToJsx(ctx, vs.text);
    return tuple(res.content || "", vs.variants);
  });
  const r = joinVariantVals(
    rawStringAndVariants.map(([rawString, variants]) =>
      tuple(rawString, variants)
    ),
    variantComboChecker,
    jsString("")
  );

  let value = r.value;
  if (useTranslation && transKey && !ctx.insideRichTextBlock) {
    value = `<Trans__${
      transKey() ? ` transKey={${transKey()}}` : ""
    }>{${value}}</Trans__>`;
  }
  // This is the raw string value when the value is unconditional.
  const rawUncondValue =
    r.indexOfUncondValue >= 0
      ? rawStringAndVariants[r.indexOfUncondValue][0]
      : "";
  return {
    value,
    conditional: r.conditional,
    rawUncondValue,
  };
}

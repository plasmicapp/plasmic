import { VariantCombo, isBaseVariant } from "@/wab/shared/Variants";
import { serializeClassExpr } from "@/wab/shared/codegen/react-p/class-names";
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
import { renderRichTextChildren } from "@/wab/shared/core/rich-text-util";
import { asCode, getCodeExpressionWithFallback } from "@/wab/shared/core/exprs";
import { defaultStyleClassNames } from "@/wab/shared/core/styles";
import { TplTextTag } from "@/wab/shared/core/tpls";
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
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
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
      isKnownCustomCode(text.expr) ||
        isKnownObjectPath(text.expr) ||
        isKnownTemplatedString(text.expr),
      "Expected CustomCode, ObjectPath, or TemplatedString expr"
    );
    const textCode = isKnownTemplatedString(text.expr)
      ? asCode(text.expr, ctx.exprCtx).code
      : getCodeExpressionWithFallback(text.expr, ctx.exprCtx);

    const className = serializeClassExpr(
      ctx.exportOpts,
      makeWabHtmlTextClassName(ctx.exportOpts)
    );
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

  const spanClassName = defaultStyleClassNames(
    makeDefaultStyleClassNameBase(ctx.exportOpts),
    {
      tag: "span",
      projectId: ctx.projectConfig.projectId,
    }
  ).join(" ");

  const whitespaceNormal = !!ctx.exportOpts.whitespaceNormal;
  // The helper has already applied cleanPlainText / plainTextToReact to the text.
  // Embeds the raw string as JS expr (wrapped in `{ ... }`) in non-whitespaceNormal mode.
  // In whitespaceNormal mode the text is already HTML-encoded.
  const wrapInner = (s: string) => (whitespaceNormal ? s : `{${jsLiteral(s)}}`);

  ctx.insideRichTextBlock = true;
  const children = renderRichTextChildren<string>(
    text,
    {
      text: (textPart) =>
        `<React.Fragment>${wrapInner(textPart)}</React.Fragment>`,
      styledRun: (textPart, cssRules, className) =>
        // Make sure these spans have default class names, to override global span styles.
        `<span className={"${className}"} style={${JSON.stringify(
          cssRules
        )}}>${wrapInner(textPart)}</span>`,
      nodeMarker: (tpl) => `{${ctx.serializeTplNode(ctx, tpl)}}`,
    },
    { spanClassName, whitespaceNormal }
  );
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
          projectId: ctx.projectConfig.projectId,
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

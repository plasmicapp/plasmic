import {
  notSetMessage,
  prepareStyleChanges,
  quoteProps,
  useWrittenFont,
} from "@/wab/client/operations/prepare-style-changes";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { replaceImageDataUrisInStyles } from "@/wab/client/web-importer/images";
import { RSH, ReadonlyIRuleSetHelpersX } from "@/wab/shared/RuleSetHelpers";
import type { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import type { VariantCombo } from "@/wab/shared/Variants";
import type { CodeComponentsRegistry } from "@/wab/shared/code-components/code-components";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import type { JsonObject } from "@/wab/shared/core/lang";
import { validateStylesForTpl } from "@/wab/shared/core/style-props-tpl";
import { normProp } from "@/wab/shared/css";
import { GenericError } from "@/wab/shared/error-handling";
import { TplNode, VariantSetting } from "@/wab/shared/model/classes";
import { Result, err, ok } from "neverthrow";

/**
 * Writes sanitized styles onto a tpl's variant setting. Props Studio allows on
 * this tpl go into its RuleSet; props the sanitizer does not recognize go into
 * its `style` attr so they still render. Props Studio models but does not
 * allow on this tpl (margin on a component root, typography on an icon) are
 * dropped and returned as invalid, since they must not take effect at all.
 */
export function applySanitizedTplStyles(opts: {
  tpl: TplNode;
  vs: VariantSetting;
  effectiveRsh: ReadonlyIRuleSetHelpersX;
  ccRegistry: CodeComponentsRegistry;
  safe: Record<string, string>;
  /** In the sanitizer's camelCase keys, as a React style object expects. */
  unsafe: Record<string, string>;
}): { applied: Record<string, string>; invalid: string[] } {
  const { tpl, vs, effectiveRsh, ccRegistry, safe, unsafe } = opts;
  const { valid, invalid } = validateStylesForTpl(
    safe,
    tpl,
    effectiveRsh,
    ccRegistry,
  );
  RSH(vs.rs, tpl).merge(valid);

  // A valid style that moved into the RuleSet must not stay in the style attr, since
  // it's duplicated and the inline declaration wins over it.
  const appliedProps = new Set(Object.keys(valid).map(normProp));
  const existing = styleAttrStyles(vs);
  const remaining = { ...existing };
  for (const key of Object.keys(remaining)) {
    if (appliedProps.has(normProp(key))) {
      delete remaining[key];
    }
  }

  const styleAttr = { ...remaining, ...unsafe };
  if (Object.keys(styleAttr).length > 0) {
    vs.attrs["style"] = codeLit(styleAttr);
  } else if (existing) {
    delete vs.attrs["style"];
  }

  return { applied: valid, invalid: Object.keys(invalid).map(normProp) };
}

/**
 * The style attr's styles when it holds a plain object. undefined when it is
 * absent or a dynamic expression that must not be overwritten.
 */
function styleAttrStyles(vs: VariantSetting): JsonObject | undefined {
  const parsed = tryExtractJson(vs.attrs["style"]);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed
    : undefined;
}

export interface TplStylesOpts {
  studioCtx: StudioCtx;
  vtm: VariantTplMgr;
  variantCombo: VariantCombo;
  /**
   * Image assets already uploaded for the data uris embedded in these styles.
   * Pass it whenever the styles may carry one, so the raw image is never
   * written into the model.
   */
  imageAssetRefs?: Map<string, string>;
}

/**
 * Writes free-form CSS onto a tpl for the given variant combo. null removes a
 * property, from the RuleSet and the style attr alike. Errs when the style
 * attr is a dynamic expression, which a plain style write would break.
 */
export function setTplStyles(
  tpl: TplNode,
  styles: Record<string, string | null>,
  opts: TplStylesOpts,
): Result<string[], GenericError> {
  const { studioCtx, vtm, variantCombo, imageAssetRefs } = opts;
  const vs = vtm.ensureVariantSetting(tpl, variantCombo);

  const existingUnsafe = styleAttrStyles(vs);
  if (vs.attrs["style"] && !existingUnsafe) {
    return err({
      message:
        "has a dynamic style expression that cannot be modified by copilot.",
    });
  }

  const effectiveRsh = vtm.effectiveRsh(tpl, variantCombo);
  // `gap` expands to grid or flex longhands depending on display.
  const display = effectiveRsh.getRaw("display");
  const changes = prepareStyleChanges(styles, {
    layoutContext: display ? { display } : {},
  });
  const messages = [...changes.messages];

  const rsh = RSH(vs.rs, tpl);
  const unsafeStyles = { ...existingUnsafe };
  const notSet: string[] = [];
  for (const { prop, keys } of changes.remove) {
    const keySet = new Set(keys);
    const inRs = keys.some((key) => rsh.has(key));
    rsh.clearAll(keys);
    const inAttr = Object.keys(unsafeStyles).filter((key) =>
      keySet.has(normProp(key)),
    );
    for (const key of inAttr) {
      delete unsafeStyles[key];
    }
    if (!inRs && inAttr.length === 0) {
      notSet.push(prop);
    }
  }
  if (notSet.length > 0) {
    messages.push(notSetMessage(notSet));
  }
  if (changes.remove.length > 0) {
    if (Object.keys(unsafeStyles).length > 0) {
      vs.attrs["style"] = codeLit(unsafeStyles);
    } else {
      delete vs.attrs["style"];
    }
  }

  // An embedded image is stored as an image asset and referenced by it.
  const safe = imageAssetRefs
    ? replaceImageDataUrisInStyles(changes.set, imageAssetRefs)
    : changes.set;
  const { applied, invalid } = applySanitizedTplStyles({
    tpl,
    vs,
    effectiveRsh,
    ccRegistry: studioCtx.codeComponentsRegistry,
    safe,
    unsafe: changes.unsafe,
  });
  if (invalid.length > 0) {
    messages.push(
      `Ignored properties not applicable to this element: ${quoteProps(
        invalid,
      )}.`,
    );
  }
  useWrittenFont(studioCtx, applied);

  return ok(messages);
}

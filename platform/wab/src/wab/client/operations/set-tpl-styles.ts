import {
  notSetMessage,
  prepareStyleChanges,
  quoteProps,
  useWrittenFont,
} from "@/wab/client/operations/prepare-style-changes";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
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
    ccRegistry
  );
  RSH(vs.rs, tpl).merge(valid);

  if (Object.keys(unsafe).length > 0) {
    vs.attrs["style"] = codeLit({
      ...(styleAttrStyles(vs) ?? {}),
      ...unsafe,
    });
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
}

/**
 * Writes free-form CSS onto a tpl for the given variant combo. null removes a
 * property, from the RuleSet and the style attr alike. Errs when the style
 * attr is a dynamic expression, which a plain style write would break.
 */
export function setTplStyles(
  tpl: TplNode,
  styles: Record<string, string | null>,
  opts: TplStylesOpts
): Result<string[], GenericError> {
  const { studioCtx, vtm, variantCombo } = opts;
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
      keySet.has(normProp(key))
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

  const { applied, invalid } = applySanitizedTplStyles({
    tpl,
    vs,
    effectiveRsh,
    ccRegistry: studioCtx.codeComponentsRegistry,
    safe: changes.set,
    unsafe: changes.unsafe,
  });
  if (invalid.length > 0) {
    messages.push(
      `Ignored properties not applicable to this element: ${quoteProps(
        invalid
      )}.`
    );
  }
  useWrittenFont(studioCtx, applied);

  return ok(messages);
}

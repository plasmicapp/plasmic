import {
  notSetMessage,
  prepareStyleChanges,
  quoteProps,
  styleKeysForValue,
  unsafeStylesMessages,
  useWrittenFont,
  type StyleChanges,
} from "@/wab/client/operations/prepare-style-changes";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { validateGlobalVariantCombo } from "@/wab/shared/Variants";
import { arrayRemove } from "@/wab/shared/collections";
import { arrayEqIgnoreOrder } from "@/wab/shared/common";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { normProp } from "@/wab/shared/css";
import { GenericError } from "@/wab/shared/error-handling";
import {
  Mixin,
  RuleSet,
  Variant,
  VariantedRuleSet,
} from "@/wab/shared/model/classes";
import { uniq } from "lodash";
import { Result, err, ok } from "neverthrow";

/**
 * null removes a property. Unlike elements, mixins can't stash styles Studio
 * doesn't model, so those are dropped and reported. With a `studioCtx`, a set
 * font-family is installed into the canvas, like the Typography section.
 */
export function setMixinStyles(
  rs: RuleSet,
  styles: Record<string, string | null>,
  studioCtx?: StudioCtx
): string[] {
  return writeStyleChanges(rs, prepareStyleChanges(styles), studioCtx);
}

function writeStyleChanges(
  rs: RuleSet,
  changes: StyleChanges,
  studioCtx?: StudioCtx
): string[] {
  // The tag only affects reading CSS initial values, which this never does.
  const rsh = new RuleSetHelpers(rs, "div");
  const messages = [...changes.messages];

  const notSet: string[] = [];
  for (const { prop, keys } of changes.remove) {
    if (keys.some((key) => rsh.has(key))) {
      rsh.clearAll(keys);
    } else {
      notSet.push(prop);
    }
  }
  if (notSet.length > 0) {
    messages.push(notSetMessage(notSet));
  }

  rsh.merge(changes.set);
  messages.push(...unsafeStylesMessages(changes.unsafe));
  if (studioCtx) {
    useWrittenFont(studioCtx, changes.set);
  }

  return messages;
}

/** Variant order is irrelevant. null styles removes the whole override. */
export function setMixinVariantedStyles(opts: {
  mixin: Mixin;
  variants: Variant[];
  styles: Record<string, string | null> | null;
  studioCtx?: StudioCtx;
}): Result<string[], GenericError> {
  const { mixin, styles, studioCtx } = opts;
  // A repeated variant would create an override no later edit can match.
  const variants = uniq(opts.variants);

  if (variants.length === 0) {
    return err({
      message: "At least one variant is required for a varianted style.",
    });
  }
  const comboCheck = validateGlobalVariantCombo(variants);
  if (!comboCheck.ok) {
    return err({ message: comboCheck.error });
  }

  const existing = mixin.variantedRs.find((vRs) =>
    arrayEqIgnoreOrder(vRs.variants, variants)
  );

  if (styles === null) {
    if (existing) {
      arrayRemove(mixin.variantedRs, existing);
    }
    return ok([]);
  }

  // Generated CSS only references base props, so a varianted-only prop renders
  // nothing. The keys are derived from the requested value, so `border: 2px`
  // needs only the base width longhands that `border: 1px` wrote, not every
  // key a border value could produce.
  const messages: string[] = [];
  const baseDisplay = mixin.rs.values["display"];
  const layoutContext: Record<string, string> = baseDisplay
    ? { display: baseDisplay }
    : {};
  const missingBase: string[] = [];
  const applicable: Record<string, string | null> = {};
  for (const [rawProp, value] of Object.entries(styles)) {
    const prop = normProp(rawProp);
    if (
      value?.trim() &&
      !styleKeysForValue(prop, value.trim(), layoutContext).every(
        (key) => key in mixin.rs.values
      )
    ) {
      missingBase.push(prop);
    } else {
      applicable[rawProp] = value;
    }
  }
  if (missingBase.length > 0) {
    messages.push(
      `Skipped for the targeted variants: ${quoteProps(
        missingBase
      )}. A property needs a base value before it can be overridden per variant; set it without variantUuids first.`
    );
  }

  const variantedRs =
    existing ?? new VariantedRuleSet({ variants, rs: mkRuleSet({}) });
  if (!existing) {
    mixin.variantedRs.push(variantedRs);
  }
  messages.push(
    ...writeStyleChanges(
      variantedRs.rs,
      prepareStyleChanges(applicable, { layoutContext }),
      studioCtx
    )
  );
  if (Object.keys(variantedRs.rs.values).length === 0) {
    arrayRemove(mixin.variantedRs, variantedRs);
  }
  return ok(messages);
}

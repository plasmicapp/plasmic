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
import { replaceImageDataUrisInStyles } from "@/wab/client/web-importer/images";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { arrayWithout } from "@/wab/shared/collections";
import { arrayEqIgnoreOrder } from "@/wab/shared/common";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { normProp } from "@/wab/shared/css";
import {
  Mixin,
  RuleSet,
  Variant,
  VariantedRuleSet,
} from "@/wab/shared/model/classes";

/**
 * null removes a property. Unlike elements, mixins can't stash styles Studio
 * doesn't model, so those are dropped and reported. With a `studioCtx`, a set
 * font-family is installed into the canvas, like the Typography section.
 */
export function setMixinStyles(
  rs: RuleSet,
  styles: Record<string, string | null>,
  studioCtx?: StudioCtx,
  imageAssetRefs?: Map<string, string>,
): string[] {
  return writeStyleChanges(
    rs,
    prepareStyleChanges(styles),
    studioCtx,
    imageAssetRefs,
  );
}

function writeStyleChanges(
  rs: RuleSet,
  changes: StyleChanges,
  studioCtx?: StudioCtx,
  imageAssetRefs?: Map<string, string>,
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

  const set = imageAssetRefs
    ? replaceImageDataUrisInStyles(changes.set, imageAssetRefs)
    : changes.set;
  rsh.merge(set);
  messages.push(...unsafeStylesMessages(changes.unsafe));
  if (studioCtx) {
    useWrittenFont(studioCtx, set);
  }

  return messages;
}

/** null styles removes the whole override. */
export function setMixinVariantedStyles(opts: {
  mixin: Mixin;
  variant: Variant;
  styles: Record<string, string | null> | null;
  studioCtx?: StudioCtx;
  imageAssetRefs?: Map<string, string>;
}): string[] {
  const { mixin, variant, styles, studioCtx, imageAssetRefs } = opts;
  const variants = [variant];

  const existing = mixin.variantedRs.find((vRs) =>
    arrayEqIgnoreOrder(vRs.variants, variants),
  );

  if (styles === null) {
    if (existing) {
      mixin.variantedRs = arrayWithout(mixin.variantedRs, existing);
    }
    return [];
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
        (key) => key in mixin.rs.values,
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
        missingBase,
      )}. A property needs a base value before it can be overridden per variant; set it without variantUuid first.`,
    );
  }

  const variantedRs =
    existing ?? new VariantedRuleSet({ variants, rs: mkRuleSet({}) });
  if (!existing) {
    mixin.variantedRs = [...mixin.variantedRs, variantedRs];
  }
  messages.push(
    ...writeStyleChanges(
      variantedRs.rs,
      prepareStyleChanges(applicable, { layoutContext }),
      studioCtx,
      imageAssetRefs,
    ),
  );
  if (Object.keys(variantedRs.rs.values).length === 0) {
    mixin.variantedRs = arrayWithout(mixin.variantedRs, variantedRs);
  }
  return messages;
}

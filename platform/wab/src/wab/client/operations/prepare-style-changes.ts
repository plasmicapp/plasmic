import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { formatWIErrors } from "@/wab/client/web-importer/errors";
import {
  fixCSSValue,
  processUnsanitizedStyles,
} from "@/wab/client/web-importer/html-parser";
import {
  isValidStyleProp,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import { normProp } from "@/wab/shared/css";
import { memoize } from "lodash";

/**
 * Turns free-form CSS declarations into buckets a RuleSet writer can apply:
 * sanitized props to set, props the sanitizer does not recognize, and keys to
 * remove. Writers like setTplStyles and setMixinStyles decide where each
 * bucket goes.
 */

/** Normalization is value-driven: `border: 1px` yields only the width longhands. */
const NORMALIZATION_PROBES = [
  "0",
  "none",
  "0 none rgb(0, 0, 0)",
  "rgb(0, 0, 0)",
  "1 / 1",
];

/** ...and can depend on siblings: `gap` expands to grid longhands under a grid. */
const NORMALIZATION_CONTEXTS: Record<string, string>[] = [
  {},
  { display: "grid" },
];

/**
 * Keys the importer writes for `prop` (padding -> its four longhands), probed
 * with representative values since a removal has none.
 */
export const normalizedStyleKeys = memoize((prop: string): string[] => {
  const keys = new Set<string>();
  for (const context of NORMALIZATION_CONTEXTS) {
    for (const probe of NORMALIZATION_PROBES) {
      const { safe, unsafe } = processUnsanitizedStyles({
        ...context,
        [prop]: probe,
      });
      for (const key of [...Object.keys(safe), ...Object.keys(unsafe)]) {
        if (!(normProp(key) in context)) {
          keys.add(normProp(key));
        }
      }
    }
  }
  return keys.size > 0 ? [...keys] : [normProp(prop)];
});

/**
 * Keys the importer writes for this specific `prop: value` under a layout
 * context (e.g. `gap` under a grid display). Narrower than
 * {@link normalizedStyleKeys}: `border: 2px` yields only the width longhands,
 * not every key any border value could produce.
 */
export function styleKeysForValue(
  prop: string,
  value: string,
  context: Record<string, string>
): string[] {
  const { safe, unsafe } = processUnsanitizedStyles({
    ...context,
    [prop]: value,
  });
  const keys = [...Object.keys(safe), ...Object.keys(unsafe)]
    .map(normProp)
    .filter((key) => !(key in context));
  return keys.length > 0 ? keys : [normProp(prop)];
}

export function quoteProps(props: string[]): string {
  return props.map((p) => `"${p}"`).join(", ");
}

/**
 * Written raw like Studio's Typography section; the importer sanitizer drops
 * some of these (white-space, text-decoration-line). font-family stays
 * sanitized so font lists collapse to one font.
 */
function isRawTypographyProp(prop: string): boolean {
  return prop !== "font-family" && typographyCssProps.includes(prop);
}

export interface StyleChangesOpts {
  /**
   * Sibling props that shape shorthand expansion but are not written, e.g. the
   * target's effective `display` so `gap` expands to the right longhands.
   */
  layoutContext?: Record<string, string>;
}

export interface StyleChanges {
  /** Sanitized props to set, keyed by normalized name, shorthands expanded. */
  set: Record<string, string>;
  /**
   * Props the sanitizer does not recognize, in the sanitizer's own (camelCase)
   * keys so they can round-trip through a React style object.
   */
  unsafe: Record<string, string>;
  /** Each requested removal with every key it may have been stored under. */
  remove: { prop: string; keys: string[] }[];
  messages: string[];
}

/** null removes a property; empty strings are ignored and reported. */
export function prepareStyleChanges(
  styles: Record<string, string | null>,
  opts: StyleChangesOpts = {}
): StyleChanges {
  const { layoutContext = {} } = opts;
  const messages: string[] = [];
  const set: Record<string, string> = {};
  const toSanitize: Record<string, string> = {};
  const remove: StyleChanges["remove"] = [];

  for (const [rawProp, rawValue] of Object.entries(styles)) {
    const prop = normProp(rawProp);
    if (rawValue === null) {
      remove.push({ prop, keys: normalizedStyleKeys(prop) });
      continue;
    }
    const value = rawValue.trim();
    if (!value) {
      messages.push(
        `Ignored empty value for "${prop}"; use null to remove a property.`
      );
    } else if (isRawTypographyProp(prop)) {
      // Same syntax check as the importer, but keep the raw value: the
      // sanitizer would drop white-space and rewrite other typography values.
      fixCSSValue(prop, value).match(
        () => {
          set[prop] = value;
        },
        (error) => messages.push(...formatWIErrors([error]))
      );
    } else {
      toSanitize[prop] = value;
    }
  }

  let unsafe: Record<string, string> = {};
  if (Object.keys(toSanitize).length > 0) {
    const sanitized = processUnsanitizedStyles({
      ...layoutContext,
      ...toSanitize,
    });
    unsafe = sanitized.unsafe;
    // The context only steers expansion; drop it unless explicitly requested.
    for (const bucket of [sanitized.safe, unsafe]) {
      for (const key of Object.keys(bucket)) {
        const prop = normProp(key);
        if (prop in layoutContext && !(prop in toSanitize)) {
          delete bucket[key];
        }
      }
    }
    messages.push(...formatWIErrors(sanitized.errors));

    if (sanitized.ignored.length > 0) {
      messages.push(
        `Ignored properties that cannot be set here: ${quoteProps(
          sanitized.ignored.map(normProp)
        )}.`
      );
    }

    // Animations live in RuleSet.animations, not in values; a raw value
    // generates broken CSS. Writers that support them handle `animation`
    // before calling this.
    if (sanitized.safe["animation"]) {
      delete sanitized.safe["animation"];
      messages.push(`Ignored "animation": CSS animations cannot be set here.`);
    }

    for (const [key, value] of Object.entries(sanitized.safe)) {
      set[normProp(key)] = value;
    }
  }

  return { set, unsafe, remove, messages };
}

export function notSetMessage(props: string[]): string {
  return `Ignored removal of properties that are not set: ${quoteProps(
    props
  )}.`;
}

/**
 * Reports props the sanitizer does not recognize, telling real CSS props apart
 * from unknown names. For writers that have nowhere to store them.
 */
export function unsafeStylesMessages(unsafe: Record<string, string>): string[] {
  const messages: string[] = [];
  const unknown: string[] = [];
  const unrecognized: string[] = [];
  for (const key of Object.keys(unsafe)) {
    const prop = normProp(key);
    (isValidStyleProp(prop) ? unrecognized : unknown).push(prop);
  }
  if (unrecognized.length > 0) {
    messages.push(
      `Ignored properties that are not recognized CSS styles: ${quoteProps(
        unrecognized
      )}.`
    );
  }
  if (unknown.length > 0) {
    messages.push(`Unknown CSS properties ignored: ${quoteProps(unknown)}.`);
  }
  return messages;
}

/** Installs a written font-family into the canvas, like the Typography section. */
export function useWrittenFont(
  studioCtx: StudioCtx,
  written: Record<string, string>
) {
  const fontFamily = written["font-family"];
  if (fontFamily) {
    studioCtx.fontManager.useFont(studioCtx, fontFamily);
  }
}

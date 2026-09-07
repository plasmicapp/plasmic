import { mkShortId } from "@/wab/shared/common";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import {
  gridChildProps,
  typographyCssProps,
} from "@/wab/shared/core/style-props";
import { getApplicableSelectors, mkRuleSet } from "@/wab/shared/core/styles";
import {
  BASE_THEMABLE_TAG,
  THEMABLE_TAGS,
  ThemableTag,
} from "@/wab/shared/html";
import { Mixin, Site, Theme, ThemeStyle } from "@/wab/shared/model/classes";

export interface ParsedThemeSelector {
  tag: ThemableTag;
  pseudoClass: string;
  selector: string;
}

export function parseThemeSelector(
  raw: string
): ParsedThemeSelector | { error: string } {
  const selector = raw.trim();
  if (selector === BASE_THEMABLE_TAG) {
    return { tag: BASE_THEMABLE_TAG, pseudoClass: "", selector };
  }
  const colonIdx = selector.indexOf(":");
  const tag = colonIdx === -1 ? selector : selector.slice(0, colonIdx);
  const pseudoClass = colonIdx === -1 ? "" : selector.slice(colonIdx);
  if (!tag) {
    return {
      error: `Pseudo-class selectors require a tag (got "${raw}").`,
    };
  }
  if (!(THEMABLE_TAGS as readonly string[]).includes(tag)) {
    return {
      error: `Tag "${tag}" is not themable. Use "" for base typography, or one of: ${THEMABLE_TAGS.join(
        ", "
      )}.`,
    };
  }
  if (pseudoClass) {
    const applicable = getApplicableSelectors(tag, true, false);
    if (!applicable.some((op) => op.cssSelector === pseudoClass)) {
      return {
        error: `Pseudo-class "${pseudoClass}" is not supported for tag "${tag}". Supported: ${
          applicable.map((op) => op.cssSelector).join(", ") || "(none)"
        }.`,
      };
    }
  }
  return { tag: tag as ThemableTag, pseudoClass, selector };
}

export function ensureThemeStyleMixin(theme: Theme, selector: string): Mixin {
  const existing = theme.styles.find((ts) => ts.selector === selector);
  if (existing) {
    return existing.style;
  }
  const newMixin = new Mixin({
    name: `Default "${selector}"`,
    rs: mkRuleSet({}),
    preview: undefined,
    uuid: mkShortId(),
    forTheme: true,
    variantedRs: [],
  });
  theme.styles.push(new ThemeStyle({ selector, style: newMixin }));
  return newMixin;
}

/** The Position section, which the Default Styles panel never shows. */
const THEME_DISALLOWED_TAG_PROPS = new Set([
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "vertical-align",
  "align-self",
  "order",
  // Stored as longhands.
  ...gridChildProps,
  "justify-self",
]);

/**
 * Mirrors the Default Styles panel's sections. Base typography allows all
 * typographyCssProps, which the starter bundle seeds on defaultStyle, so
 * everything read() echoes stays editable.
 */
export function isThemeStylePropAllowed(
  tag: ThemableTag,
  prop: string
): boolean {
  if (tag === BASE_THEMABLE_TAG) {
    return typographyCssProps.includes(prop);
  }
  return !THEME_DISALLOWED_TAG_PROPS.has(prop);
}

export interface SelectableTheme {
  theme: Theme;
  fromProject?: string;
}

export function getSelectableThemes(site: Site): SelectableTheme[] {
  const seen = new Set<Theme>(site.themes);
  const imported: SelectableTheme[] = [];
  for (const dep of site.projectDependencies) {
    const theme = dep.site.activeTheme;
    if (!theme || isHostLessPackage(dep.site) || seen.has(theme)) {
      continue;
    }
    seen.add(theme);
    imported.push({ theme, fromProject: dep.projectId });
  }
  return [...site.themes.map((theme) => ({ theme })), ...imported];
}

import {
  Component,
  isKnownRawText,
  isKnownStyleExpr,
  isKnownStyleMarker,
  Site,
} from "@/wab/classes";
import { assert, ensure } from "@/wab/common";
import { isCodeComponent } from "@/wab/components";
import { fontWeightNumber } from "@/wab/css";
import {
  flattenComponent,
  makeTokenRefResolver,
} from "@/wab/shared/cached-selectors";
import { getFontSpec, GoogleFontInstallSpec } from "@/wab/shared/fonts";
import {
  ReadonlyIRuleSetHelpersX,
  RuleSetHelpers,
} from "@/wab/shared/RuleSetHelpers";
import { isTypographyNode } from "@/wab/shared/SlotUtils";
import { createExpandedRuleSetMerger } from "@/wab/styles";
import L from "lodash";

export interface FontUsage {
  fontType: "google-font" | "local";
  fontFamily: string;
  variants: FontVariant[];
}

export interface FontVariant {
  italic: boolean;
  weight: number;
}

export function extractUsedFontsFromComponents(
  site: Site,
  components: Component[]
) {
  // Basically, for any piece of text, its style is influenced by the default
  // theme style, as well as any ancestor slots.  Ideally, we would look at
  // every piece of text, see its effective variant setting for each variant,
  // and collect the combinations of font-weight-italic usage.  However,
  // that is too slow and probably not worthwhile, and may be overly narrow.
  // Instead, we collect all families, weights, and italics, and just request
  // all combinations.

  const usage: Record<string, FontUsage> = {};
  const theme = site.activeTheme;

  const tokenResolver = makeTokenRefResolver(site);

  const families = new Set<string>();
  const weights = new Set<number>([400]);
  const italics = new Set<boolean>([false]);

  const collectFonts = (expr: ReadonlyIRuleSetHelpersX, onlyIfSet: boolean) => {
    if (!onlyIfSet || expr.has("font-family")) {
      families.add(expr.get("font-family"));
    }
    if (!onlyIfSet || expr.has("font-style")) {
      italics.add(expr.get("font-style") === "italic");
    }
    if (!onlyIfSet || expr.has("font-weight")) {
      weights.add(fontWeightNumber(expr.get("font-weight")));
    }
  };

  const addUsage = (fontFamily: string, italic: boolean, weight: number) => {
    const variant: FontVariant = {
      italic,
      weight,
    };
    fontFamily = tokenResolver(fontFamily) ?? fontFamily;
    if (fontFamily in usage) {
      const cur = usage[fontFamily];
      if (
        !cur.variants.some(
          (v) => v.italic === variant.italic && v.weight === variant.weight
        )
      ) {
        cur.variants.push(variant);
      }
    } else {
      usage[fontFamily] = {
        fontFamily,
        fontType: getFontSpec(fontFamily).fontType as "google-font" | "local",
        variants: [variant],
      };
    }
  };

  if (theme) {
    const themeExp = new RuleSetHelpers(theme.defaultStyle.rs, "div");
    collectFonts(themeExp, true);
    for (const themeStyle of theme.styles) {
      collectFonts(new RuleSetHelpers(themeStyle.style.rs, "div"), true);
    }
  }

  for (const component of components) {
    if (isCodeComponent(component)) {
      continue;
    }

    for (const tpl of flattenComponent(component)) {
      if (isTypographyNode(tpl)) {
        for (const vs of tpl.vsettings) {
          const exp = createExpandedRuleSetMerger(vs.rs, tpl);
          collectFonts(exp, true);
          for (const arg of vs.args) {
            if (isKnownStyleExpr(arg.expr)) {
              for (const sty of arg.expr.styles) {
                collectFonts(new RuleSetHelpers(sty.rs, "div"), true);
              }
            }
          }
          if (vs.text && isKnownRawText(vs.text)) {
            for (const marker of vs.text.markers) {
              if (isKnownStyleMarker(marker)) {
                const markerExp = new RuleSetHelpers(marker.rs, "div");
                collectFonts(markerExp, true);
              }
            }
          }
        }
      }
    }
  }

  for (const family of families) {
    for (const italic of italics) {
      for (const weight of weights) {
        addUsage(family, italic, weight);
      }
    }
  }

  return Object.values(usage);
}

export function makeGoogleFontUrl(usages: FontUsage[]) {
  return `https://fonts.googleapis.com/css2?${usages
    .map((usage) => makeGoogleFontFamilyQuery(usage.fontFamily, usage.variants))
    .join("&")}&display=swap`;
}

function makeGoogleFontFamilyQuery(
  fontFamily: string,
  variants: FontVariant[]
) {
  const fontSpec = getFontSpec(fontFamily);
  assert(
    fontSpec.fontType === "google-font",
    `${fontFamily} is not a Google Font`
  );
  // Try to find the closest FontVariants based on spec
  const validVariants = variants.map((v) =>
    getValidGoogleFontVariant(v, fontSpec)
  );
  // Google Fonts will give an error if you ask for duplicate variants
  const uniqueValidVariants = L.uniqBy(validVariants, (v) =>
    makeGoogleFontVariant(v)
  );
  const variantStrings = uniqueValidVariants
    .map((v) => makeGoogleFontVariant(v))
    .sort();
  // encodeURIComponent encodes spaces to %20, which causes issues for
  // importing CSS URLs without quotes delimiters (in particular, breaks
  // fonts with spaces on Gatsby). That's why we replace "%20" with "+".
  const queryVal = encodeURIComponent(
    `${fontFamily}:ital,wght@${variantStrings.join(";")}`
  ).replace(/%20/g, "+");
  return `family=${queryVal}`;
}

function getValidGoogleFontVariant(
  variant: FontVariant,
  spec: GoogleFontInstallSpec
): FontVariant {
  // It is possible for the variant to not exist for this font-family
  // We sort and select the closest one we are aware of
  const diffVariants = spec.variants.map((v) => {
    return {
      ...v,
      diffItalic: variant.italic === v.italic ? 0 : 1,
      diffWeight: Math.abs(variant.weight - v.weight),
    };
  });
  const sortedVariants = L.sortBy(diffVariants, ["diffItalic", "diffWeight"]);
  const selectedVariant = ensure(
    sortedVariants[0],
    `Must be at least one variant`
  );
  return selectedVariant;
}

function makeGoogleFontVariant(variant: FontVariant) {
  return `${variant.italic ? 1 : 0},${variant.weight}`;
}

export function makeCssImports(usages: FontUsage[]) {
  const grouped = L.groupBy(usages, (usage) => usage.fontType);
  function* gen() {
    for (const [type, fonts] of Object.entries(grouped)) {
      if (type === "google-font") {
        yield `@import url('${makeGoogleFontUrl(fonts)}');`;
      }
    }
  }

  return Array.from(gen()).join("\n");
}

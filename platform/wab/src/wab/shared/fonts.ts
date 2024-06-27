import { unexpected } from "@/wab/shared/common";
import { getGoogFontMeta, GoogFontMeta } from "@/wab/shared/googfonts";

export interface FontVariant {
  italic: boolean;
  weight: number;
}

export interface GoogleFontInstallSpec {
  fontType: "google-font";
  fontFamily: string;
  variants: FontVariant[];
}

export interface LocalFontInstallSpec {
  fontType: "local";
  fontFamily: string;
}

export type FontInstallSpec = GoogleFontInstallSpec | LocalFontInstallSpec;

export function getFontSpec(fontFamily: string): FontInstallSpec {
  const maybeGoogleMeta = getGoogFontMeta(fontFamily);
  return !!maybeGoogleMeta
    ? toGoogleFontInstallSpec(maybeGoogleMeta)
    : {
        fontType: "local",
        fontFamily,
      };
}

export function toGoogleFontInstallSpec(
  meta: GoogFontMeta
): GoogleFontInstallSpec {
  return {
    fontType: "google-font",
    fontFamily: meta.family,
    variants: meta.variants.map((s) => {
      return {
        italic: s.includes("italic"),
        weight: s.includes("100")
          ? 100
          : s.includes("200")
          ? 200
          : s.includes("300")
          ? 300
          : s.includes("500")
          ? 500
          : s.includes("600")
          ? 600
          : s.includes("700")
          ? 700
          : s.includes("800")
          ? 800
          : s.includes("900")
          ? 900
          : s.includes("regular") || s.includes("italic")
          ? 400
          : unexpected(),
      };
    }),
  };
}

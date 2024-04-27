// Google fonts list retrieved via API key
// AIzaSyDSElXZLVBST65rcJdy01gM1y-0p4GBh70. See
// https://developers.google.com/fonts/docs/developer_api.
import { ensure, tuple } from "@/wab/common";
import { googleFontsMetaStr } from "@/wab/googfontsmeta";

interface GoogFontsMeta {
  kind: string;
  items: GoogFontMeta[];
}

type GoogFontVariant =
  | "100"
  | "100italic"
  | "200"
  | "200italic"
  | "300"
  | "300italic"
  | "regular"
  | "italic"
  | "500"
  | "500italic"
  | "600"
  | "600italic"
  | "700"
  | "700italic"
  | "800"
  | "800italic"
  | "900"
  | "900italic";

export interface GoogFontMeta {
  kind: string;
  family: string;
  category: string;
  variants: GoogFontVariant[];
  subsets: string[];
  version: string;
  lastModified: string;
  files: Record<string, string>;
}

let _googFontsMeta: GoogFontsMeta;
export function getGoogFontsMeta() {
  if (!_googFontsMeta) {
    _googFontsMeta = JSON.parse(googleFontsMetaStr);
  }
  return _googFontsMeta;
}

let _googFontsMap: Record<string, GoogFontMeta>;
function getGoogFontsMap() {
  if (!_googFontsMap) {
    _googFontsMap = Object.fromEntries(
      getGoogFontsMeta().items.map((font) => tuple(font["family"], font))
    );
  }
  return _googFontsMap;
}

export function getGoogFontMeta(family: string): GoogFontMeta | undefined {
  return getGoogFontsMap()[family];
}

export function makeGoogleFontApiUrl(
  fontFamily: string,
  variants?: GoogFontVariant[],
  subsets?: string[]
) {
  const gf = ensure(getGoogFontMeta(fontFamily), "fonts");
  // Install google font. Currently, we install all the variants and subsets
  // of the font.
  const apiUrl: Array<string> = [];
  apiUrl.push("https://fonts.googleapis.com/css?family=");
  apiUrl.push(gf.family.replace(/ /g, "+"));

  variants = variants ?? gf.variants;
  if (variants.length > 0) {
    apiUrl.push(":");
    apiUrl.push(gf.variants.join(","));
  }

  subsets = subsets ?? gf.subsets;
  if (subsets.length > 0) {
    apiUrl.push("&subset=");
    apiUrl.push(gf.subsets.join(","));
  }
  return apiUrl.join("");
}

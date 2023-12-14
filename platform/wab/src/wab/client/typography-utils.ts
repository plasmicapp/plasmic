import { FontInstallSpec } from "@/wab/shared/fonts";

export const fontWeightOptions = [
  "Thin",
  "Extra Light",
  "Light",
  "Normal",
  "Medium",
  "Semi Bold",
  "Bold",
  "Extra bold",
  "Black",
].map((label, i, _, value = String((i + 1) * 100)) => ({
  value,
  label,
}));

export const isValidFontWeight = (
  fontWeight: string,
  fontSpec: FontInstallSpec | undefined
) => {
  if (!fontSpec || fontSpec.fontType !== "google-font") {
    // spec may not exist if this is a local font that's not explicitly registered with us.
    // If user-managed font, where we don't know the constraints, don't filter
    return true;
  }
  const validWeightStrs = fontSpec.variants.map((v) => `${v.weight}`);
  return validWeightStrs.includes(fontWeight);
};

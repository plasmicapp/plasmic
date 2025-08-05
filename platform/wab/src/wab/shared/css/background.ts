import { standardSides } from "@/wab/shared/geom";

export const backgroundPositionKeywords = [...standardSides, "center"] as const;

export type BackgroundPositionKeyword =
  (typeof backgroundPositionKeywords)[number];

export function isBackgroundPositionKeyword(value: string) {
  return backgroundPositionKeywords.includes(
    value as BackgroundPositionKeyword
  );
}

export const backgroundSizeKeywords = ["cover", "contain", "auto"] as const;

export type BackgroundSizeKeyword = (typeof backgroundSizeKeywords)[number];

export function isBackgroundSizeKeyword(value: string) {
  return backgroundSizeKeywords.includes(value as BackgroundSizeKeyword);
}

export const backgroundRepeatKeywords = [
  "repeat",
  "repeat-x",
  "repeat-y",
  "no-repeat",
  "space",
  "round",
] as const;

export type BackgroundRepeatKeyword = (typeof backgroundRepeatKeywords)[number];

export function isBackgroundRepeatKeyword(value: string) {
  return backgroundRepeatKeywords.includes(value as BackgroundRepeatKeyword);
}

export const backgroundAttachmentKeywords = [
  "scroll",
  "fixed",
  "local",
] as const;

export type BackgroundAttachmentKeyword =
  (typeof backgroundAttachmentKeywords)[number];

export function isBackgroundAttachmentKeyword(value: string) {
  return backgroundAttachmentKeywords.includes(
    value as BackgroundAttachmentKeyword
  );
}

export const backgroundOriginKeywords = [
  "border-box",
  "padding-box",
  "content-box",
] as const;

export type BackgroundOriginKeyword = (typeof backgroundOriginKeywords)[number];

export function isBackgroundOriginKeyword(value: string) {
  return backgroundOriginKeywords.includes(value as BackgroundOriginKeyword);
}

export const backgroundClipKeywords = [
  "border-box",
  "padding-box",
  "content-box",
  "text",
  "border-area",
] as const;

export type BackgroundClipKeyword = (typeof backgroundClipKeywords)[number];

export function isBackgroundClipKeyword(value: string) {
  return backgroundClipKeywords.includes(value as BackgroundClipKeyword);
}

export const radialGradientSizeKeywords = [
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
] as const;

export type RadialGradiantSizeKeyword =
  (typeof radialGradientSizeKeywords)[number];

export function isRadialGradiantSizeKeyword(value: string) {
  return radialGradientSizeKeywords.includes(
    value as RadialGradiantSizeKeyword
  );
}

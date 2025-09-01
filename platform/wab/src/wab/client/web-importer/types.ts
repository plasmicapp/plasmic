import { SpecificityWithPosition } from "@/wab/client/web-importer/specificity";
import { VariantGroupType } from "@/wab/shared/Variants";

export interface WIRule {
  styles: Record<string, string>;
  selector: string;
  specificity: SpecificityWithPosition;
}

export type WIStyles = Record<string, string>;

export interface WIBaseVariant {
  type: "base";
}

export interface WIScreenVariant {
  type: typeof VariantGroupType.GlobalScreen;
  width: number;
}

export interface WIStyleVariant {
  type: "style";
  selectors: string[];
}

export type WIVariant = WIBaseVariant | WIScreenVariant | WIStyleVariant;

export interface WIVariantSettings {
  // Unsanitized styles store the raw css styles applied on the element in the html without any transformation
  unsanitizedStyles: WIStyles;
  // Css style props/values in correct format supported by Plasmic and that is not considered a site invariant such as color, paddingTop, paddingRight
  safeStyles: WIStyles;
  // Css style props/values that is considered a site invariant such as padding,
  unsafeStyles: WIStyles;
  variantCombo: WIVariant[];
}

export interface WIBase {
  type: "container" | "text" | "svg" | "component";
  tag: string;
  variantSettings: WIVariantSettings[];
}

export interface WIContainer extends WIBase {
  type: "container";
  children: WIElement[];
  attrs: Record<string, string>;
}

export interface WIText extends WIBase {
  type: "text";
  text: string;
}

export interface WISVG extends WIBase {
  type: "svg";
  outerHtml: string;
  width: string;
  height: string;
  fillColor?: string;
}

export interface WIComponent extends WIBase {
  type: "component";
  component: string;
}

export type WIElement = WIContainer | WIText | WISVG | WIComponent;

export const getWIVariantKey = (variant: WIVariant) => {
  if (variant.type === "base") {
    return "base";
  }

  if (variant.type === "style") {
    return `${variant.type}:${variant.selectors.sort().join(",")}`;
  }

  return `${variant.type}:${variant.width}`;
};

export const getWIVariantComboKey = (variantCombo: WIVariant[]): string => {
  return variantCombo
    .map((v) => getWIVariantKey(v))
    .sort()
    .join("|");
};

export const hasStyleVariant = (vs: WIVariantSettings) =>
  vs.variantCombo.some((v) => v.type === "style");

export const isWIBaseVariantSettings = (vs: WIVariantSettings) =>
  vs.variantCombo.length === 1 && vs.variantCombo[0].type === "base";

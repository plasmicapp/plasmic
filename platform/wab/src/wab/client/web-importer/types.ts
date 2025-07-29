import { SpecificityWithPosition } from "@/wab/client/web-importer/specificity";

export interface SelectorToComponent {
  id: string;
  selector: string;
  component: string;
}

export interface WIRule {
  styles: Record<string, string>;
  selector: string;
  specificity: SpecificityWithPosition;
}

export type WIStyles = Record<string, Record<string, string>>;

export type SanitizedWIStyles = Record<
  string,
  {
    safe: Record<string, string>;
    unsafe: Record<string, string>;
  }
>;

export interface WIBase {
  type: "container" | "text" | "svg" | "component";
  tag: string;
  unsanitizedStyles: WIStyles;
  styles: SanitizedWIStyles;
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

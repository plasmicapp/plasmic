import type { Properties } from "csstype";

type CSSProperties = Properties<string | number>;

//
// Tags
//

type ContainerTags =
  | "a"
  | "address"
  | "article"
  | "aside"
  | "blockquote"
  | "button"
  | "code"
  | "dd"
  | "div"
  | "dl"
  | "dt"
  | "form"
  | "footer"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "header"
  | "hgroup"
  | "label"
  | "li"
  | "main"
  | "nav"
  | "ol"
  | "p"
  | "pre"
  | "section"
  | "span"
  | "ul";

//
// Props
//

type TypographyProps =
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "fontStyle"
  | "textAlign"
  | "textTransform"
  | "lineHeight"
  | "letterSpacing"
  | "whiteSpace"
  | "userSelect";

type LayoutProps =
  | "overflow"
  | "flexDirection"
  | "justifyContent"
  | "alignItems"
  | "alignContent"
  | "flexWrap"
  | "flex-column-gap"
  | "flex-row-gap";

type SizeProps =
  | "width"
  | "height"
  | "minWidth"
  | "minHeight"
  | "maxWidth"
  | "maxHeight";

type PositioningProps =
  | "position"
  | "top"
  | "left"
  | "bottom"
  | "right"
  | "zIndex"
  | "alignSelf"
  | "justifySelf"
  | "verticalAlign"
  | "order"
  | "margin"
  | "marginTop"
  | "marginBottom"
  | "marginLeft"
  | "marginRight"
  | "paddingLeft"
  | "paddingRight"
  | "paddingTop"
  | "paddingBottom";

type EffectProps = "cursor" | "pointerEvents" | "mixBlendMode" | "isolation";

type BorderProps =
  | "borderTopColor"
  | "borderRightColor"
  | "borderBottomColor"
  | "borderLeftColor"
  | "borderTopStyle"
  | "borderRightStyle"
  | "borderBottomStyle"
  | "borderLeftStyle"
  | "borderTopWidth"
  | "borderRightWidth"
  | "borderBottomWidth"
  | "borderLeftWidth"
  | "borderTopLeftRadius"
  | "borderTopRightRadius"
  | "borderBottomRightRadius"
  | "borderBottomLeftRadius";

// TODO: Maybe allow Plasmic unsupported props as well?
// TODO: Still missing styles that can stack several layers (+ shorthanded):
//   Background, Shadow, Filter, Backdrop Filter, Transitions, Transforms
type CommonProps =
  | SizeProps
  | PositioningProps
  | EffectProps
  | BorderProps
  | "opacity";

//
// Style objects
//

export type TypographyStyles = Pick<CSSProperties, TypographyProps>;
export type ContainerStyles = {
  [P in LayoutProps]?: P extends keyof CSSProperties
    ? CSSProperties[P]
    : string;
};
export type CommonStyles = Pick<CSSProperties, CommonProps>;

//
// Attrs
//

type CommonAttrKeys =
  | "title"
  | "tabIndex"
  | "className"
  | "id"
  | "aria-label"
  | "aria-hidden"
  | "aria-labelledby"
  | "aria-describedby"
  | "role";

type PictureAttrKeys = "alt" | "loading" | CommonAttrKeys;

type LinkAttrKeys = "href" | "target" | CommonAttrKeys;

type TextAreaAttrKeys =
  | "disabled"
  | "value"
  | "cols"
  | "rows"
  | "placeholder"
  | CommonAttrKeys;

type InputAttrKeys =
  | "disabled"
  | "value"
  | "defaultValue"
  | "name"
  | "autoComplete"
  | "checked"
  | "placeholder"
  | CommonAttrKeys;

type ButtonAttrKeys = "disabled" | CommonAttrKeys;

type Attrs<Keys extends string> = Record<Keys, string>;

//
// Elements
//

export interface PictureElement {
  type: "img";
  src: string;
  styles?: CommonStyles;
  attrs?: Attrs<PictureAttrKeys>;
}

export interface SvgElement {
  type: "icon";
  src: string;
  styles?: CommonStyles;
  attrs?: Attrs<CommonAttrKeys>;
}

export type ImageElement = PictureElement | SvgElement;

interface LinkTextElement {
  type: "text";
  tag: "a";
  value: TextElement | TextElement[];
  styles?: CommonStyles & TypographyStyles;
  attrs?: Attrs<LinkAttrKeys>;
}

interface ButtonTextElement {
  type: "text";
  tag: "button";
  value: TextElement | TextElement[];
  styles?: CommonStyles & TypographyStyles;
  attrs?: Attrs<ButtonAttrKeys>;
}

interface GenericTextElement {
  type: "text";
  /**
   * Default: "div"
   */
  tag?: Exclude<ContainerTags, "a" | "button">;
  value: TextElement | TextElement[];
  styles?: CommonStyles & TypographyStyles;
  attrs?: Attrs<CommonAttrKeys>;
}

export type TextElement =
  | string
  | LinkTextElement
  | ButtonTextElement
  | GenericTextElement;

interface LinkContainerElement {
  type: "box" | "vbox" | "hbox";
  tag: "a";
  children?: PlasmicElement | PlasmicElement[];
  styles?: CommonStyles & ContainerStyles;
  attrs?: Attrs<LinkAttrKeys>;
}

interface ButtonContainerElement {
  type: "box" | "vbox" | "hbox";
  tag: "button";
  children?: PlasmicElement | PlasmicElement[];
  styles?: CommonStyles & ContainerStyles;
  attrs?: Attrs<ButtonAttrKeys>;
}

interface GenericContainerElement {
  type: "box" | "vbox" | "hbox";
  /**
   * Default: "div"
   */
  tag?: Exclude<ContainerTags, "a" | "button">;
  children?: PlasmicElement | PlasmicElement[];
  styles?: CommonStyles & ContainerStyles;
  attrs?: Attrs<CommonAttrKeys>;
}

export type ContainerElement =
  | LinkContainerElement
  | ButtonContainerElement
  | GenericContainerElement;

// Equivalent to ButtonTextElement
export interface ButtonElement {
  type: "button";
  value: TextElement;
  styles?: CommonStyles & TypographyStyles;
  attrs?: Attrs<ButtonAttrKeys>;
}

interface InputElement {
  type: "input" | "password";
  styles?: CommonStyles & TypographyStyles;
  attrs?: Attrs<InputAttrKeys>;
}

interface TextAreaElement {
  type: "textarea";
  styles?: CommonStyles & TypographyStyles;
  attrs?: Attrs<TextAreaAttrKeys>;
}

export type TextInputElement = InputElement | TextAreaElement;

interface JsonElement {
  type: "json";
  value: any;
}

export interface CodeComponentElement<P> {
  type: "component";
  /**
   * The registered component name
   */
  name: string;
  styles?: CommonStyles;
  props?: {
    // For auto-completion
    [prop in keyof Partial<P>]:
      | number
      | string
      | boolean
      | null
      | undefined
      | JsonElement
      | PlasmicElement;
  } & {
    [prop: string]:
      | number
      | string
      | boolean
      | null
      | undefined
      | JsonElement
      | PlasmicElement;
  };
}

export type PlasmicElement =
  | ImageElement
  | TextElement
  | ContainerElement
  | ButtonElement
  | TextInputElement
  | CodeComponentElement<{}>;

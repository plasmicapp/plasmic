export type CSSProperties = Record<string, string>;

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

type ButtonAttrKeys = "disabled" | CommonAttrKeys;

type Attrs<Keys extends string> = Partial<Record<Keys, string>>;

//
// Elements
//

export interface PictureElement {
  type: "img";
  src: string;
  styles?: CSSProperties;
  attrs?: Attrs<PictureAttrKeys>;
}

/*
export interface SvgElement {
  type: "icon";
  src: string;
  styles?: CommonStyles;
  attrs?: Attrs<CommonAttrKeys>;
}
*/

export type ImageElement = PictureElement;

interface LinkTextElement {
  type: "text";
  tag: "a";
  value: string;
  styles?: CSSProperties;
  attrs?: Attrs<LinkAttrKeys>;
}

interface ButtonTextElement {
  type: "text";
  tag: "button";
  value: string;
  styles?: CSSProperties;
  attrs?: Attrs<ButtonAttrKeys>;
}

export interface MarkerBase {
  position: number;
  length: number;
}

export interface StyleMarkerElement extends MarkerBase {
  type: "style";
  styles?: CSSProperties;
}

export interface NodeMarkerElement extends MarkerBase {
  type: "node";
  value: PlasmicElement;
}

export type Marker = StyleMarkerElement | NodeMarkerElement;

interface GenericTextElement {
  type: "text";
  /**
   * Default: "div"
   */
  tag?: Exclude<ContainerTags, "a" | "button">;
  value: string;
  styles?: CSSProperties;
  attrs?: Attrs<CommonAttrKeys>;
  markers?: Marker[];
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
  styles?: CSSProperties;
  attrs?: Attrs<LinkAttrKeys>;
}

interface ButtonContainerElement {
  type: "box" | "vbox" | "hbox";
  tag: "button";
  children?: PlasmicElement | PlasmicElement[];
  styles?: CSSProperties;
  attrs?: Attrs<ButtonAttrKeys>;
}

interface GenericContainerElement {
  type: "box" | "vbox" | "hbox";
  /**
   * Default: "div"
   */
  tag?: Exclude<ContainerTags, "a" | "button">;
  children?: PlasmicElement | PlasmicElement[];
  styles?: CSSProperties;
  attrs?: Attrs<CommonAttrKeys>;
}

export type ContainerElement =
  | LinkContainerElement
  | ButtonContainerElement
  | GenericContainerElement;

interface JsonElement {
  type: "json";
  value: any;
}

export interface DefaultComponentElement<P> {
  type: "default-component";
  kind: "button" | "text-input";
  props?: {
    // For auto-completion
    [prop in keyof Partial<P>]:
      | number
      | string
      | boolean
      | null
      | undefined
      | JsonElement
      | PlasmicElement
      | PlasmicElement[];
  } & {
    [prop: string]:
      | number
      | string
      | boolean
      | null
      | undefined
      | JsonElement
      | PlasmicElement
      | PlasmicElement[];
  };
  styles?: CSSProperties;
}

export interface CodeComponentElement<P> {
  type: "component";
  /**
   * The registered component name
   */
  name: string;
  styles?: CSSProperties;
  props?: {
    // For auto-completion
    [prop in keyof Partial<P>]:
      | number
      | string
      | boolean
      | null
      | undefined
      | JsonElement
      | PlasmicElement
      | PlasmicElement[];
  } & {
    [prop: string]:
      | number
      | string
      | boolean
      | null
      | undefined
      | JsonElement
      | PlasmicElement
      | PlasmicElement[];
  };
}

export type PlasmicElement =
  | ImageElement
  | TextElement
  | ContainerElement
  | CodeComponentElement<{}>
  | DefaultComponentElement<{}>;

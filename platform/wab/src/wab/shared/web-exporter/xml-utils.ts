import { Element, js2xml } from "xml-js";

export type XmlElement = Element;
export type XmlAttrs = Record<string, string>;

/** A child of an element: a nested element or literal text content. */
type XmlChild = XmlElement | string;

/**
 * Builds an xml-js element node with the given attributes and children. String
 * children are wrapped as text nodes; nested elements are passed through.
 */
export function mkXmlElement(
  name: string,
  attrs: XmlAttrs,
  children: XmlChild[] = []
): XmlElement {
  return {
    type: "element",
    name,
    attributes: attrs,
    elements: children.map((child) =>
      typeof child === "string" ? { type: "text", text: child } : child
    ),
  };
}

/**
 * Serializes an xml-js element to a 2-space-indented XML string. xml-js escapes
 * `&`/`<`/`>` in text and `"` in attribute values, so no manual escaping is
 * needed. `fullTagEmptyElement` keeps childless elements as `<tag></tag>`
 * rather than self-closing.
 */
export function toXml(content: XmlElement): string {
  return js2xml(
    { elements: [content] },
    { compact: false, fullTagEmptyElement: true, spaces: 2 }
  );
}

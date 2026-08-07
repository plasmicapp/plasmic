export type XmlAttrs = Record<string, string>;

/** An XML tree node: an element, or a text/CDATA leaf. */
export type XmlNode =
  | XmlElement
  | { type: "text"; text: string }
  | { type: "cdata"; cdata: string };

export interface XmlElement {
  type: "element";
  name: string;
  attributes?: XmlAttrs;
  elements: XmlNode[];
}

/** A child of an element: a nested element or literal text content. */
type XmlChild = XmlElement | string;

/**
 * Builds an element node with the given attributes and children. String
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
 * Serializes an element to an XML string, indented by `spaces` (0 = single line).
 * Text/CDATA children render inline, element children on their own indented lines,
 * and childless elements as `<tag></tag>` (not self-closing). Escapes `&`/`<`/`>`
 * in text and the quoting char in attribute values.
 */
export function toXml(el: XmlElement, opts: { spaces?: number } = {}): string {
  return writeElement(el, opts.spaces ?? 2, 0);
}

function writeElement(el: XmlElement, spaces: number, depth: number): string {
  const attrs = Object.entries(el.attributes ?? {})
    .map(([name, value]) => ` ${name}=${quoteAttr(value)}`)
    .join("");
  const indent = (d: number) =>
    spaces > 0 ? "\n" + " ".repeat(spaces * d) : "";
  const children = el.elements;
  const parts = children.map((child) =>
    child.type === "element"
      ? indent(depth + 1) + writeElement(child, spaces, depth + 1)
      : child.type === "cdata"
      ? `<![CDATA[${child.cdata}]]>`
      : escapeText(child.text)
  );
  const closeIndent = children.some((child) => child.type === "element")
    ? indent(depth)
    : "";
  return `<${el.name}${attrs}>${parts.join("")}${closeIndent}</${el.name}>`;
}

/**
 * Quotes an attribute value, preferring single quotes when the value contains
 * `"` (e.g. the data-props JSON blob) so it reads without `&quot;` escaping.
 * The write side parses with DOMParser, which accepts either quote style.
 */
function quoteAttr(value: string): string {
  if (value.includes('"') && !value.includes("'")) {
    return `'${value}'`;
  }
  return `"${value.replace(/"/g, "&quot;")}"`;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

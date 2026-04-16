import xml from "xml";

export type XmlObject = xml.XmlObject;
export type XmlElement = xml.XmlObject;
export type XmlAttrs = xml.XmlAttrs;

/**
 * Creates an XML object with consistent indentation.
 *
 * The XML spec does not require `"` or `'` to be escaped in text content;
 * only `&` and `<` are mandatory there. The underlying `xml` package
 * over-escapes defensively, emitting `&quot;` and `&apos;` everywhere.
 * We rewrite those back to their literal characters so the output reads
 * cleanly when consumed as LLM context (especially for embedded JSON
 * payloads). Attribute values, where `"` escaping is required, are left
 * alone.
 *
 * Assumes that we won't have output with CDATA or XML comments; either would break
 * the regex below. We can switch to other library with proper spec escaping
 * (e.g. xmlbuilder2) if that changes.
 */
export function toXml(content: XmlObject | XmlObject[]): string {
  return unescapeTextEntities(xml(content, { indent: "  " }));
}

function unescapeTextEntities(serialized: string): string {
  // Match every `>…<` region, i.e. text content between tags. Attribute
  // values sit inside `<…>` and can't contain a literal `<`, so the regex
  // never reaches them.
  return serialized.replace(/>([^<]*)</g, (_m, text: string) => {
    const unescaped = text.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    return `>${unescaped}<`;
  });
}

/**
 * Formats a multi-line text string so it renders cleanly as the text
 * content of an XML element at the given depth of indentation.
 *
 * For example, embedding a 3-line block under a `<foo>` that sits 2 levels
 * deep produces:
 *<ancestor>
 *  <parent>
 *    <foo>
 *      line 1
 *      line 2
 *      line 3
 *    </foo>
 *  </parent>
 *</ancestor>
 */
export function indentXmlTextBlock(text: string, depth: number): string {
  const INDENT = "  ";
  const innerIndent = INDENT.repeat(depth + 1);
  const parentIndent = INDENT.repeat(depth);
  const body = text
    .split("\n")
    .map((line) => (line.length > 0 ? innerIndent + line : line))
    .join("\n");

  return `\n${body}\n${parentIndent}`;
}

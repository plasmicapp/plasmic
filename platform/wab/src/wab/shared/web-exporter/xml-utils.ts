import xml from "xml";

export type XmlObject = xml.XmlObject;
export type XmlElement = xml.XmlObject;
export type XmlAttrs = xml.XmlAttrs;

/**
 * Creates an XML object with consistent indentation.
 */
export function toXml(content: XmlObject | XmlObject[]): string {
  return xml(content, { indent: "  " });
}

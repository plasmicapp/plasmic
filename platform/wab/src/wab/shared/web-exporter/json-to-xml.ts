import { JsonObject, JsonValue } from "@/wab/shared/core/lang";
import { Element, js2xml } from "xml-js";

/**
 * Render a canonical OutputResult JSON model as XML.
 *
 * - A scalar field becomes an attribute `key="value"` on that element.
 * - A typed object field becomes a `<fieldKey>` container of the typed `<__type>` element.
 * - A plain record field (no `__type`, e.g. styles/attrs) becomes a `<fieldKey>` whose own entries are its attributes.
 * - An array field becomes `<fieldKey><ARRAY><ITEM>value</ITEM>…</ARRAY></fieldKey>`.
 * - Large text-block fields (the tpl tree, animation CSS) are emitted as CDATA.
 */
export function jsonToXml(model: JsonObject, prettify = false): string {
  return js2xml(
    { elements: [objectToElement(String(model.__type), model)] },
    // compact:false is the input shape (our element tree), not an output setting,
    // for that we use spaces.
    // fullTagEmptyElement renders an empty field (e.g. `results: []`) as
    // `<results></results>`, mirroring the empty array the JSON shows.
    { compact: false, fullTagEmptyElement: true, spaces: prettify ? 2 : 0 }
  );
}

// Fields whose value is an HTML markup or CSS block, rendered as a CDATA child element.
const CDATA_FIELDS = new Set(["baseVariantTplTree", "keyframesRule"]);

/** Builds an `<name>` element for an object. */
function objectToElement(name: string, obj: JsonObject): Element {
  const attributes: Record<string, string> = {};
  const elements: Element[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === "__type") {
      continue;
    }

    if (Array.isArray(value)) {
      elements.push(arrayElement(key, value));
    } else if (typeof value === "object" && value !== null) {
      // Typed object → <key> wrapping its typed <__type> element; plain record
      // (no __type, e.g. styles/attrs) → <key> carries its own fields directly.
      elements.push(
        isTypedJsonObject(value)
          ? {
              type: "element",
              name: key,
              elements: [objectToElement(value.__type, value)],
            }
          : objectToElement(key, value)
      );
    } else if (CDATA_FIELDS.has(key) && typeof value === "string") {
      elements.push({
        type: "element",
        name: key,
        elements: [{ type: "cdata", cdata: value }],
      });
    } else {
      attributes[key] = String(value);
    }
  }
  return { type: "element", name, attributes, elements };
}

function arrayElement(key: string, items: JsonValue[]): Element {
  const itemElements = items.map((item) => itemElement(item));
  return {
    type: "element",
    name: key,
    elements: [{ type: "element", name: "ARRAY", elements: itemElements }],
  };
}

function itemElement(item: JsonValue): Element {
  if (Array.isArray(item)) {
    return arrayElement("ITEM", item);
  }

  if (typeof item === "object" && item !== null) {
    // Typed object → <ITEM> wrapping its typed element; plain record → <ITEM>
    // carrying its own fields directly.
    return isTypedJsonObject(item)
      ? {
          type: "element",
          name: "ITEM",
          elements: [objectToElement(item.__type, item)],
        }
      : objectToElement("ITEM", item);
  }

  return {
    type: "element",
    name: "ITEM",
    elements: [{ type: "text", text: String(item) }],
  };
}

function isTypedJsonObject(
  obj: JsonObject
): obj is JsonObject & { __type: string } {
  return typeof obj.__type === "string";
}

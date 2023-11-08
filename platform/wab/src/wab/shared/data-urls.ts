import {
  DOMParser as NodeDOMParser,
  XMLSerializer as NodeXMLSerializer,
} from "@xmldom/xmldom";
import * as _parseDataUrl from "parse-data-url";
import { assert } from "../common";
import { processSvg } from "./svgo";

// nodejs doesn't have DOMParser, so we need to polyfill with xmldom :-/
const DOMParser: typeof window.DOMParser =
  typeof window !== "undefined" ? window.DOMParser : NodeDOMParser;

const XMLSerializer: typeof window.XMLSerializer =
  typeof window !== "undefined" ? window.XMLSerializer : NodeXMLSerializer;

export const parseDataUrl: (dataUrl: string) => {
  mediaType: string; // 'image/svg+xml;charset=utf-8'
  contentType: string; // 'image/svg+xml'
  charset: string; // 'utf-8'
  base64: boolean;
  data: string;
  toBuffer: () => Buffer;
} = _parseDataUrl.default || _parseDataUrl;

export const SVG_MEDIA_TYPE = "image/svg+xml";

export function asDataUrl(content: string | Buffer, mediaType: string) {
  return `data:${mediaType};base64,${(Buffer.isBuffer(content)
    ? content
    : Buffer.from(content)
  ).toString("base64")}`;
}

export function asSvgDataUrl(xml: string) {
  return asDataUrl(xml, SVG_MEDIA_TYPE);
}

export function parseSvgXml(xml: string, _domParser?: DOMParser) {
  const domParser = _domParser || new DOMParser();
  const svg = domParser.parseFromString(xml, SVG_MEDIA_TYPE).documentElement;
  assert(svg.tagName === "svg", `Unexpected tagName for svg: ${svg.tagName}`);
  return svg as unknown as SVGSVGElement;
}

export function serializeSvgXml(svg: SVGSVGElement) {
  return new XMLSerializer().serializeToString(svg);
}

export function getParsedDataUrlData(parsed: any) {
  return Buffer.from(
    parsed.data,
    parsed.base64 ? "base64" : "utf-8"
  ).toString();
}

export function parseDataUrlToSvgXml(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  assert(
    parsed && parsed.mediaType === SVG_MEDIA_TYPE,
    `Unexpected mediaType for svg: ${parsed?.mediaType}`
  );
  return getParsedDataUrlData(parsed);
}

export function sanitizeImageDataUrl(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  if (parsed && parsed.mediaType === SVG_MEDIA_TYPE) {
    const xml = getParsedDataUrlData(parsed);
    return asSanitizedSvgUrl(xml);
  } else {
    // May want to do something for non-svg too?  At least white-list
    // the media types
    return dataUrl;
  }
}

export function maybeGetAspectRatioFromImageDataUrl(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  if (parsed && parsed.mediaType === SVG_MEDIA_TYPE) {
    return processSvg(getParsedDataUrlData(parsed))?.aspectRatio;
  }
  return undefined;
}

export function asSanitizedSvgUrl(xml: string) {
  const newSvgXml = processSvg(xml)?.xml;
  if (!newSvgXml) {
    return undefined;
  }
  return asSvgDataUrl(newSvgXml);
}

export function imageDataUriToBlob(dataUri: string) {
  const parsed = parseDataUrl(dataUri);
  const buffer = parsed.toBuffer().buffer;
  return new Blob([buffer], { type: parsed.contentType });
}

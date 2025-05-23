import { assert } from "@/wab/shared/common";
import { DOMParser as NodeDOMParser } from "@xmldom/xmldom";
import * as _parseDataUrl from "parse-data-url";

// nodejs doesn't have DOMParser, so we need to polyfill with xmldom :-/
const DOMParser: typeof window.DOMParser =
  typeof window !== "undefined" ? window.DOMParser : NodeDOMParser;

type ParseDataUrlResult = {
  mediaType: string; // 'image/svg+xml;charset=utf-8'
  contentType: string; // 'image/svg+xml'
  charset: string; // 'utf-8'
  base64: boolean;
  data: string;
  toBuffer: () => Buffer;
};

export const parseDataUrl: (dataUrl: string) => ParseDataUrlResult =
  _parseDataUrl.default || _parseDataUrl;

export const SVG_MEDIA_TYPE = "image/svg+xml";

export function asDataUrl(
  content: string | Buffer,
  mediaType: string,
  encoding?: BufferEncoding
) {
  return `data:${mediaType};base64,${(Buffer.isBuffer(content)
    ? content
    : Buffer.from(content, encoding)
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

export function getParsedDataUrlBuffer(parsed: ParseDataUrlResult) {
  return Buffer.from(parsed.data, parsed.base64 ? "base64" : "utf-8");
}

export function getParsedDataUrlData(parsed: ParseDataUrlResult) {
  return getParsedDataUrlBuffer(parsed).toString();
}

export function parseDataUrlToSvgXml(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  assert(
    parsed && parsed.mediaType === SVG_MEDIA_TYPE,
    `Unexpected mediaType for svg: ${parsed?.mediaType}`
  );
  return getParsedDataUrlData(parsed);
}

export function imageDataUriToBlob(dataUri: string) {
  const parsed = parseDataUrl(dataUri);
  const buffer = parsed.toBuffer();
  return new Blob([buffer], { type: parsed.contentType });
}

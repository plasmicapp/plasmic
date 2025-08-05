import { getParsedDataUrlBuffer, parseDataUrl } from "@/wab/shared/data-urls";

export function pngData() {
  // 5x5 red dot
  const dataUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
  const clipboardData = {
    "text/html":
      '<img src="https://example.com/tiny.png" alt="tiny red dot" />',
    "image/png": new File(
      [getParsedDataUrlBuffer(parseDataUrl(dataUri))],
      "tiny.png",
      { type: "image/png" }
    ),
  };
  return {
    dataUri,
    clipboardData,
    height: 5,
    width: 5,
  };
}

export function svgData() {
  const xml =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" /></svg>';
  const dataUri =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cGF0aCBkPSJNMTAgMTBoODB2ODBIMTB6Ii8+Cjwvc3ZnPgo=";
  const clipboardData = {
    "text/plain": xml,
  };
  return {
    xml,
    dataUri,
    clipboardData,
    height: 100,
    width: 100,
  };
}

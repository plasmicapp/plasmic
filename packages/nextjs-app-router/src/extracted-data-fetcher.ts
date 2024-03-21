import { parse as parseHtml } from "node-html-parser";

export async function fetchExtractedQueryData(url: string) {
  const res = await fetch(url);
  if (res.status !== 200) {
    return undefined;
  }

  const html = await res.text();
  const root = parseHtml(html);
  const script = root.querySelector("script[data-plasmic-prefetch-id]");
  if (script) {
    return JSON.parse(script.innerHTML);
  }
  return undefined;
}

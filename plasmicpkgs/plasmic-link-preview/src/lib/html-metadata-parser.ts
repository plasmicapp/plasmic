import { HTMLElement, parse as HTML } from "node-html-parser";

interface Meta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  site_name?: string;
}

export interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  hostname?: string;
}

const readMT = (el: HTMLElement, name: string) => {
  const prop = el.getAttribute("name") || el.getAttribute("property");
  return prop == name ? el.getAttribute("content") : null;
};

const isValidUrl = (url: string) => {
  return /(^http(s?):\/\/[^\s$.?#].[^\s]*)/i.test(url);
};

const getMetadata = async (url: string): Promise<Metadata> => {
  if (!isValidUrl(url)) return {};

  const contents = await fetch(`https://corsproxy.io/?${url}`).then((res) =>
    res.text()
  );

  const $ = HTML(contents);

  const getHostname = () => {
    const { hostname } = new URL(url);
    return hostname;
  };

  const getTitle = () => {
    const title = $.querySelector("title");
    return title?.text;
  };

  const metas = $.querySelectorAll("meta");
  const meta: Meta = {};

  for (let i = 0; i < metas.length; i++) {
    const el = metas[i];

    ["title", "description", "image"].forEach((s) => {
      const val = readMT(el, s);
      if (val) meta[s as keyof Meta] = val;
    });

    [
      "og:title",
      "og:description",
      "og:image",
      "og:url",
      "og:site_name",
      "og:type",
    ].forEach((s) => {
      const val = readMT(el, s);
      if (val) meta[s.split(":")[1] as keyof Meta] = val;
    });
  }

  // images
  $.querySelectorAll("img").every((el) => {
    const src: string | undefined = el.getAttribute("src");
    if (src) {
      meta.image = new URL(src, url).href;
      return false;
    }
    return true;
  });

  const metadata: Metadata = {
    hostname: getHostname(),
    title: getTitle(),
    ...meta,
  };

  return metadata;
};

export default getMetadata;
export { isValidUrl };

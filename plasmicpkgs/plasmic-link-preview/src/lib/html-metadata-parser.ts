import { parse as HTML } from "node-html-parser";

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

  const meta: Meta = {};

  const metas = $.querySelectorAll("meta")
    .map((el) => ({
      name: el.getAttribute("name") || el.getAttribute("property"),
      content: el.getAttribute("content"),
    }))
    .filter((item) => item.name && item.content);

  [
    "og:title",
    "og:description",
    "twitter:description",
    // in order of priority, og:image is sufficient if present
    "og:image",
    "twitter:image",
    "og:url",
    "og:site_name",
    "og:type",
  ].forEach((metaName) => {
    const metasItem = metas.find((m) => m.name === metaName);
    if (!metasItem || !metasItem.name) return;
    const key = metasItem.name.split(":")[1] as keyof Meta;
    if (!meta[key]) meta[key] = metasItem.content;
  });

  ["title", "description", "image"].forEach((metaName) => {
    const metasItem = metas.find((m) => m.name === metaName);
    if (!metasItem || !metasItem.name) return;
    const key = metaName as keyof Meta;
    if (!meta[key]) meta[key] = metasItem.content;
  });

  if (!meta.image) {
    // find all images available and choose one!
    $.querySelectorAll("img").every((el) => {
      const src: string | undefined = el.getAttribute("src");
      if (src) {
        meta.image = new URL(src, url).href;
        return false;
      }
      return true;
    });
  }

  const metadata: Metadata = {
    hostname: getHostname(),
    title: getTitle(),
    ...meta,
  };

  return metadata;
};

export default getMetadata;
export { isValidUrl };

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlasmicImg } from "./index";

describe("PlasmicImg", () => {
  const key = "07a7153536a89fef14e0075c7632d6b3.jpg";
  const host = "https://img.plasmic.app";

  function renderImage(
    src: string,
    props: Partial<React.ComponentProps<typeof PlasmicImg>> = {},
  ) {
    return renderToStaticMarkup(
      <PlasmicImg
        src={{ src, fullWidth: 1200, fullHeight: 800 }}
        loader="plasmic"
        {...props}
      />,
    );
  }

  it.each([
    key,
    `http://site-assets.plasmic.app/${key}`,
    `${host}/img-optimizer/v1/img/${key}`,
    `${host}/i/${key}?w=320`,
  ])("emits canonical responsive URLs for %s", (src) => {
    const markup = renderImage(src, { quality: 42 });
    expect(markup).toContain(`src="${host}/i/${key}?q=42"`);
    expect(markup).toContain(
      `srcSet="${host}/i/${key}?w=640&amp;q=42&amp;f=webp 640w`,
    );
  });

  it.each([
    `https://external.example/${key}`,
    `https://img.plasmic.app.example/i/${key}`,
    `ftp://img.plasmic.app/i/${key}`,
    `${host}/i/example.jpg`,
    `${host}/i/${key.replace(".jpg", ".SVG")}?v=1`,
    key.replace(".jpg", ".svg"),
    key + "/child",
    "/images/photo.jpg",
  ])("renders %s directly", (src) => {
    const markup = renderImage(src);
    expect(markup).toContain(`src="${src}"`);
    expect(markup).not.toContain("srcSet=");
  });

  it("uses the configured optimizer and explicit format", () => {
    const loader = "https://img.example.com";
    const markup = renderImage(`${loader}/i/${key}`, { loader, format: "png" });
    expect(markup).toContain(`src="${loader}/i/${key}?q=75&amp;f=png"`);
    expect(markup).not.toContain("<source");
  });

  it("lets a custom loader resize external images", () => {
    const src = "https://external.example/photo.jpg";
    const markup = renderImage(src, {
      loader: {
        supportsUrl: (url) => url === src,
        transformUrl: ({ src: url, width }) => `${url}?w=${width ?? "full"}`,
      },
    });
    expect(markup).toContain(`src="${src}?w=full"`);
    expect(markup).toContain(`srcSet="${src}?w=640 640w`);
  });

  it("sizes the spacer of an SVG from its exact aspect ratio", () => {
    const markup = renderToStaticMarkup(
      <PlasmicImg
        src={{
          src: "https://site-assets.plasmic.app/example.svg",
          fullWidth: 246,
          fullHeight: 150,
          aspectRatio: 1120 / 682,
        }}
      />,
    );
    const spacerSrc = markup.match(/data:image\/svg\+xml;base64,([^"]+)/)![1];
    expect(Buffer.from(spacerSrc, "base64").toString()).toContain(
      `width="10000" height="${10000 / (1120 / 682)}"`,
    );
  });
});

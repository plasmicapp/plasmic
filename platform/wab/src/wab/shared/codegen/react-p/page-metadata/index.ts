import { makePlasmicComponentName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { PageMetadata } from "@/wab/shared/codegen/types";
import { assert, strict } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import { Component, PageMeta } from "@/wab/shared/model/classes";
import L from "lodash";

function getOgImageLink(
  ctx: SerializerBaseContext,
  image: PageMeta["openGraphImage"]
) {
  if (!image) {
    return undefined;
  }
  if (L.isString(image)) {
    return image;
  }

  const imageLink = ctx.s3ImageLinks[image.uuid] || image.dataUri;

  assert(
    imageLink && imageLink.startsWith("http"),
    "The open graph image must be a valid, fully qualified URL."
  );

  return imageLink;
}

export function serializePageMetadata(
  ctx: SerializerBaseContext,
  page: Component
): string {
  if (!isPageComponent(page)) {
    return "";
  }

  const title = page.pageMeta?.title || "";
  const description = page.pageMeta?.description || "";
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage) || "";
  const canonical = page.pageMeta?.canonical || "";

  const pageMetadata = JSON.stringify(
    { title, description, ogImageSrc, canonical },
    undefined,
    2
  );

  return `
    // Page metadata
    pageMetadata: ${pageMetadata},
  `;
}

function serializePageMetadataKey(ctx: SerializerBaseContext, key: string) {
  const componentName = makePlasmicComponentName(ctx.component);
  return `${componentName}.pageMetadata.${key}`;
}

export function renderPageHead(
  ctx: SerializerBaseContext,
  page: Component
): string {
  const title = page.pageMeta?.title;
  const description = page.pageMeta?.description;
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage);
  const canonical = page.pageMeta?.canonical;

  const shouldRenderHead = title || description || ogImageSrc || canonical;
  if (!shouldRenderHead || ctx.exportOpts.skipHead) {
    return "";
  }

  return strict`
    ${
      ogImageSrc
        ? strict`<meta name="twitter:card" content="summary_large_image" />`
        : strict`<meta name="twitter:card" content="summary" />`
    }
    ${
      title
        ? strict`<title key="title">{${serializePageMetadataKey(
            ctx,
            "title"
          )}}</title>
          <meta key="og:title" property="og:title" content={${serializePageMetadataKey(
            ctx,
            "title"
          )}} />
          <meta key="twitter:title" name="twitter:title" content={${serializePageMetadataKey(
            ctx,
            "title"
          )}} />`
        : ""
    }
    ${
      description
        ? strict`<meta key="description" name="description" content={${serializePageMetadataKey(
            ctx,
            "description"
          )}} />
          <meta key="og:description" property="og:description" content={${serializePageMetadataKey(
            ctx,
            "description"
          )}} />
          <meta key="twitter:description" name="twitter:description" content={${serializePageMetadataKey(
            ctx,
            "description"
          )}} />`
        : ""
    }
    ${
      ogImageSrc
        ? strict`<meta key="og:image" property="og:image" content={${serializePageMetadataKey(
            ctx,
            "ogImageSrc"
          )}} />
          <meta key="twitter:image" name="twitter:image" content={${serializePageMetadataKey(
            ctx,
            "ogImageSrc"
          )}} />`
        : ""
    }
    ${
      canonical
        ? strict`<link rel="canonical" href={${serializePageMetadataKey(
            ctx,
            "canonical"
          )}} />`
        : ""
    }
  `;
}

export function makePageMetadataOutput(
  ctx: SerializerBaseContext
): PageMetadata | undefined {
  const { component } = ctx;
  if (!component.pageMeta) {
    return undefined;
  }
  return {
    path: component.pageMeta?.path as string,
    description: component.pageMeta?.description,
    title: component.pageMeta?.title,
    canonical: component.pageMeta?.canonical,
    openGraphImageUrl: getOgImageLink(ctx, component.pageMeta?.openGraphImage),
  };
}

import {
  generateDataTokenImports,
  getDataTokenIdentifiersFromPageMeta,
} from "@/wab/shared/codegen/react-p/data-tokens/imports";
import { serializeGeneratePageMetadataBody } from "@/wab/shared/codegen/react-p/page-metadata/serializer";
import {
  makePlasmicComponentName,
  makeTanStackHeadOptionsExportName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  getDataTokensFromServerQueries,
  serializeCreateDollarQueries,
} from "@/wab/shared/codegen/react-p/server-queries";
import { serializeMakeAppRouterPageCtx } from "@/wab/shared/codegen/react-p/server-queries/serializer";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { isPlatformNextJs } from "@/wab/shared/codegen/react-p/utils";
import { PageMetadata } from "@/wab/shared/codegen/types";
import { assert, strict } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import { asCode, stripParens } from "@/wab/shared/core/exprs";
import {
  Component,
  Expr,
  ImageAssetRef,
  PageMeta,
  isKnownExpr,
  isKnownImageAssetRef,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import L from "lodash";

/**
 * Check if any PageMeta field contains an Expr
 */
function hasDynamicMetadata(pageMeta: PageMeta | null | undefined): boolean {
  if (!pageMeta) {
    return false;
  }
  for (const metaValue of Object.values(pageMeta)) {
    if (metaValue != null && !L.isString(metaValue) && isKnownExpr(metaValue)) {
      return true;
    }
  }
  return false;
}

function getOgImageLink(
  ctx: SerializerBaseContext,
  image: PageMeta["openGraphImage"]
): string | undefined {
  if (!image) {
    return undefined;
  }
  if (L.isString(image)) {
    return image;
  }
  if (isKnownTemplatedString(image)) {
    // TODO: Handle dynamic OG images
    return undefined;
  }
  // At this point, image must be ImageAssetRef
  if (!isKnownImageAssetRef(image)) {
    return undefined;
  }
  const asset = image.asset;
  if (asset) {
    const imageLink = ctx.s3ImageLinks[asset.uuid] || asset.dataUri;

    assert(
      imageLink && imageLink.startsWith("http"),
      "The open graph image must be a valid, fully qualified URL."
    );

    return imageLink;
  }
  return undefined;
}

export function serializePageMetadata(component: Component): string {
  const pageRoute = component.pageMeta?.path ?? "";
  return `
    pageMetadata: generateDynamicMetadata(
      wrapQueriesWithLoadingProxy({}),
      { pageRoute: "${pageRoute}", pagePath: "${pageRoute}", params: {}, query: {} }
    )
  `;
}

/**
 * Old page metadata reference format
 * TODO - replace Tanstack head with local/dynamic metadata
 */
function serializePageMetadataKey(componentName: string, key: string) {
  return `${componentName}.pageMetadata.${key}`;
}

function serializeLocalMetadataKey(key: string) {
  return `pageMetadata.${key}`;
}

/**
 * Serialize meta tags for the provided metaKeys, which have the same value
 */
function serializeMetaTags(props: {
  componentName: string;
  key: string;
  metaKeys: string[];
  isNextJs: boolean;
}) {
  const serializedKey = props.isNextJs
    ? serializeLocalMetadataKey(props.key)
    : serializePageMetadataKey(props.componentName, props.key);
  return props.metaKeys
    .map((metaKey) =>
      metaKey === "title"
        ? `<title key="title">{${serializedKey}}</title>`
        : `<meta key="${metaKey}" property="${metaKey}" content={${serializedKey}} />`
    )
    .join("\n");
}

export function renderPageHead(
  ctx: SerializerBaseContext,
  page: Component
): string {
  const isNextJs = isPlatformNextJs(ctx);
  const title = page.pageMeta?.title;
  const description = page.pageMeta?.description;
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage);
  const canonical = page.pageMeta?.canonical;

  const shouldRenderHead = title || description || ogImageSrc || canonical;

  if (!shouldRenderHead || ctx.exportOpts.skipHead) {
    return "";
  }
  const componentName = makePlasmicComponentName(ctx.component);

  return strict`
    ${
      ogImageSrc
        ? strict`<meta name="twitter:card" content="summary_large_image" />`
        : strict`<meta name="twitter:card" content="summary" />`
    }
    ${
      title
        ? serializeMetaTags({
            componentName,
            key: "title",
            metaKeys: ["title", "og:title", "twitter:title"],
            isNextJs,
          })
        : ""
    }
    ${
      description
        ? serializeMetaTags({
            componentName,
            key: "description",
            metaKeys: ["description", "og:description", "twitter:description"],
            isNextJs,
          })
        : ""
    }
    ${
      ogImageSrc
        ? serializeMetaTags({
            componentName,
            key: "ogImageSrc",
            metaKeys: ["og:image", "twitter:image"],
            isNextJs,
          })
        : ""
    }
    ${
      canonical
        ? strict`<link rel="canonical" href={${
            isNextJs
              ? serializeLocalMetadataKey("alternates?.canonical")
              : serializePageMetadataKey(componentName, "alternates?.canonical")
          }} />`
        : ""
    }
  `;
}

export function serializeTanStackHead(
  ctx: SerializerBaseContext,
  page: Component
) {
  const title = page.pageMeta?.title;
  const description = page.pageMeta?.description;
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage);
  const canonical = page.pageMeta?.canonical;
  const exportName = makeTanStackHeadOptionsExportName(page);
  const componentName = makePlasmicComponentName(ctx.component);

  const linkEntries: string[] = [];

  const metaEntries: string[] = [];
  if (!ctx.exportOpts.skipHead) {
    metaEntries.push(
      `{ name: "twitter:card", content: ${
        ogImageSrc ? `"summary_large_image"` : `"summary"`
      } }`
    );

    if (title) {
      const titleKey = serializePageMetadataKey(componentName, "title");
      metaEntries.push(
        `{ key: "title", title: ${titleKey} }`,
        `{ key: "og:title", property: "og:title", content: ${titleKey} }`,
        `{ key: "twitter:title", name: "twitter:title", content: ${titleKey} }`
      );
    }

    if (description) {
      const descriptionKey = serializePageMetadataKey(
        componentName,
        "description"
      );
      metaEntries.push(
        `{ key: "description", name: "description", content: ${descriptionKey} }`,
        `{ key: "og:description", property: "og:description", content: ${descriptionKey} }`,
        `{ key: "twitter:description", name: "twitter:description", content: ${descriptionKey} }`
      );
    }

    if (ogImageSrc) {
      const ogImageSrcKey = serializePageMetadataKey(
        componentName,
        "ogImageSrc"
      );
      metaEntries.push(
        `{ key: "og:image", property: "og:image", content: ${ogImageSrcKey} }`,
        `{ key: "twitter:image", name: "twitter:image", content: ${ogImageSrcKey} }`
      );
    }

    if (canonical) {
      const canonicalKey = serializePageMetadataKey(componentName, "canonical");
      linkEntries.push(`{ rel: "canonical", href: ${canonicalKey} }`);
    }
  }

  return `export const ${exportName} = {
  meta: ${
    metaEntries.length
      ? `[
    ${metaEntries.join(",\n    ")}
  ]`
      : "[]"
  },
  links: [
    ${linkEntries.join(",\n    ")}
  ]
} as Record<"meta" | "links", Array<Record<string, string>>>;`;
}

export function makePageMetadataOutput(
  ctx: SerializerBaseContext
): PageMetadata | undefined {
  const pageMeta = ctx.component.pageMeta;
  if (!pageMeta) {
    return undefined;
  }
  return {
    path: pageMeta.path as string,
    description:
      flattenMetadataValueToString(pageMeta.description) || undefined,
    title: flattenMetadataValueToString(pageMeta.title) || undefined,
    canonical: flattenMetadataValueToString(pageMeta.canonical) || undefined,
    openGraphImageUrl: getOgImageLink(ctx, pageMeta.openGraphImage),
  };
}

/**
 * Helper to serialize a metadata field value (either string or Expr)
 */
function serializeMetadataValue(
  ctx: SerializerBaseContext,
  value: string | any | null | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }
  if (L.isString(value)) {
    return JSON.stringify(value);
  }
  if (isKnownExpr(value)) {
    // Serialize the expression to JavaScript code
    // TODO - String() is used to coerce query proxies (is there a better way?)
    return `String(${stripParens(asCode(value, ctx.exprCtx).code)})`;
  }
  return undefined;
}

function flattenMetadataValueToString(
  value: string | any | null | undefined
): string {
  if (!value) {
    return "";
  }
  if (L.isString(value)) {
    return value;
  }
  if (isKnownTemplatedString(value)) {
    return value.text.filter((val) => L.isString(val)).join("");
  }
  return "";
}

/**
 * Gets data token imports needed for metadata generation from PageMeta.
 * excludeQueries is use in the app router server page skeleton. We import
 * server queries there, so only page meta token references are needed
 */
export function getDataTokenImportsForPageMeta(
  ctx: SerializerBaseContext,
  pageMeta: PageMeta | null | undefined,
  opts?: { excludeQueries?: boolean }
): string {
  const tokenIdentifiers = pageMeta
    ? getDataTokenIdentifiersFromPageMeta(pageMeta)
    : new Set<string>();
  if (!opts?.excludeQueries) {
    getDataTokensFromServerQueries(ctx.component.serverQueries).forEach(
      (identifier) => tokenIdentifiers.add(identifier)
    );
  }
  return generateDataTokenImports(
    tokenIdentifiers,
    ctx.site,
    ctx.projectConfig.projectId,
    ctx.exportOpts
  );
}

function getOgImageValue(
  ctx: SerializerBaseContext,
  metaImage: string | Expr | ImageAssetRef | null | undefined
): string | undefined {
  if (!metaImage) {
    return undefined;
  }
  if (L.isString(metaImage)) {
    return JSON.stringify(metaImage);
  }
  if (isKnownImageAssetRef(metaImage)) {
    const asset = metaImage.asset;
    if (asset) {
      const imageLink = ctx.s3ImageLinks[asset.uuid] || asset.dataUri;
      assert(
        imageLink && imageLink.startsWith("http"),
        "The open graph image must be a valid, fully qualified URL."
      );
      return JSON.stringify(imageLink);
    }
    return undefined;
  }
  if (isKnownExpr(metaImage)) {
    return stripParens(asCode(metaImage, ctx.exprCtx).code);
  }
  return undefined;
}

/**
 * Function that accepts serverQueries and resolves dynamic metadata entries
 */
export function serializeDynamicMetadataProxies() {
  const metaWithProxies = `
const emptyProxy: any = new Proxy(() => "", {
  get(_, prop) {
    return prop === Symbol.toPrimitive ? () => "" : emptyProxy;
  },
});

function wrapQueriesWithLoadingProxy($q: any): any {
  return new Proxy($q, {
    get(target, queryName) {
      const query = target[queryName];
      return !query || query.isLoading || !query.data ? emptyProxy : query;
    },
  });
}
`;
  return metaWithProxies;
}

export function serializeGenerateDynamicMetadataFunction(
  ctx: SerializerBaseContext
) {
  const pageMeta = ctx.component.pageMeta;
  const metaFunction = `
export type PageCtx = {
  pageRoute: string;
  pagePath: string;
  params: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
};

export function generateDynamicMetadata($q: any, $ctx: PageCtx) {
  return ${pageMeta ? serializeDynamicMetadataObject(ctx, pageMeta) : "{}"};
}`;
  return metaFunction;
}

/**
 * Platform-agnostic page metadata type, structurally compatible with Next.js Metadata
 */
function getMetadataTypeDefinition(): string {
  return `/**
 * Platform-agnostic page metadata type.
 * Structurally compatible with Next.js Metadata and other meta frameworks.
 */
type PlasmicPageMetadata = {
  title?: string;
  description?: string;
  openGraph?: {
    title?: string;
    description?: string;
    images?: string[];
  };
  twitter?: {
    card?: "summary" | "summary_large_image";
    title?: string;
    description?: string;
    images?: string[];
  };
  alternates?: {
    canonical?: string;
  };
};`;
}

function serializeDynamicMetadataObject(
  ctx: SerializerBaseContext,
  pageMeta: PageMeta
) {
  // Serialize metadata field values
  const titleValue = serializeMetadataValue(ctx, pageMeta.title);
  const descriptionValue = serializeMetadataValue(ctx, pageMeta.description);
  const canonicalValue = serializeMetadataValue(ctx, pageMeta.canonical);

  // Handle OG image (can be string, ImageAsset, or Expr)
  const ogImageValue = getOgImageValue(ctx, pageMeta.openGraphImage);

  // Build the metadata object
  const titleKeyValue = titleValue ? `title: ${titleValue},` : "";
  const descriptionKeyValue = descriptionValue
    ? `description: ${descriptionValue},`
    : "";
  const ogImageKeyValue = ogImageValue ? `images: [${ogImageValue}],` : "";

  return `{
    ${titleKeyValue}
    ${descriptionKeyValue}
    openGraph: {
      ${titleKeyValue}
      ${descriptionKeyValue}
      ${ogImageKeyValue}
    },
    twitter: {
      card: ${ogImageValue ? '"summary_large_image"' : '"summary"'},
      ${titleKeyValue}
      ${descriptionKeyValue}
      ${ogImageKeyValue}
    },
    ${canonicalValue ? `alternates: { canonical: ${canonicalValue} },` : ""}
  }`;
}

export function serializeGenerateMetadataFunction(
  ctx: SerializerBaseContext
): { module: string; fileName: string } | undefined {
  const { component, hasServerQueries } = ctx;

  if (!isPageComponent(component) || !component.pageMeta) {
    return undefined;
  }

  const pageMeta = component.pageMeta;
  const isDynamic = hasDynamicMetadata(pageMeta);
  const propTypeName = "GenerateMetadataProps";
  const moduleFileName = `__generateMetadata_${makePlasmicComponentName(
    component
  )}_${component.uuid}.tsx`;

  // Generate static metadata export if no dynamic values
  if (!isDynamic) {
    const metadataObject = serializeDynamicMetadataObject(ctx, pageMeta);
    return {
      module: `
${getMetadataTypeDefinition()}

export const metadata: PlasmicPageMetadata = ${metadataObject};
`,
      fileName: moduleFileName,
    };
  }

  // Get data token imports for metadata expressions
  const dataTokenImports = getDataTokenImportsForPageMeta(ctx, pageMeta);

  const module = `
${dataTokenImports}
${getMetadataTypeDefinition()}

${serializeCreateDollarQueries(ctx)}

${serializeMakeAppRouterPageCtx(ctx, propTypeName)}

export async function generateMetadata(props: ${propTypeName}): Promise<PlasmicPageMetadata> {
  const { params, searchParams } = props;
  ${
    ctx.hasServerQueries
      ? serializeGeneratePageMetadataBody({ hasServerQueries })
      : `const metadata: PlasmicPageMetadata = ${serializeDynamicMetadataObject(
          ctx,
          pageMeta
        )};`
  }
  return metadata;
}
`;

  return {
    module,
    fileName: moduleFileName,
  };
}

import { serializeCustomFunctionsAndLibs } from "@/wab/shared/codegen/react-p/custom-functions";
import { generateDataTokenImports } from "@/wab/shared/codegen/react-p/data-tokens/imports";
import {
  getExportedComponentName,
  makePlasmicComponentName,
  makeTanStackHeadOptionsExportName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { MK_PATH_FROM_ROUTE_AND_PARAMS_SER } from "@/wab/shared/codegen/react-p/server-queries/serializer";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { PageMetadata } from "@/wab/shared/codegen/types";
import { assert, strict } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import { asCode, stripParens } from "@/wab/shared/core/exprs";
import {
  extractDataTokenIdentifiersFromCode,
  isPathDataToken,
} from "@/wab/shared/eval/expression-parser";
import {
  Component,
  Expr,
  ImageAsset,
  ImageAssetRef,
  PageMeta,
  isKnownCustomCode,
  isKnownExpr,
  isKnownImageAssetRef,
  isKnownObjectPath,
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

export function serializePageMetadata(
  ctx: SerializerBaseContext,
  page: Component
): string {
  if (!isPageComponent(page)) {
    return "";
  }

  const title = flattenMetadataValueToString(page.pageMeta?.title);
  const description = flattenMetadataValueToString(page.pageMeta?.description);
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage) || "";
  const canonical = flattenMetadataValueToString(page.pageMeta?.canonical);

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

function serializePageMetadataKey(componentName: string, key: string) {
  return `${componentName}.pageMetadata.${key}`;
}

/**
 * Serialize meta tags for the provided metaKeys, which have the same value
 */
function serializeMetaTags(props: {
  componentName: string;
  key: string;
  metaKeys: string[];
}) {
  const serializedKey = serializePageMetadataKey(
    props.componentName,
    props.key
  );
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
  const title = page.pageMeta?.title;
  const description = page.pageMeta?.description;
  const ogImageSrc = getOgImageLink(ctx, page.pageMeta?.openGraphImage);
  const canonical = page.pageMeta?.canonical;

  const shouldRenderHead = title || description || ogImageSrc || canonical;

  // Skip <Head> generation for Next.js App Router (uses generateMetadata instead)
  const isAppRouter = !!ctx.exportOpts.platformOptions?.nextjs?.appDir;

  if (!shouldRenderHead || ctx.exportOpts.skipHead || isAppRouter) {
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
          })
        : ""
    }
    ${
      description
        ? serializeMetaTags({
            componentName,
            key: "description",
            metaKeys: ["description", "og:description", "twitter:description"],
          })
        : ""
    }
    ${
      ogImageSrc
        ? serializeMetaTags({
            componentName,
            key: "ogImageSrc",
            metaKeys: ["og:image", "twitter:image"],
          })
        : ""
    }
    ${
      canonical
        ? strict`<link rel="canonical" href={${serializePageMetadataKey(
            componentName,
            "canonical"
          )}} />`
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
    return stripParens(asCode(value, ctx.exprCtx).code);
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
 * Recursively extract data token identifiers from an expression
 */
function getDataTokensFromExpr(
  expr: string | Expr | ImageAsset | null | undefined,
  tokenIdentifiers: Set<string>
): void {
  if (!expr || typeof expr === "string") {
    return;
  }

  if (isKnownObjectPath(expr) && isPathDataToken(expr.path)) {
    tokenIdentifiers.add(expr.path[0]);
  } else if (isKnownCustomCode(expr)) {
    extractDataTokenIdentifiersFromCode(expr.code).forEach((id) =>
      tokenIdentifiers.add(id)
    );
  } else if (isKnownTemplatedString(expr)) {
    for (const part of expr.text) {
      getDataTokensFromExpr(part, tokenIdentifiers);
    }
  }
}

/**
 * Gets data token imports needed for metadata generation from PageMeta.
 */
function getDataTokenImportsForPageMeta(
  ctx: SerializerBaseContext,
  pageMeta: PageMeta
): string {
  const tokenIdentifiers = new Set<string>();

  // Check each PageMeta field for data token usage
  const fieldsToCheck = [
    pageMeta.title,
    pageMeta.description,
    pageMeta.canonical,
    pageMeta.openGraphImage,
  ];

  for (const field of fieldsToCheck) {
    getDataTokensFromExpr(field, tokenIdentifiers);
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

export function serializeGenerateMetadataFunction(
  ctx: SerializerBaseContext
): { module: string; fileName: string } | undefined {
  const { component } = ctx;

  if (!isPageComponent(component) || !component.pageMeta) {
    return undefined;
  }

  const pageMeta = component.pageMeta;
  const isDynamic = hasDynamicMetadata(pageMeta);

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
  const metadataObject = `{
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

  // Generate static metadata export if no dynamic values
  if (!isDynamic) {
    return {
      module: `
${getMetadataTypeDefinition()}

export const metadata: PlasmicPageMetadata = ${metadataObject};
`,
      fileName: `__generateMetadata_${makePlasmicComponentName(component)}.tsx`,
    };
  }

  // Generate dynamic generateMetadata function
  const { customFunctionsAndLibsImport, serializedCustomFunctionsAndLibs } =
    serializeCustomFunctionsAndLibs(ctx);

  const serverQueriesImport = `import { executeServerQueries } from "./__loader_rsc_${getExportedComponentName(
    component
  )}";`;

  // Get data token imports for metadata expressions
  const dataTokenImports = getDataTokenImportsForPageMeta(ctx, pageMeta);

  const module = `
${getMetadataTypeDefinition()}
${serverQueriesImport}
${customFunctionsAndLibsImport}
${dataTokenImports}

${serializedCustomFunctionsAndLibs}
${MK_PATH_FROM_ROUTE_AND_PARAMS_SER}

type ParamsRecord = Record<string, string | string[] | undefined>;
type GenerateMetadataProps = {
  params: Promise<ParamsRecord> | ParamsRecord;
  query: Promise<ParamsRecord> | ParamsRecord;
};

export async function generateMetadata(props: GenerateMetadataProps): Promise<PlasmicPageMetadata> {
  const { params, query } = props;

  const pageRoute = "${pageMeta.path}";
  const pageParams = (await params) ?? {};
  const pagePath = mkPathFromRouteAndParams(pageRoute, pageParams);

  const $ctx = {
    pageRoute,
    pagePath,
    params: pageParams,
    query: (await query) ?? {},
  };
  const $queries = await executeServerQueries($ctx);
  return ${metadataObject};
}
`;

  return {
    module,
    fileName: `__generateMetadata_${makePlasmicComponentName(component)}.tsx`,
  };
}

import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makeCatchallPage_app_loader(jsOrTs: JsOrTs): string {
  return `import { PLASMIC } from "@/plasmic-init";
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";
import { ${ifTs(
    jsOrTs,
    `ComponentRenderData,`
  )}PlasmicComponent } from "@plasmicapp/loader-nextjs";${ifTs(
    jsOrTs,
    `
import { Metadata, ResolvingMetadata } from "next";`
  )}
import { notFound } from "next/navigation";

// Use revalidate if you want incremental static regeneration
export const revalidate = 60;
${ifTs(
  jsOrTs,
  `interface Params {
      catchall: string[] | undefined;
    }`
)}
export async function generateStaticParams()${ifTs(
    jsOrTs,
    ": Promise<Params[]>"
  )} {
  const pageModules = await PLASMIC.fetchPages();
  return pageModules.map((mod) => {
    const catchall =
      mod.path === "/" ? undefined : mod.path.substring(1).split("/");
    return {
      catchall,
    };
  });
}
${ifTs(
  jsOrTs,
  `interface LoaderPageProps {
      params: Promise<Params>;
    }`
)}
export async function generateMetadata(
  { params }${ifTs(jsOrTs, `: LoaderPageProps`)},
  parent${ifTs(jsOrTs, `: ResolvingMetadata`)}
)${ifTs(jsOrTs, `: Promise<Metadata>`)} {
  const { componentData } = await getPlasmicData(params);

  if (!componentData) {
    return parent${ifTs(jsOrTs, ` as Promise<Metadata>`)};
  }
  const pageMeta = componentData.entryCompMetas[0];
  const metadata = await PLASMIC.getPlasmicMetadata(componentData, {
    params: pageMeta.params ?? {},
    query: {},
  });

  return { ...(await parent), ...metadata };
}

export default async function PlasmicLoaderPage({
  params,
}${ifTs(jsOrTs, `: LoaderPageProps`)}) {
  const { pagePath, componentData } = await getPlasmicData(params);

  if (!componentData) {
    notFound();
  }
  const pageMeta = componentData.entryCompMetas[0];
  const prefetchedQueryData = await PLASMIC.getPlasmicQueriesData(
    componentData,
    {
      pagePath,
      params: pageMeta.params,
      query: {},
    }
  );

  return (
    <ClientPlasmicRootProvider
      prefetchedData={componentData}
      prefetchedQueryData={prefetchedQueryData}
      pageParams={pageMeta.params}
      pageRoute={pageMeta.path}
      trackQueryParams
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </ClientPlasmicRootProvider>
  );
}

async function getPlasmicData(
  params${ifTs(jsOrTs, ": Promise<Params>")}
)${ifTs(
    jsOrTs,
    ": Promise<{ pagePath: string; componentData?: ComponentRenderData }>"
  )} {
  const catchall = (await params).catchall;
  const pagePath = catchall ? \`/\${catchall.join("/")}\` : "/";

  const componentData = await PLASMIC.maybeFetchComponentData(pagePath);

  if (!componentData || componentData.entryCompMetas.length === 0) {
    return { pagePath };
  }
  return { pagePath, componentData };
}
`;
}

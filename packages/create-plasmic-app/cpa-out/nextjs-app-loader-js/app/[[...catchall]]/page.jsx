import { PLASMIC } from "@/plasmic-init";
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { notFound } from "next/navigation";

// Use revalidate if you want incremental static regeneration
export const revalidate = 60;

export async function generateStaticParams() {
  const pageModules = await PLASMIC.fetchPages();
  return pageModules.map((mod) => {
    const catchall =
      mod.path === "/" ? undefined : mod.path.substring(1).split("/");
    return {
      catchall,
    };
  });
}

export async function generateMetadata(
  { params },
  parent
) {
  const { componentData } = await getPlasmicData(params);

  if (!componentData) {
    return parent;
  }
  const pageMeta = componentData.entryCompMetas[0];
  const metadata = await PLASMIC.unstable__generateMetadata(componentData, {
    params: pageMeta.params ?? {},
    query: {},
  });

  return { ...(await parent), ...metadata };
}

export default async function PlasmicLoaderPage({
  params,
}) {
  const { pagePath, componentData } = await getPlasmicData(params);

  if (!componentData) {
    notFound();
  }
  const pageMeta = componentData.entryCompMetas[0];
  const prefetchedQueryData = await PLASMIC.unstable__getServerQueriesData(
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
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </ClientPlasmicRootProvider>
  );
}

async function getPlasmicData(
  params
) {
  const catchall = (await params).catchall;
  const pagePath = catchall ? `/${catchall.join("/")}` : "/";

  const componentData = await PLASMIC.maybeFetchComponentData(pagePath);

  if (!componentData || componentData.entryCompMetas.length === 0) {
    return { pagePath };
  }
  return { pagePath, componentData };
}

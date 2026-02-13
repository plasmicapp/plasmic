import { PLASMIC } from "@/plasmic-init";
import { PlasmicClientRootProvider } from "@/plasmic-init-client";
import {
  ComponentRenderData,
  PlasmicComponent,
} from "@plasmicapp/loader-nextjs";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 60;

interface Params {
  /**
   * Array of path segments (e.g. `["a", "b"]` for "/a/b", or `undefined` if path is empty (i.e. "/").
   *
   * We use `undefined` instead of an empty array `[]` because Next.js converts
   * the empty array to `undefined` (not sure why they do that).
   */
  catchall: string[] | undefined;
}

async function getPageData(
  params: Promise<Params>
): Promise<{ pagePath: string; prefetchedData?: ComponentRenderData }> {
  const catchall = (await params).catchall;
  const pagePath = catchall ? `/${catchall.join("/")}` : "/";

  const prefetchedData = await PLASMIC.maybeFetchComponentData(pagePath);

  if (!prefetchedData || prefetchedData.entryCompMetas.length === 0) {
    return { pagePath };
  }
  return { pagePath, prefetchedData };
}

export async function generateStaticParams(): Promise<Params[]> {
  const pageModules = await PLASMIC.fetchPages();
  return pageModules.map((mod) => {
    const catchall =
      mod.path === "/" ? undefined : mod.path.substring(1).split("/");
    return {
      catchall,
    };
  });
}

interface LoaderPageProps {
  params: Promise<Params>;
}

export async function generateMetadata(
  { params }: LoaderPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { prefetchedData } = await getPageData(params);

  if (!prefetchedData) {
    return parent as Promise<Metadata>;
  }
  const pageMeta = prefetchedData.entryCompMetas[0];
  const metadata = await PLASMIC.unstable__generateMetadata(prefetchedData, {
    params: pageMeta.params ?? {},
    query: {},
  });

  return { ...(await parent), ...metadata };
}

export default async function PlasmicLoaderPage({ params }: LoaderPageProps) {
  const { pagePath, prefetchedData } = await getPageData(params);

  if (!prefetchedData) {
    notFound();
  }
  const pageMeta = prefetchedData.entryCompMetas[0];
  const prefetchedQueryData = await PLASMIC.unstable__getServerQueriesData(
    prefetchedData,
    {
      pagePath,
      params: pageMeta.params,
      query: {},
    }
  );

  return (
    <PlasmicClientRootProvider
      prefetchedData={prefetchedData}
      prefetchedQueryData={prefetchedQueryData}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicClientRootProvider>
  );
}

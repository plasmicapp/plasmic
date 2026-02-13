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
  const { componentData } = await getPageData(params);

  if (!componentData) {
    return parent as Promise<Metadata>;
  }
  const pageMeta = componentData.entryCompMetas[0];
  const metadata = await PLASMIC.unstable__generateMetadata(componentData, {
    params: pageMeta.params ?? {},
    query: {},
  });

  return { ...(await parent), ...metadata };
}

export default async function PlasmicLoaderPage({ params }: LoaderPageProps) {
  const { pagePath, componentData } = await getPageData(params);

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
    <PlasmicClientRootProvider
      prefetchedData={componentData}
      prefetchedQueryData={prefetchedQueryData}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicClientRootProvider>
  );
}

async function getPageData(
  params: Promise<Params>
): Promise<{ pagePath: string; componentData?: ComponentRenderData }> {
  const catchall = (await params).catchall;
  const pagePath = catchall ? `/${catchall.join("/")}` : "/";

  const componentData = await PLASMIC.maybeFetchComponentData(pagePath);

  if (!componentData || componentData.entryCompMetas.length === 0) {
    return { pagePath };
  }
  return { pagePath, componentData };
}

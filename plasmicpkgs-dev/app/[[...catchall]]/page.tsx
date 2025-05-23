import { PLASMIC } from "@/plasmic-init";
import { PlasmicClientRootProvider } from "@/plasmic-init-client";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { notFound } from "next/navigation";

export const revalidate = 60;

interface Params {
  /**
   * Array of path segments (e.g. `["a", "b"]` for "/a/b", or `undefined` if path is empty (i.e. "/").
   *
   * Note we use `undefined` instead of an empty array `[]` because
   * Next.js would convert the empty array to `undefined` (not sure why they do that).
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

export default async function PlasmicLoaderPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { prefetchedData, prefetchedQueryData } = await fetchData(
    (
      await params
    ).catchall
  );
  const pageMeta = prefetchedData.entryCompMetas[0];
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

async function fetchData(catchall: string[] | undefined) {
  const pagePath = catchall ? `/${catchall.join("/")}` : "/";
  const prefetchedData = await PLASMIC.maybeFetchComponentData(pagePath);
  if (!prefetchedData) {
    notFound();
  }

  const prefetchedQueryData = await PLASMIC.unstable__getServerQueriesData(
    prefetchedData,
    {
      pagePath,
      params: prefetchedData.entryCompMetas[0].params,
      query: {},
    }
  );

  return { prefetchedData, prefetchedQueryData };
}

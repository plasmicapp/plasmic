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

export default async function PlasmicLoaderPage({
  params,
  searchParams,
}: {
  params?: Params;
  searchParams?: Record<string, string | string[]>;
}) {
  const staticProps = await fetchData(params?.catchall);
  if (!staticProps) {
    notFound();
  }

  const { prefetchedData } = staticProps;
  if (prefetchedData.entryCompMetas.length === 0) {
    notFound();
  }

  const pageMeta = prefetchedData.entryCompMetas[0];
  return (
    <PlasmicClientRootProvider
      prefetchedData={prefetchedData}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
    >
      <PlasmicComponent
        component={pageMeta.displayName}
        componentProps={
          pageMeta.path === "/"
            ? {
                staticHref: "/app/static",
                dynamicHref: "/app/dynamic/foo",
                codeHref: "/app/code",
                children: (
                  <>
                    <span>
                      This page is from the app/ directory (new Next.js 13
                      feature).
                    </span>
                    <span>
                      <a href="/pages">Click here</a> to view pages from the
                      pages/ directory (works for all Next.js versions).
                    </span>
                  </>
                ),
              }
            : undefined
        }
      />
    </PlasmicClientRootProvider>
  );
}

async function fetchData(catchall: string[] | undefined) {
  const plasmicPath = catchall ? `/${catchall.join("/")}` : "/";
  const prefetchedData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!prefetchedData) {
    notFound();
  }

  // Prefetching query data in data-fetching components in app router.
  // TODO: Use server functions/queries instead.
  const prefetchedQueryData = undefined;

  return { prefetchedData, prefetchedQueryData };
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

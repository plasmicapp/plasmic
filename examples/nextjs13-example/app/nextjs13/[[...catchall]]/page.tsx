import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { ClientPlasmicRootProvider } from "components/ClientPlasmicRootProvider";
import { notFound } from "next/navigation";
import { PLASMIC } from "plasmic-init";

export const revalidate = 60;

export default async function PlasmicLoaderPage({
  params,
  searchParams,
}: {
  params?: {
    catchall: string[] | undefined;
  };
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
    <ClientPlasmicRootProvider
      prefetchedData={prefetchedData}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
    >
      <PlasmicComponent
        component={pageMeta.displayName}
        componentProps={
          pageMeta.path === "/"
            ? {
                staticHref: "/nextjs13/static",
                dynamicHref: "/nextjs13/dynamic",
                children: (
                  <>
                    <span>
                      This page is from the app/ directory (new Next.js 13
                      feature).
                    </span>
                    <span>
                      <a href="/">Click here</a> to view pages from the pages/
                      directory (works for all Next.js versions).
                    </span>
                  </>
                ),
              }
            : undefined
        }
      />
    </ClientPlasmicRootProvider>
  );
}

async function fetchData(catchall: string[] | undefined) {
  const plasmicPath = catchall ? `/${catchall.join("/")}` : "/";
  const prefetchedData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!prefetchedData) {
    notFound();
  }

  // Prefetching query data is no longer required, because React Server Components does that for us now!
  const prefetchedQueryData = undefined;

  return { prefetchedData, prefetchedQueryData };
}

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

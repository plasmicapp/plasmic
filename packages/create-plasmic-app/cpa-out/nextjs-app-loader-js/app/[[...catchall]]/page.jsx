import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { notFound } from "next/navigation";
import { PLASMIC } from "@/plasmic-init";
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";

// Use revalidate if you want incremental static regeneration
export const revalidate = 60;

export default async function PlasmicLoaderPage({
  params,
  searchParams,
}) {
  const plasmicComponentData = await fetchPlasmicComponentData(params?.catchall);
  if (!plasmicComponentData) {
    notFound();
  }

  const { prefetchedData } = plasmicComponentData;
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
      />
    </ClientPlasmicRootProvider>
  );
}

async function fetchPlasmicComponentData(catchall) {
  const plasmicPath = "/" + (catchall ? catchall.join("/") : "");
  const prefetchedData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!prefetchedData) {
    notFound();
  }

  return { prefetchedData };
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

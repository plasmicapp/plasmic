import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makeCatchallPage_app_loader(jsOrTs: JsOrTs): string {
  return `import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
import { notFound } from "next/navigation";
import { PLASMIC } from "@/plasmic-init";
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";

// Use revalidate if you want incremental static regeneration
export const revalidate = 60;

export default async function PlasmicLoaderPage({
  params,
  searchParams,
}${ifTs(
    jsOrTs,
    `: {
  params?: { catchall: string[] | undefined };
  searchParams?: Record<string, string | string[]>;
}`
  )}) {
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
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
    >
      <PlasmicComponent
        component={pageMeta.displayName}
      />
    </ClientPlasmicRootProvider>
  );
}

async function fetchPlasmicComponentData(catchall${ifTs(
    jsOrTs,
    ": string[] | undefined"
  )}) {
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
`;
}

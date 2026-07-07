import { ContentServerComponent } from "@/components/ContentServerComponent";
import { ContentUsePlasmicQueryData } from "@/components/ContentUsePlasmicQueryData";
import { PLASMIC } from "@/plasmic-init";
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";

export const revalidate = 10;

export default async function CodePage({
  searchParams,
}: {
  params?: { catchall: string[] | undefined };
  searchParams?: Record<string, string | string[]>;
}) {
  const { prefetchedData } = await fetchData();
  const pageMeta = prefetchedData.entryCompMetas[0];
  return (
    <ClientPlasmicRootProvider
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
      prefetchedData={prefetchedData}
    >
      <PlasmicComponent
        component="Layout"
        componentProps={{
          content: (
            <>
              <div>
                <span>
                  Content with server fetched data from a React Server Component
                </span>
                <ContentServerComponent />
              </div>
              <div>
                <span>
                  Content with client fetched data fetched from
                  usePlasmicQueryData
                </span>
                <ContentUsePlasmicQueryData />
              </div>
            </>
          ),
        }}
      />
    </ClientPlasmicRootProvider>
  );
}

async function fetchData() {
  const prefetchedData = await PLASMIC.fetchComponentData(
    "Layout",
    "Card",
    "Card: SSR",
    "Card: SSG"
  );

  return { prefetchedData };
}

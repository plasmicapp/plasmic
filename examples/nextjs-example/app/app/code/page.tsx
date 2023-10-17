import { ContentServerComponent } from "@/components/ContentServerComponent";
import { ContentUsePlasmicQueryData } from "@/components/ContentUsePlasmicQueryData";
import { PLASMIC } from "@/plasmic-init";
import { PlasmicClientRootProvider } from "@/plasmic-init-client";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";

export const revalidate = 10;

export default async function CodePage() {
  const { prefetchedData } = await fetchData();
  return (
    <PlasmicClientRootProvider prefetchedData={prefetchedData}>
      <PlasmicComponent
        component="Layout"
        componentProps={{
          content: (
            <>
              <div>
                <span>
                  Content with data fetched from React Server Component
                </span>
                <ContentServerComponent />
              </div>
              <div>
                <span>Content with data fetched from usePlasmicQueryData</span>
                <ContentUsePlasmicQueryData />
              </div>
            </>
          ),
        }}
      />
    </PlasmicClientRootProvider>
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

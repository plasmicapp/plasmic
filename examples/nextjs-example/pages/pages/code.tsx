import { ContentUsePlasmicQueryData } from "@/components/ContentUsePlasmicQueryData";
import { PLASMIC } from "@/plasmic-init";
import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { GetStaticProps } from "next";

export default function CodePage({
  prefetchedData,
  prefetchedQueryData,
}: {
  prefetchedData?: ComponentRenderData;
  prefetchedQueryData?: Record<string, unknown>;
}) {
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={prefetchedData}
      prefetchedQueryData={prefetchedQueryData}
    >
      <PlasmicComponent
        component="Layout"
        componentProps={{
          content: <ContentUsePlasmicQueryData />,
        }}
      />
    </PlasmicRootProvider>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prefetchedData = await PLASMIC.fetchComponentData(
    "Layout",
    "Card",
    "Card: SSR",
    "Card: SSG"
  );
  const prefetchedQueryData = await extractPlasmicQueryData(
    <CodePage prefetchedData={prefetchedData} />
  );
  return { props: { prefetchedData, prefetchedQueryData }, revalidate: 10 };
};

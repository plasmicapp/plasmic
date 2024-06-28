import { PLASMIC } from "@/plasmic-init";
import {
  ComponentRenderData,
  PlasmicComponent,
  PlasmicRootProvider,
  extractPlasmicQueryData,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticProps } from "next";
import Error from "next/error";
import { useRouter } from "next/router";
import { useState } from "react";

export default function IndexPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];

  // The locale will be set when the `localeSelect` element is changed.
  // The locale is passed into the CMS global context to update the content.
  const [locale, setLocale] = useState<string>("en");

  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={router.query}
      globalContextsProps={{
        cmsCredentialsProviderProps: {
          locale,
        },
      }}
    >
      <PlasmicComponent
        component={pageMeta.displayName}
        componentProps={{
          localeSelect: {
            onChange: (locale: string) => setLocale(locale),
          },
        }}
      />
    </PlasmicRootProvider>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const plasmicData = await PLASMIC.fetchComponentData("/");
  const pageMeta = plasmicData.entryCompMetas[0];
  // Cache the necessary data fetched for the page
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
  // Use revalidate if you want incremental static regeneration
  return { props: { plasmicData, queryCache }, revalidate: 60 };
};

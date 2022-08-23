import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { API } from "@plasmicpkgs/plasmic-cms";
import type { GetStaticPaths, GetStaticProps } from "next";

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "../plasmic-init";

async function getProductSlugs(): Promise<string[]> {
  const api = new API({
    host: `https://studio.plasmic.app`,
    databaseId: `gCKFKDQ581NNXUi9iwbMyZ`,
    databaseToken: `69xOVFM7WmWwaLLG1jJhmv9TMvHMH4MXfAkJiuz5dk5Y1IyTW1Z1GzYJVtWfDFZ7nY8ql7FnFaf7T8wNv42WQ`,
    locale: ``,
  });
  const products = await api.query("products");
  return products.map((p) => p.data?.slug).filter((slug) => slug);
}

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
      pageParams={pageMeta.params}
      pageQuery={router.query}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // non-Plasmic catch-all
    return { props: {} };
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  // Cache the necessary data fetched for the page
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
  // Use revalidate if you want incremental static regeneration
  return { props: { plasmicData, queryCache }, revalidate: 60 };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const pageModules = await PLASMIC.fetchPages();
  const slugs = await getProductSlugs(); // ["sticker", "nice-shirt", ...]
  return {
    paths: [
      ...pageModules.map((mod) => ({
        params: {
          catchall: mod.path.substring(1).split("/"),
        },
      })),
      ...slugs.map((slug) => ({
        params: { catchall: `/products/${slug}`.substring(1).split("/") },
      })),
    ],
    fallback: "blocking",
  };
};

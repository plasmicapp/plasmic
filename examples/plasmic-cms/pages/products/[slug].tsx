import * as React from "react";
import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { PLASMIC } from "../../plasmic-init";

const cmsConfig = {
  host: `https://studio.plasmic.app`,
  databaseId: `gCKFKDQ581NNXUi9iwbMyZ`,
  databaseToken: `69xOVFM7WmWwaLLG1jJhmv9TMvHMH4MXfAkJiuz5dk5Y1IyTW1Z1GzYJVtWfDFZ7nY8ql7FnFaf7T8wNv42WQ`,
};

// TODO: We could export API from @plasmicpkgs/plasmic-cms to avoid needing
// to re-implement this.
async function apiGet(endpoint: string, params: {} = {}) {
  const url = new URL(
    `${cmsConfig.host}/api/v1/cms/databases/${cmsConfig.databaseId}${endpoint}`
  );
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "*/*",
      "x-plasmic-api-cms-tokens": `${cmsConfig.databaseId}:${cmsConfig.databaseToken}`,
    },
    mode: "cors",
  });

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(`${response.status}: ${message}`);
  }

  return await response.json();
}

interface ProductParams extends ParsedUrlQuery {
  slug: string;
}

interface Product {
  data: {
    slug: string;
    title: string;
    price: string;
  };
}

interface ProductPageProps {
  plasmicData: ComponentRenderData;
  queryCache: Record<string, any>;
  slug: string;
}

export const getStaticPaths: GetStaticPaths<ProductParams> = async () => {
  const products: Product[] = (
    await apiGet(`/tables/products/query`, {
      q: "{}",
    })
  ).rows;

  return {
    paths: products.map((p) => ({
      params: { slug: p.data.slug },
    })),
    fallback: false,
  };
};

const pagePath = "/products/[slug]";

export const getStaticProps: GetStaticProps<
  ProductPageProps,
  ProductParams
> = async (context) => {
  const slug = context.params?.slug;
  if (!slug) {
    throw new Error("Missing slug");
  }

  const plasmicData = await PLASMIC.fetchComponentData(pagePath);
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={plasmicData}>
      <PlasmicComponent
        component={pagePath}
        componentProps={{
          fetcher: { where: { slug } },
        }}
      />
    </PlasmicRootProvider>
  );

  return { props: { plasmicData, queryCache, slug } };
};

const ProductPage: NextPage<ProductPageProps> = ({
  plasmicData,
  queryCache,
  slug,
}) => {
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
    >
      <PlasmicComponent
        component={pagePath}
        componentProps={{
          fetcher: { where: { slug } },
        }}
      />
    </PlasmicRootProvider>
  );
};

export default ProductPage;

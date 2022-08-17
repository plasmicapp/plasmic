import type { CreatePagesArgs } from "gatsby";
import path from "path";

const cmsConfig = {
  host: `https://studio.plasmic.app`,
  databaseId: `gCKFKDQ581NNXUi9iwbMyZ`,
  databaseToken: `69xOVFM7WmWwaLLG1jJhmv9TMvHMH4MXfAkJiuz5dk5Y1IyTW1Z1GzYJVtWfDFZ7nY8ql7FnFaf7T8wNv42WQ`,
};

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

async function getProductSlugs(): Promise<string[]> {
  const products: { data: { slug: string } }[] = (
    await apiGet(`/tables/products/query`, {
      q: "{}",
    })
  ).rows;
  return products.map((p) => p.data.slug);
}

export const createPages: (args: CreatePagesArgs) => Promise<void> = async ({
  actions,
}) => {
  const { createPage } = actions;

  const template = path.resolve(`src/templates/defaultPlasmicPage.tsx`);
  // const template = path.resolve(`src/pages/products/[slug].tsx`);  // (if you're using codegen)
  const slugs = await getProductSlugs(); // ["sticker", "nice-shirt", ...]

  for (const slug of slugs) {
    createPage({
      path: `/products/${slug}`,
      component: template,
      context: {},
    });
  }
};

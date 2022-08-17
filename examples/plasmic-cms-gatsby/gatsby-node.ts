import { API } from "@plasmicpkgs/plasmic-cms";
import type { CreatePagesArgs } from "gatsby";
import path from "path";

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

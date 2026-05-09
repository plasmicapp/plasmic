/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/node-apis/
 *
 * `onCreatePage` runs `extractPlasmicQueryData` at build time so that the
 * SSG'd HTML for each Plasmic page contains its actual rendered content,
 * rather than the `<Suspense fallback>` ("Loading...") of unresolved data
 * queries.
 */
import type { CreatePageArgs } from "gatsby";
import * as React from "react";
import {
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-gatsby";
import type { GatsbyPluginOptions } from "@plasmicapp/loader-gatsby";
import gatsbyConfig from "./gatsby-config";
import { initPlasmicLoaderWithRegistrations } from "./src/plasmic-init";
import type { PlasmicGatsbyPageProps } from "./src/templates/defaultPlasmicPage";

const plasmicLoaderOptions = gatsbyConfig.plugins.find(
  (p) => p && p.resolve === "@plasmicapp/loader-gatsby"
)!.options as GatsbyPluginOptions;
const PLASMIC = initPlasmicLoaderWithRegistrations(plasmicLoaderOptions);

export const onCreatePage = async ({ page, actions }: CreatePageArgs<PlasmicGatsbyPageProps["pageContext"]>) => {
  if (page.component !== plasmicLoaderOptions.defaultPlasmicPage) {
    return;
  }
  if (page.context?.queryCache) {
    return;
  }

  const componentData = await PLASMIC.maybeFetchComponentData(page.path);
  if (!componentData) {
    return;
  }
  const meta = componentData.entryCompMetas[0];

  const queryCache = await extractPlasmicQueryData(
    React.createElement(
      PlasmicRootProvider,
      {
        loader: PLASMIC,
        prefetchedData: componentData,
        pageRoute: meta.path,
        pageParams: meta.params,
        pageQuery: {},
      },
      React.createElement(PlasmicComponent, { component: meta.displayName })
    )
  );

  actions.deletePage(page);
  actions.createPage({
    ...page,
    context: { ...page.context, queryCache },
  });
};

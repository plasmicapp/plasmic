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
const React = require("react");
const {
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} = require("@plasmicapp/loader-gatsby");
const gatsbyConfig = require("./gatsby-config");
const { initPlasmicLoaderWithRegistrations } = require("./src/plasmic-init");

const plasmicLoaderOptions = gatsbyConfig.plugins.find(
  (p) => p && p.resolve === "@plasmicapp/loader-gatsby"
).options;
const PLASMIC = initPlasmicLoaderWithRegistrations(plasmicLoaderOptions);

exports.onCreatePage = async ({ page, actions }) => {
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

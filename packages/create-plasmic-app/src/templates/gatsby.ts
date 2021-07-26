export const GATSBY_DEFAULT_PAGE = `
import React from "react";
import {
  initPlasmicLoader,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-gatsby";
import { graphql } from "gatsby";

export const query = graphql\`
  query ($path: String) {
    plasmicComponents(componentNames: [$path])
    plasmicOptions
  }
\`;

const PlasmicGatsbyPage = ({ data, location }) => {
  const {
    plasmicComponents,
    plasmicOptions,
  } = data;
  return (
    <PlasmicRootProvider
      loader={initPlasmicLoader(plasmicOptions)}
      prefetchedData={plasmicComponents}
    >
      <PlasmicComponent component={location.pathname} />
    </PlasmicRootProvider>
  );
};

export default PlasmicGatsbyPage;
`.trim();

export const GATSBY_404 = `
const NotFound = () => {
  return "Not Found";
};
export default NotFound;
`.trim();

export const GATSBY_PLUGIN_CONFIG = (
  projectId: string,
  projectApiToken: string
): string => `
{
  resolve: "@plasmicapp/loader-gatsby",
  options: {
    projects: [
      {
        id: "${projectId}",
        token: "${projectApiToken}",
      },
    ], // An array of project ids.
    defaultPlasmicPage: require.resolve("./src/templates/defaultPlasmicPage.js"),
  },
},
`;

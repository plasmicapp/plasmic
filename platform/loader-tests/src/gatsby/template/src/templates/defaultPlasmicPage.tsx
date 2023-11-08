import {
  ComponentRenderData,
  InitOptions,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-gatsby";
import { graphql, PageProps } from "gatsby";
import React from "react";
import { initPlasmic } from "../init";

export const query = graphql`
  query ($path: String) {
    plasmicComponents(componentNames: [$path])
    plasmicOptions
  }
`;

const PlasmicGatsbyPage = ({
  location,
  data,
}: PageProps<{
  plasmicComponents: ComponentRenderData;
  plasmicOptions: InitOptions;
}>) => {
  const { plasmicComponents, plasmicOptions } = data;
  return (
    <PlasmicRootProvider
      loader={initPlasmic(plasmicOptions)}
      prefetchedData={plasmicComponents}
    >
      <PlasmicComponent component={location.pathname} />
    </PlasmicRootProvider>
  );
};

export default PlasmicGatsbyPage;

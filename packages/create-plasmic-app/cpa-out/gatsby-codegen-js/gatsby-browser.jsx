import React from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Helmet from "react-helmet";

export const wrapRootElement = ({ element }) => {
  return (
    <PlasmicRootProvider Head={Helmet}>
      {element}
    </PlasmicRootProvider>
  );
}

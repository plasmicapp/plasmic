import React from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import { Link } from "gatsby";
import Helmet from "react-helmet";

export const wrapRootElement = ({ element }) => {
  return (
    <PlasmicRootProvider Head={Helmet} Link={Link}>
      {element}
    </PlasmicRootProvider>
  );
}

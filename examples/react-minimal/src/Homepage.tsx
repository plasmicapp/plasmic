import { PlasmicComponent } from "@plasmicapp/loader-react";
import * as React from "react";

export function Homepage() {
  return (
    <PlasmicComponent
      component="Homepage"
      componentProps={{ title: "Minimal React app" }}
    />
  );
}

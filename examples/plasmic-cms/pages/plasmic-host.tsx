import { PlasmicCanvasHost } from "@plasmicapp/host";
import * as React from "react";
import { PLASMIC } from "../plasmic-init";

export default function PlasmicHost() {
  return PLASMIC && <PlasmicCanvasHost />;
}

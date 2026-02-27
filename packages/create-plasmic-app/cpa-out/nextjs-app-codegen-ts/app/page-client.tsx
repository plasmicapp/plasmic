"use client";

import * as React from "react";
import {
  PlasmicHomepage,
  DefaultHomepageProps
} from "../components/plasmic/create_plasmic_app/PlasmicHomepage"; // plasmic-import: 6uuAAE1jiCew/render

export function ClientHomepage(props: DefaultHomepageProps) {
  return <PlasmicHomepage {...props} />;
}

"use client";

import * as React from "react";
import {
  PlasmicDynamicPage,
  DefaultDynamicPageProps
} from "../../../components/plasmic/create_plasmic_app/PlasmicDynamicPage"; // plasmic-import: AO44A-w7hh/render

export function ClientDynamicPage(props: DefaultDynamicPageProps) {
  return <PlasmicDynamicPage {...props} />;
}

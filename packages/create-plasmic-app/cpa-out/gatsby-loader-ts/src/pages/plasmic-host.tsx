import * as React from "react"
import {
  PlasmicCanvasHost, InitOptions
} from "@plasmicapp/loader-gatsby"
import { graphql } from "gatsby"
import { initPlasmicLoaderWithRegistrations } from "../plasmic-init"

export const query = graphql`
  query {
    plasmicOptions
  }
`

interface HostProps {
  data: {
    plasmicOptions: InitOptions;
  }
}

export default function Host({ data }: HostProps) {
  const { plasmicOptions } = data
  initPlasmicLoaderWithRegistrations(plasmicOptions)
  return <PlasmicCanvasHost />
}

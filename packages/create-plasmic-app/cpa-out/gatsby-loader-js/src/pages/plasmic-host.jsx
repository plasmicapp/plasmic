import * as React from "react"
import {
  PlasmicCanvasHost
} from "@plasmicapp/loader-gatsby"
import { graphql } from "gatsby"
import { initPlasmicLoaderWithRegistrations } from "../plasmic-init"

export const query = graphql`
  query {
    plasmicOptions
  }
`


export default function Host({ data }) {
  const { plasmicOptions } = data
  initPlasmicLoaderWithRegistrations(plasmicOptions)
  return <PlasmicCanvasHost />
}

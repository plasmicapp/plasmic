import { graphql } from "../graphql/gen";

export const imageFragment = graphql(`
  fragment image on Image {
    url
    altText
    width
    height
  }
`);

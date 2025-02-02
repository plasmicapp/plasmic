import { graphql } from "../graphql/gen";

export const collectionFragment = graphql(`
  fragment collection on Collection {
    id
    title
    handle
    image {
      ...image
    }
  }
`);

import { graphql } from "../graphql/gen";

export const getSiteCollectionsQuery = graphql(`
  query getSiteCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          ...collection
          products(first: $first) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }
  }
`);
